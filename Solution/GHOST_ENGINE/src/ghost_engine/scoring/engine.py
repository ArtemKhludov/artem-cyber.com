"""
L0 hard filters and L1 heuristic scoring. Driven by config/scoring.yaml.

Fat-check override: if budget_value >= override_blacklist_min_budget, country blacklist is skipped.
"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping

import yaml

from ghost_engine.scoring.gri_log import log_gri_breakdown_event
from ghost_engine.scoring.roi_calculator import calculate_gri_with_breakdown, effective_budget_and_norm
from ghost_engine.utils.logger import get_logger

log = get_logger(__name__)

# Stable L0 reason codes for trash logs and metrics (not the human detail string).
L0_CODE_PASS = "PASS_L0"
L0_CODE_NO_CONFIG = "NO_L0_CONFIG"
L0_CODE_BLACKLISTED_COUNTRY = "BLACKLISTED_COUNTRY"
L0_CODE_PAYMENT_UNVERIFIED = "PAYMENT_UNVERIFIED"
L0_CODE_LOW_RATING = "LOW_RATING"
L0_CODE_LOW_AVG_HOURLY_PAID = "LOW_AVG_HOURLY_PAID"
L0_CODE_LOW_TOTAL_SPENT = "LOW_TOTAL_SPENT"
L0_CODE_NO_PROVEN_CLIENT_SPEND = "NO_PROVEN_CLIENT_SPEND"
L0_CODE_LOW_HIRE_RATE = "LOW_HIRE_RATE"
L0_CODE_TOXIC_FREELANCER_FEEDBACK = "TOXIC_FREELANCER_FEEDBACK"
L0_CODE_BUDGET_TOO_LOW = "BUDGET_TOO_LOW"
L0_CODE_FORBIDDEN_ILLEGAL_PHRASE = "FORBIDDEN_ILLEGAL_PHRASE"
L0_CODE_PLATFORM_TOS_VIOLATION = "PLATFORM_TOS_VIOLATION"
L0_CODE_CLOSED_JOB = "CLOSED_JOB"
L0_CODE_OLD_AGE = "OLD_AGE"
L0_CODE_MISSING_BUDGET_DROP = "MISSING_BUDGET_DROP"
L0_CODE_SOFT_HOLD_MISSING_BUDGET = "SOFT_HOLD_MISSING_BUDGET"
# Prefix for YAML-driven contextual vetoes (see ``l0_filters.contextual_vetoes``).
L0_CTX_CODE_PREFIX = "CTX_"

# Upsell tag (cover letter / Telegram); same value as product term "security upsell candidate".
# Keep aligned with ``roi_calculator.PERSONA_SECURITY_VALUED_TAG`` (consultant persona routing).
TAG_SECURITY_VALUED = "SECURITY_VALUED"


def _project_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _load_scoring_yaml() -> dict[str, Any]:
    path = _project_root() / "config" / "scoring.yaml"
    if not path.is_file():
        log.warning("scoring.config_missing", path=str(path))
        return {}
    with path.open("r", encoding="utf-8") as f:
        raw = yaml.safe_load(f) or {}
    return raw if isinstance(raw, dict) else {}


def _norm_country(s: str | None) -> str:
    if not s or not isinstance(s, str):
        return ""
    return s.strip().lower()


def _country_blacklisted(country: str | None, blacklist: list[str]) -> bool:
    c = _norm_country(country)
    if not c:
        return False
    for b in blacklist:
        if not isinstance(b, str):
            continue
        bn = b.strip().lower()
        if bn and (bn in c or c in bn):
            return True
    return False


def _job_text_blob_lower(job_signal: Mapping[str, Any]) -> str:
    title = job_signal.get("title") if isinstance(job_signal.get("title"), str) else ""
    desc = job_signal.get("description") if isinstance(job_signal.get("description"), str) else ""
    return f"{title}\n{desc}".lower()


def _l0_match_contextual_veto(blob_lower: str, item: Mapping[str, Any]) -> str | None:
    """
    Return stable L0 code if this veto row fires.

    Row schema (``l0_filters.contextual_vetoes``):
    - ``code``: required short id (e.g. YOUTUBE_SMM_NOT_DEV)
    - ``when_all``: optional list — every non-empty substring must appear in title+description
    - ``when_any``: optional list — at least one substring must appear (ignored if empty)
    - ``unless_any``: optional escape list — if any substring matches, veto does not apply

    Empty ``when_all`` and ``when_any`` rows are ignored (configuration error guard).
    """
    raw_code = item.get("code")
    if not isinstance(raw_code, str) or not raw_code.strip():
        return None
    code_key = raw_code.strip().upper()
    unless_raw = item.get("unless_any")
    if isinstance(unless_raw, list):
        for u in unless_raw:
            if isinstance(u, str) and u.strip() and u.strip().lower() in blob_lower:
                return None

    when_all = item.get("when_all")
    wa_all: list[str] = []
    if isinstance(when_all, list):
        wa_all = [w.strip().lower() for w in when_all if isinstance(w, str) and w.strip()]

    when_any = item.get("when_any")
    wa_any: list[str] = []
    if isinstance(when_any, list):
        wa_any = [w.strip().lower() for w in when_any if isinstance(w, str) and w.strip()]

    if not wa_all and not wa_any:
        return None

    for frag in wa_all:
        if frag not in blob_lower:
            return None
    if wa_any and not any(frag in blob_lower for frag in wa_any):
        return None

    if code_key.startswith(L0_CTX_CODE_PREFIX):
        return code_key
    return f"{L0_CTX_CODE_PREFIX}{code_key}"


def _l0_match_forbidden_phrase(blob_lower: str, phrases: list[str]) -> str | None:
    """Return first configured phrase (original casing for logs) if it matches as substring."""
    for raw in phrases:
        if not isinstance(raw, str):
            continue
        needle = raw.strip().lower()
        if needle and needle in blob_lower:
            return raw.strip()
    return None


def _l0_string_list(l0: Mapping[str, Any], *keys: str) -> list[str]:
    """First present list key wins (non-string entries skipped)."""
    for key in keys:
        raw = l0.get(key)
        if isinstance(raw, list):
            return [x for x in raw if isinstance(x, str)]
    return []


def _l0_applies_upwork_tos(job_signal: Mapping[str, Any], l0: Mapping[str, Any]) -> bool:
    raw_site = job_signal.get("source_site")
    if not isinstance(raw_site, str) or not raw_site.strip():
        return False
    sid = raw_site.strip().lower()
    ids_raw = l0.get("upwork_tos_site_ids")
    if isinstance(ids_raw, list) and any(isinstance(x, str) and x.strip() for x in ids_raw):
        allowed = {str(x).strip().lower() for x in ids_raw if isinstance(x, str) and str(x).strip()}
        return sid in allowed
    return sid == "upwork"


def _country_preferred(country: str | None, preferred: list[str]) -> bool:
    c = _norm_country(country)
    if not c:
        return False
    for p in preferred:
        if not isinstance(p, str):
            continue
        pn = p.strip().lower()
        if pn and (pn in c or c in pn):
            return True
    return False


class ScoringEngine:
    """L0 drop gate, then L1 score 0–100."""

    __slots__ = ("_raw",)

    def __init__(self, config: Mapping[str, Any] | None = None) -> None:
        self._raw: dict[str, Any] = dict(config) if config is not None else _load_scoring_yaml()

    @property
    def scoring_root(self) -> dict[str, Any]:
        """Full scoring YAML root (L0/L1/GRI); used by GRI graph nodes and calculators."""
        return self._raw

    def evaluate_l0(self, job_signal: Mapping[str, Any]) -> bool:
        passed, _c, _d = self.evaluate_l0_with_code(job_signal)
        return passed

    def evaluate_l0_with_reason(self, job_signal: Mapping[str, Any]) -> tuple[bool, str]:
        passed, _code, detail = self.evaluate_l0_with_code(job_signal)
        return passed, detail

    def evaluate_l0_with_code(
        self, job_signal: Mapping[str, Any]
    ) -> tuple[bool, str, str]:
        """
        Return ``(passed, reason_code, detail)``.

        ``reason_code`` is stable for trash logs; ``detail`` is human-readable (legacy structlog).
        """
        l0 = self._raw.get("l0_filters")
        if not isinstance(l0, dict):
            return True, L0_CODE_NO_CONFIG, "no_l0_config"

        jid = job_signal.get("job_id") or "?"
        phrase_list = _l0_string_list(l0, "global_forbidden_phrases", "forbidden_phrases")
        tos_list = _l0_string_list(l0, "upwork_tos_violation_phrases", "platform_tos_phrases")
        apply_upwork_tos = _l0_applies_upwork_tos(job_signal, l0)
        need_blob = bool(phrase_list) or (bool(tos_list) and apply_upwork_tos)
        blob = _job_text_blob_lower(job_signal) if need_blob else ""
        if phrase_list:
            hit = _l0_match_forbidden_phrase(blob, phrase_list)
            if hit is not None:
                return (
                    False,
                    L0_CODE_FORBIDDEN_ILLEGAL_PHRASE,
                    f"DROP: global_forbidden_phrase job_id={jid} match={hit!r}",
                )
        if tos_list and apply_upwork_tos:
            hit_tos = _l0_match_forbidden_phrase(blob, tos_list)
            if hit_tos is not None:
                return (
                    False,
                    L0_CODE_PLATFORM_TOS_VIOLATION,
                    f"DROP: upwork_tos_violation job_id={jid} match={hit_tos!r}",
                )

        vetoes = l0.get("contextual_vetoes")
        if isinstance(vetoes, list) and vetoes:
            blob_ctx = blob if blob else _job_text_blob_lower(job_signal)
            for row in vetoes:
                if not isinstance(row, dict):
                    continue
                ctx_code = _l0_match_contextual_veto(blob_ctx, row)
                if ctx_code is not None:
                    return (
                        False,
                        ctx_code,
                        f"DROP: contextual_veto code={ctx_code} job_id={jid}",
                    )

        stats = job_signal.get("client_stats")
        if not isinstance(stats, dict):
            stats = {}

        drop_closed = l0.get("drop_closed_openings")
        if drop_closed is not False:
            ost = job_signal.get("opening_status")
            if isinstance(ost, str) and ost.strip().upper() == "CLOSED":
                return False, L0_CODE_CLOSED_JOB, f"DROP: closed_opening job_id={jid}"

        # --- NEW: Hard drop old jobs ---
        max_age_h = l0.get("max_job_age_hours")
        if isinstance(max_age_h, (int, float)) and max_age_h > 0:
            posted_at = job_signal.get("posted_at")
            if isinstance(posted_at, str) and posted_at.strip():
                try:
                    # Robust ISO parsing: replace Z with +00:00 for fromisoformat compatibility
                    dt = datetime.fromisoformat(posted_at.replace("Z", "+00:00"))
                    now = datetime.now(timezone.utc)
                    age_h = (now - dt).total_seconds() / 3600.0
                    if age_h > max_age_h:
                        return False, L0_CODE_OLD_AGE, f"DROP: old_age={age_h:.1f}h (limit={max_age_h}h) job_id={jid}"
                except Exception as exc:
                    log.debug("scoring.age_parse_failed", error=str(exc))

        budget_val = job_signal.get("budget_value")
        try:
            budget_f = float(budget_val) if budget_val is not None else None
        except (TypeError, ValueError):
            budget_f = None
        bt = str(job_signal.get("budget_type") or "unknown").strip().lower()

        gri_cfg = self._raw.get("gri")
        imputed_raw: float | None = None
        if isinstance(gri_cfg, dict):
            try:
                _, imputed_raw, _ = effective_budget_and_norm(job_signal, gri_cfg)
            except (TypeError, ValueError):
                imputed_raw = None

        override_floor = l0.get("override_blacklist_min_budget")
        try:
            override_f = float(override_floor) if override_floor is not None else None
        except (TypeError, ValueError):
            override_f = None

        use_imputed_bl = l0.get("override_blacklist_use_imputed_budget") is True

        bl = l0.get("blacklisted_countries")
        blacklist = [x for x in bl if isinstance(x, str)] if isinstance(bl, list) else []
        country = stats.get("country")

        if override_f is not None and budget_f is not None and budget_f >= override_f:
            pass_country = True
        elif (
            use_imputed_bl
            and override_f is not None
            and imputed_raw is not None
            and imputed_raw >= override_f
        ):
            pass_country = True
        elif country is None or (isinstance(country, str) and not country.strip()):
            pass_country = True
        else:
            pass_country = not _country_blacklisted(country, blacklist)

        if not pass_country:
            return False, L0_CODE_BLACKLISTED_COUNTRY, f"DROP: blacklisted_country job_id={jid}"

        if l0.get("require_payment_verified") is True:
            verified = stats.get("is_payment_verified")
            if verified is False:
                return False, L0_CODE_PAYMENT_UNVERIFIED, f"DROP: payment_not_verified job_id={jid}"

        min_rating = l0.get("min_client_rating")
        try:
            min_r = float(min_rating) if min_rating is not None else None
        except (TypeError, ValueError):
            min_r = None
        if min_r is not None:
            avg = stats.get("avg_rating")
            try:
                avg_f = float(avg) if avg is not None else None
            except (TypeError, ValueError):
                avg_f = None
            if avg_f is not None and avg_f < min_r:
                return False, L0_CODE_LOW_RATING, f"DROP: low_rating job_id={jid}"

        min_hr_paid = l0.get("min_avg_hourly_rate_paid")
        try:
            min_hr_f = float(min_hr_paid) if min_hr_paid is not None else None
        except (TypeError, ValueError):
            min_hr_f = None
        if min_hr_f is not None:
            ahp = stats.get("avg_hourly_rate_paid")
            try:
                ahp_f = float(ahp) if ahp is not None else None
            except (TypeError, ValueError):
                ahp_f = None
            if ahp_f is not None and ahp_f > 0 and ahp_f < min_hr_f:
                return (
                    False,
                    L0_CODE_LOW_AVG_HOURLY_PAID,
                    f"DROP: low_avg_hourly_rate_paid job_id={jid}",
                )

        req_proven = l0.get("require_proven_client_spend")
        if req_proven is True:
            ts0 = stats.get("total_spent")
            try:
                ts_proven = float(ts0) if ts0 is not None else None
            except (TypeError, ValueError):
                ts_proven = None
            if ts_proven is None or ts_proven <= 0.0:
                return (
                    False,
                    L0_CODE_NO_PROVEN_CLIENT_SPEND,
                    f"DROP: no_proven_client_spend job_id={jid}",
                )

        min_spent = l0.get("min_client_total_spent")
        try:
            min_spent_f = float(min_spent) if min_spent is not None else None
        except (TypeError, ValueError):
            min_spent_f = None
        if min_spent_f is not None:
            ts = stats.get("total_spent")
            try:
                ts_f = float(ts) if ts is not None else None
            except (TypeError, ValueError):
                ts_f = None
            if ts_f is not None and ts_f < min_spent_f:
                exempt_v = l0.get("min_client_total_spent_exempt_if_payment_verified") is True
                exempt_min_raw = l0.get("min_client_total_spent_exempt_min_imputed_usd")
                try:
                    exempt_min_imp = (
                        float(exempt_min_raw) if exempt_min_raw is not None else None
                    )
                except (TypeError, ValueError):
                    exempt_min_imp = None
                pay_ok = stats.get("is_payment_verified") is True
                if not (
                    exempt_v
                    and exempt_min_imp is not None
                    and pay_ok
                    and imputed_raw is not None
                    and imputed_raw >= exempt_min_imp
                ):
                    return (
                        False,
                        L0_CODE_LOW_TOTAL_SPENT,
                        f"DROP: low_client_total_spent job_id={jid}",
                    )

        min_hire = l0.get("min_client_hire_rate")
        try:
            min_hire_f = float(min_hire) if min_hire is not None else None
        except (TypeError, ValueError):
            min_hire_f = None
        if min_hire_f is not None:
            hr = stats.get("hire_rate")
            try:
                hr_f = float(hr) if hr is not None else None
            except (TypeError, ValueError):
                hr_f = None
            if hr_f is not None and hr_f < min_hire_f:
                return (
                    False,
                    L0_CODE_LOW_HIRE_RATE,
                    f"DROP: low_client_hire_rate job_id={jid}",
                )

        min_ff = l0.get("min_freelancer_client_rating")
        try:
            min_ff_f = float(min_ff) if min_ff is not None else None
        except (TypeError, ValueError):
            min_ff_f = None
        if min_ff_f is not None:
            fcount = stats.get("feedback_count")
            fci: int | None
            try:
                fci = int(fcount) if fcount is not None else None
            except (TypeError, ValueError):
                fci = None
            if fci is not None and fci >= 1:
                cfs = stats.get("client_feedback_score")
                try:
                    cfs_f = float(cfs) if cfs is not None else None
                except (TypeError, ValueError):
                    cfs_f = None
                if cfs_f is not None and cfs_f < min_ff_f:
                    return (
                        False,
                        L0_CODE_TOXIC_FREELANCER_FEEDBACK,
                        f"DROP: toxic_freelancer_feedback job_id={jid}",
                    )

        def _l0_float_floor(key: str) -> float | None:
            raw = l0.get(key)
            if raw is None:
                return None
            try:
                return float(raw)
            except (TypeError, ValueError):
                return None

        mh = _l0_float_floor("min_budget_hourly")
        mf = _l0_float_floor("min_budget_fixed")
        ml = _l0_float_floor("min_budget")
        min_budget: float | None = None
        if bt == "hourly":
            min_budget = mh if mh is not None else ml
        elif bt == "fixed":
            min_budget = mf if mf is not None else ml
        else:
            min_budget = ml
            if min_budget is None and mh is not None:
                min_budget = mh
        if min_budget is not None and budget_f is not None and budget_f < min_budget:
            return False, L0_CODE_BUDGET_TOO_LOW, f"DROP: below_min_budget job_id={jid}"

        policy = str(l0.get("missing_budget_policy") or "pass").strip().lower()
        budget_missing = budget_f is None
        if budget_missing:
            if policy == "drop":
                return (
                    False,
                    L0_CODE_MISSING_BUDGET_DROP,
                    f"DROP: missing_budget_policy=drop job_id={jid}",
                )
            if policy == "soft_hold":
                return (
                    True,
                    L0_CODE_SOFT_HOLD_MISSING_BUDGET,
                    f"PASS_L0_SOFT_HOLD: missing_budget job_id={jid}",
                )

        return True, L0_CODE_PASS, f"PASS_L0 job_id={jid}"

    def evaluate_l1(self, job_signal: Mapping[str, Any]) -> int:
        score, _, _ = self.evaluate_l1_with_breakdown(job_signal)
        return score

    def evaluate_l1_with_breakdown(
        self, job_signal: Mapping[str, Any]
    ) -> tuple[int, list[str], dict[str, Any]]:
        """
        Return (l1_score 0–100, log parts, gri_extras).

        When ``gri.enabled`` in config, score blends GRI (0–100) with legacy L1;
        ``gri_extras`` contains ``gri``, ``gri_breakdown``, ``job_tier``, ``persona_tag``.
        Otherwise ``gri_extras`` is empty.
        """
        gri_cfg = self._raw.get("gri")
        legacy_score, legacy_parts = self._evaluate_l1_legacy_only(job_signal)

        if isinstance(gri_cfg, dict) and gri_cfg.get("enabled"):
            site = job_signal.get("source_site")
            upsell_tags = self.collect_upsell_tags(job_signal)
            gri, br, tier, persona = calculate_gri_with_breakdown(
                job_signal,
                self._raw,
                site_id=str(site) if site is not None else None,
                job_tags=upsell_tags,
            )
            score_gri = int(round(100.0 * gri))
            w = float(gri_cfg.get("blend_legacy_weight") or 0.0)
            w = max(0.0, min(1.0, w))
            final = int(round((1.0 - w) * float(score_gri) + w * float(legacy_score)))
            final = max(0, min(100, final))
            parts_gri: list[str] = [
                f"gri:{gri:.4f}",
                f"job_tier:{tier}",
                f"persona:{persona}",
            ]
            for key in sorted(br.keys()):
                v = br[key]
                if isinstance(v, (int, float, str, bool)) or v is None:
                    if key not in ("gri_breakdown",):
                        parts_gri.append(f"gri.{key}={v}")
            extras: dict[str, Any] = {
                "gri": gri,
                "gri_breakdown": br,
                "job_tier": tier,
                "persona_tag": persona,
            }
            try:
                log_gri_breakdown_event(
                    job_id=job_signal.get("job_id"),
                    site_id=site,
                    gri=float(gri),
                    job_tier=tier,
                    persona_tag=persona,
                    breakdown=br,
                )
            except (TypeError, ValueError) as e:
                log.warning("scoring.gri_log_failed", error=str(e))
            return final, parts_gri + [f"legacy_blend:w={w}"] + legacy_parts, extras

        return legacy_score, legacy_parts, {}

    def _evaluate_l1_legacy_only(
        self, job_signal: Mapping[str, Any]
    ) -> tuple[int, list[str]]:
        l1 = self._raw.get("l1_weights")
        if not isinstance(l1, dict):
            return 0, ["no_l1_config"]

        parts: list[str] = []
        score = 0

        title = job_signal.get("title") if isinstance(job_signal.get("title"), str) else ""
        desc = (
            job_signal.get("description") if isinstance(job_signal.get("description"), str) else ""
        )
        blob = f"{title}\n{desc}".lower()

        kw_bonus = int(l1.get("keyword_match_bonus") or 0)
        terms = l1.get("keyword_terms")
        if isinstance(terms, list):
            for t in terms:
                if isinstance(t, str) and t.strip() and t.strip().lower() in blob:
                    score += kw_bonus
                    parts.append(f"keyword:{t.strip().lower()}")
                    break

        stats = job_signal.get("client_stats")
        if isinstance(stats, dict):
            spent = stats.get("total_spent")
            try:
                spent_f = float(spent) if spent is not None else None
            except (TypeError, ValueError):
                spent_f = None
            thr = l1.get("vip_client_spent_threshold")
            try:
                thr_f = float(thr) if thr is not None else None
            except (TypeError, ValueError):
                thr_f = None
            vip_bonus = int(l1.get("vip_client_bonus") or 0)
            if thr_f is not None and spent_f is not None and spent_f >= thr_f:
                score += vip_bonus
                parts.append("vip_client")

        budget_val = job_signal.get("budget_value")
        try:
            b = float(budget_val) if budget_val is not None else None
        except (TypeError, ValueError):
            b = None
        med = l1.get("budget_median_reference")
        try:
            med_f = float(med) if med is not None else None
        except (TypeError, ValueError):
            med_f = None
        bb = int(l1.get("budget_above_median_bonus") or 0)
        if med_f is not None and b is not None and b >= med_f:
            score += bb
            parts.append("budget_above_ref")

        if isinstance(stats, dict):
            pref = l1.get("preferred_countries")
            plist = [x for x in pref if isinstance(x, str)] if isinstance(pref, list) else []
            pcb = int(l1.get("preferred_country_bonus") or 0)
            if plist and _country_preferred(stats.get("country"), plist):
                score += pcb
                parts.append("preferred_country")

        hw = l1.get("heavy_stop_words")
        hlist = [x for x in hw if isinstance(x, str)] if isinstance(hw, list) else []
        hp = int(l1.get("heavy_stop_word_penalty") or 0)
        for w in hlist:
            wn = w.strip().lower()
            if wn and wn in blob:
                score -= hp
                parts.append(f"heavy_stop:{wn}")
                break

        sw = l1.get("stop_words")
        stops = [x for x in sw if isinstance(x, str)] if isinstance(sw, list) else []
        penalty = int(l1.get("stop_word_penalty") or 0)
        for w in stops:
            wn = w.strip().lower()
            if wn and wn in blob:
                score -= penalty
                parts.append(f"stop_word:{wn}")
                break

        score = max(0, min(100, score))
        return score, parts

    def collect_upsell_tags(self, job_signal: Mapping[str, Any]) -> list[str]:
        """
        Scan title+description against ``upsell_triggers.clusters`` and ``upsell_triggers.terms``.
        Return list of matching cluster names (keys) and/or TAG_SECURITY_VALUED.
        """
        raw = self._raw.get("upsell_triggers")
        if not isinstance(raw, dict):
            return []

        # Client spend gate (optional)
        ms = raw.get("min_client_total_spent")
        min_spent_f: float | None = None
        if ms is not None:
            try:
                v = float(ms)
                min_spent_f = v if v > 0 else None
            except (TypeError, ValueError):
                pass

        if min_spent_f is not None and min_spent_f > 0:
            stats = job_signal.get("client_stats")
            if not isinstance(stats, dict):
                return []
            spent = stats.get("total_spent")
            try:
                sf = float(spent) if spent is not None else None
            except (TypeError, ValueError):
                sf = None
            if sf is None or sf < min_spent_f:
                return []

        blob = _job_text_blob_lower(job_signal)
        tags: list[str] = []

        # 1. New dynamic clusters (SOAR, DevSecOps, etc.)
        clusters = raw.get("clusters")
        if isinstance(clusters, dict):
            for cluster_name, terms in clusters.items():
                if isinstance(terms, list):
                    if any(str(t).strip().lower() in blob for t in terms if isinstance(t, (str, int))):
                        tags.append(str(cluster_name).strip().upper())

        # 2. Legacy generic security tag
        legacy_terms = raw.get("terms")
        if isinstance(legacy_terms, list):
            if any(str(t).strip().lower() in blob for t in legacy_terms if isinstance(t, (str, int))):
                tags.append(TAG_SECURITY_VALUED)

        # Dedupe while preserving order
        seen: set[str] = set()
        out: list[str] = []
        for t in tags:
            if t not in seen:
                out.append(t)
                seen.add(t)
        return out
