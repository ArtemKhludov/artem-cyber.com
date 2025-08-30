from __future__ import annotations

from typing import Any, Mapping

from ghost_engine.scoring.engine import (
    L0_CODE_SOFT_HOLD_MISSING_BUDGET,
    ScoringEngine,
)
from ghost_engine.utils.logger import get_logger
from ghost_engine.scoring.normalizer import (
    normalize_job_signal,
    scoring_signal_nonempty,
)
from ghost_engine.scoring.safety import check_semantic_safety
from ghost_engine.utils.sanitizer import TextSanitizer, extract_proposal_keywords

log = get_logger(__name__)


def _approved_jobs_base(state: Mapping[str, Any]) -> list[dict[str, Any]]:
    raw = state.get("approved_jobs")
    if not isinstance(raw, list):
        return []
    out: list[dict[str, Any]] = []
    for item in raw:
        if isinstance(item, dict):
            out.append(dict(item))
    return out


def _resolve_job_signal(state: Mapping[str, Any]) -> dict[str, Any] | None:
    raw = state.get("raw_json")
    sid = state.get("site_id")
    if isinstance(raw, Mapping) and isinstance(sid, str) and sid.strip():
        sniff = state.get("sniffed_at")
        sniff_s = str(sniff).strip() if sniff else None
        return normalize_job_signal(sid.strip(), raw, sniffed_at=sniff_s)

    js = state.get("job_signal")
    if isinstance(js, dict):
        return dict(js)
    return None


def _merge_required_keywords(state: Mapping[str, Any], new_kw: list[str]) -> list[str]:
    prior = state.get("required_keywords")
    out: list[str] = []
    seen: set[str] = set()
    if isinstance(prior, list):
        for x in prior:
            if isinstance(x, str) and x.strip():
                xl = x.strip().lower()
                if xl not in seen:
                    seen.add(xl)
                    out.append(x.strip())
    for k in new_kw:
        if isinstance(k, str) and k.strip():
            kl = k.strip().lower()
            if kl not in seen:
                seen.add(kl)
                out.append(k.strip())
    return out


def _sanitize_for_storage(sig: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any], bool, list[str]]:
    san = TextSanitizer()
    title = str(sig.get("title") or "")
    desc = str(sig.get("description") or "")
    original_blob = f"{title}\n{desc}"
    honey = extract_proposal_keywords(original_blob)

    t_res = san.sanitize(title)
    d_res = san.sanitize(desc)
    sig_out: dict[str, Any] = dict(sig)
    sig_out["title"] = t_res.sanitized_text
    sig_out["description"] = d_res.sanitized_text

    combined = f"{t_res.sanitized_text}\n{d_res.sanitized_text}"
    regex_risk = max(t_res.risk_score, d_res.risk_score)
    sem = check_semantic_safety(combined)
    needs_manual = regex_risk > 0.5 or (not sem.is_safe) or sem.risk_level == "high"

    opsec: dict[str, Any] = {
        "regex_risk": regex_risk,
        "regex_title_token_hits": t_res.stripped_token_hits,
        "regex_title_suspicious_hits": t_res.suspicious_line_hits,
        "regex_desc_token_hits": d_res.stripped_token_hits,
        "regex_desc_suspicious_hits": d_res.suspicious_line_hits,
        "semantic_is_safe": sem.is_safe,
        "semantic_risk_level": sem.risk_level,
        "semantic_reason": sem.reason,
        "required_keywords": honey,
    }
    return sig_out, opsec, needs_manual, honey


def scoring_node(state: dict[str, Any]) -> dict[str, Any]:
    """
    LangGraph: L0/L1 on normalized job data.

    Before ``approved_jobs``, title/description are scrubbed (Layer 1) and checked via Ollama (Layer 2).
    """
    logs: list[str] = list(state.get("decision_logs", []))
    base_jobs = _approved_jobs_base(state)

    raw = state.get("raw_json")
    sid = state.get("site_id")
    if isinstance(raw, Mapping) and not (isinstance(sid, str) and sid.strip()):
        logs.append("[scoring] skip: raw_json requires non-empty site_id")
        return {"decision_logs": logs, "approved_jobs": base_jobs}

    sig = _resolve_job_signal(state)
    if sig is None:
        logs.append("[scoring] skip: no raw_json+site_id or job_signal in state")
        return {"decision_logs": logs, "approved_jobs": base_jobs}

    if not scoring_signal_nonempty(sig):
        logs.append("[scoring] skip: insufficient_signal after normalize")
        return {"decision_logs": logs, "approved_jobs": base_jobs}

    eng = ScoringEngine()
    ok, l0_code, r0 = eng.evaluate_l0_with_code(sig)
    if not ok:
        logs.append(f"[scoring] {r0}")
        return {
            "decision_logs": logs,
            "approved_jobs": base_jobs,
            "l0_passed": False,
            "l1_score": 0,
        }

    soft_hold_l0 = ok and l0_code == L0_CODE_SOFT_HOLD_MISSING_BUDGET

    score, _parts, gri_extras = eng.evaluate_l1_with_breakdown(sig)
    job_tags = eng.collect_upsell_tags(sig)
    logs.append(f"[scoring] PASS_L0 L1={score} ({r0})")
    if job_tags:
        logs.append(f"[scoring] job_tags={job_tags}")

    site_out = sig.get("source_site") if isinstance(sig.get("source_site"), str) else None
    if not (isinstance(site_out, str) and site_out.strip()):
        site_out = sid if isinstance(sid, str) and sid.strip() else "unknown"

    sig_safe, opsec, needs_manual, honey = _sanitize_for_storage(sig)
    merged_kw = _merge_required_keywords(state, honey)
    prior_manual = bool(state.get("needs_manual_review"))
    flag_manual = prior_manual or needs_manual or soft_hold_l0

    if needs_manual:
        logs.append(
            f"[scoring] opsec: manual_review regex_risk={opsec['regex_risk']:.2f} "
            f"semantic={opsec['semantic_risk_level']} safe={opsec['semantic_is_safe']}"
        )

    entry: dict[str, Any] = {
        "job_id": sig_safe.get("job_id"),
        "site_id": site_out,
        "l1_score": score,
        "job_signal": sig_safe,
        "opsec": opsec,
        "needs_manual_review": needs_manual,
        "job_tags": job_tags,
    }
    if soft_hold_l0:
        entry["l0_soft_hold_missing_budget"] = True
    if gri_extras:
        entry["gri"] = gri_extras["gri"]
        entry["gri_breakdown"] = gri_extras["gri_breakdown"]
        entry["job_tier"] = gri_extras["job_tier"]
        entry["persona_tag"] = gri_extras["persona_tag"]

    out: dict[str, Any] = {
        "decision_logs": logs,
        "approved_jobs": base_jobs + [entry],
        "l0_passed": True,
        "l1_score": score,
        "job_signal": sig_safe,
        "needs_manual_review": flag_manual,
        "required_keywords": merged_kw,
    }
    if gri_extras:
        out["gri"] = gri_extras["gri"]
        out["gri_breakdown"] = gri_extras["gri_breakdown"]
        out["job_tier"] = gri_extras["job_tier"]
        out["persona_tag"] = gri_extras["persona_tag"]
    return out
