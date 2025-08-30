"""
Post-GRI quality matrix (client / job activity / description): configurable 0–3 axes,
penalties, hard blocks. All violated rules are returned for per-reason sortie counters.

L0 still runs first; this layer adds product-style gates without replacing GRI.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, Mapping


@dataclass(frozen=True)
class JobQualityMatrixResult:
    enabled: bool
    passed: bool
    client_pts: int
    activity_pts: int
    description_pts: int
    penalty_hits: int
    effective_total: int
    blocking_reasons: tuple[str, ...] = ()
    detail: str = ""


def _cfg(root: Mapping[str, Any]) -> dict[str, Any]:
    raw = root.get("job_quality_matrix")
    return dict(raw) if isinstance(raw, dict) else {}


def _truthy(v: Any) -> bool:
    if isinstance(v, bool):
        return v
    if isinstance(v, str):
        return v.strip().lower() in ("1", "true", "yes", "on")
    return False


def _f(x: Any, default: float = 0.0) -> float:
    try:
        return float(x)
    except (TypeError, ValueError):
        return default


def _i(x: Any) -> int | None:
    try:
        return int(x) if x is not None else None
    except (TypeError, ValueError):
        return None


def _parse_iso_dt(s: str | None) -> datetime | None:
    if not s or not isinstance(s, str):
        return None
    t = s.strip().replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(t)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=UTC)
        return dt.astimezone(UTC)
    except ValueError:
        return None


# GRI imputation sources safe as USD proxy for matrix gates (exclude median_fallback).
_MATRIX_TRUSTED_B_SOURCES = frozenset({
    "hourly_budget_max_x_hours",
    "avg_hourly_paid_x_hours",
    "total_spent_x_factor",
    "budget_value",
    "llm_budget_infer",
})


def _budget_effective_usd(
    final: Mapping[str, Any],
    sig: Mapping[str, Any],
) -> tuple[float | None, str]:
    """
    Prefer job_signal.budget_value; else B_raw from gri_breakdown when B_source is trusted.
    """
    bv = sig.get("budget_value")
    if bv is not None:
        try:
            v = float(bv)
            if v > 0:
                return v, "budget_value"
        except (TypeError, ValueError):
            pass
    bd = final.get("gri_breakdown")
    if not isinstance(bd, dict):
        return None, "none"
    src_raw = bd.get("B_source")
    src = str(src_raw).strip() if src_raw is not None else ""
    br = bd.get("B_raw")
    if src in _MATRIX_TRUSTED_B_SOURCES and isinstance(br, (int, float)) and float(br) > 0:
        return float(br), src
    return None, "none"


def _blob(final: Mapping[str, Any]) -> str:
    sig = final.get("job_signal")
    title = ""
    desc = ""
    if isinstance(sig, dict):
        t = sig.get("title")
        d = sig.get("description")
        title = t.strip().lower() if isinstance(t, str) else ""
        desc = d.strip().lower() if isinstance(d, str) else ""
    return f"{title}\n{desc}"


def evaluate_job_quality_matrix(
    final: Mapping[str, Any],
    *,
    site_id: str,
    scoring_root: Mapping[str, Any],
) -> JobQualityMatrixResult:
    root = _cfg(scoring_root)
    if not _truthy(root.get("enabled")):
        return JobQualityMatrixResult(
            enabled=False,
            passed=True,
            client_pts=0,
            activity_pts=0,
            description_pts=0,
            penalty_hits=0,
            effective_total=0,
        )

    sid = (site_id or "").strip().lower()
    allowed = root.get("site_ids")
    if isinstance(allowed, list) and allowed:
        norm = {str(x).strip().lower() for x in allowed if isinstance(x, str)}
        if sid not in norm:
            return JobQualityMatrixResult(
                enabled=False,
                passed=True,
                client_pts=0,
                activity_pts=0,
                description_pts=0,
                penalty_hits=0,
                effective_total=0,
            )

    sig = final.get("job_signal")
    if not isinstance(sig, dict):
        return JobQualityMatrixResult(
            enabled=True,
            passed=False,
            client_pts=0,
            activity_pts=0,
            description_pts=0,
            penalty_hits=0,
            effective_total=0,
            blocking_reasons=("MATRIX_NO_JOB_SIGNAL",),
            detail="missing job_signal",
        )

    stats = sig.get("client_stats")
    st: dict[str, Any] = stats if isinstance(stats, dict) else {}

    total_spent = st.get("total_spent")
    spent_f = _f(total_spent, default=-1.0) if total_spent is not None else None
    verified = st.get("is_payment_verified")
    is_verified = verified is True
    hire_rate = st.get("hire_rate")
    hr_f = _f(hire_rate) if hire_rate is not None else None

    total_jobs_hires = _i(st.get("total_jobs_with_hires"))
    open_jobs = _i(st.get("buyer_open_jobs_count"))

    applicants = _i(final.get("total_applicants"))
    if applicants is None:
        applicants = _i(sig.get("total_applicants"))
    inv_iv = _i(final.get("invited_to_interview"))
    if inv_iv is None:
        inv_iv = _i(sig.get("invited_to_interview"))

    posted_at = final.get("posted_at") or sig.get("posted_at")
    posted_s = posted_at.strip() if isinstance(posted_at, str) else None
    lba = final.get("last_buyer_activity") or sig.get("last_buyer_activity")
    lba_s = lba.strip() if isinstance(lba, str) else None

    budget_effective, _budget_src = _budget_effective_usd(final, sig)

    client_cfg = root.get("client") if isinstance(root.get("client"), dict) else {}
    act_cfg = root.get("activity") if isinstance(root.get("activity"), dict) else {}
    desc_cfg = root.get("description") if isinstance(root.get("description"), dict) else {}

    spend_strong = _f(client_cfg.get("spend_strong_usd"), 1000.0)
    min_hires_spend = _i(client_cfg.get("min_hires_for_spend_bonus")) or 1
    hr_good = _f(client_cfg.get("hire_rate_good"), 0.5)
    new_max_jobs = _i(client_cfg.get("new_client_max_open_jobs")) or 3

    reasons: list[str] = []

    # --- Hard block: zero trust client ---
    if _truthy(root.get("hard_block_untrusted_client")):
        bad_spend = spent_f is None or spent_f <= 0.0
        bad_hire = hr_f is None or hr_f <= 0.0
        bad_pay = not is_verified
        exempt_min = _f(root.get("zero_trust_exempt_min_budget_usd"), 1000.0)
        trust_by_budget = (
            exempt_min > 0.0
            and budget_effective is not None
            and budget_effective >= exempt_min
        )
        if bad_spend and bad_hire and bad_pay and not trust_by_budget:
            reasons.append("MATRIX_HARD_ZERO_TRUST")

    # --- Client axis (0–3) ---
    c_pts = 0
    if spent_f is not None and spent_f >= spend_strong:
        th = total_jobs_hires or 0
        if th >= min_hires_spend:
            c_pts += 1
    if hr_f is not None and hr_f >= hr_good:
        c_pts += 1
    elif open_jobs is not None and open_jobs <= new_max_jobs and (total_jobs_hires or 0) >= 1:
        c_pts += 1
    if is_verified:
        c_pts += 1
    c_pts = min(3, c_pts)

    # --- Activity axis (0–3) + penalties ---
    prop_good = _i(act_cfg.get("proposals_good_max")) or 10
    prop_stall = _i(act_cfg.get("proposals_stall_min")) or 50
    fresh_h = _f(act_cfg.get("freshness_max_hours"), 48.0)
    stale_job_h = _f(act_cfg.get("stale_job_min_hours"), 168.0)
    stale_buyer_h = _f(act_cfg.get("stale_buyer_gap_hours"), 168.0)

    a_pts = 0
    if applicants is None or applicants <= prop_good:
        a_pts += 1
    hired_proxy = 0.0
    if hr_f is not None and applicants is not None and applicants > 0:
        hired_proxy = hr_f * float(applicants)
    if (inv_iv is not None and inv_iv > 0) or hired_proxy >= 1.0:
        a_pts += 1
    now = datetime.now(UTC)
    posted_dt = _parse_iso_dt(posted_s)
    if posted_dt is not None:
        age_h = (now - posted_dt).total_seconds() / 3600.0
        if age_h <= fresh_h:
            a_pts += 1
    a_pts = min(3, a_pts)

    penalty_tags: list[str] = []
    if applicants is not None and applicants >= prop_stall:
        if inv_iv is not None and inv_iv <= 0 and hired_proxy < 1.0:
            penalty_tags.append("MATRIX_PENALTY_PROPOSALS_STALL")

    if posted_dt is not None and posted_s and lba_s:
        lba_dt = _parse_iso_dt(lba_s)
        if lba_dt is not None:
            job_age_h = (now - posted_dt).total_seconds() / 3600.0
            buyer_age_h = (now - lba_dt).total_seconds() / 3600.0
            if job_age_h >= stale_job_h and buyer_age_h >= stale_buyer_h:
                penalty_tags.append("MATRIX_PENALTY_STALE_JOB_BUYER")

    max_pen = _i(root.get("max_penalty_points"))
    if max_pen is None:
        max_pen = 2
    penalty = min(len(penalty_tags), max(0, max_pen))

    # --- Description axis (0–3) ---
    desc = sig.get("description")
    desc_s = desc if isinstance(desc, str) else ""
    min_chars = _i(desc_cfg.get("min_desc_chars_for_deliverable_hint")) or 220
    markers = desc_cfg.get("deliverable_markers")
    mark_list = [str(x).lower() for x in markers if isinstance(x, str)] if isinstance(markers, list) else [
        "deliverable",
        "milestone",
        "phase",
    ]
    d_pts = 0
    dl = desc_s.lower()
    if len(desc_s) >= min_chars and any(m in dl for m in mark_list):
        d_pts += 1
    if any(c in dl for c in ("\n-", "\n*", "1.", "2.", "step")):
        d_pts += 1

    senior_kw = desc_cfg.get("senior_keywords")
    sk = [str(x).lower() for x in senior_kw if isinstance(x, str)] if isinstance(senior_kw, list) else [
        "senior",
        "staff",
        "principal",
    ]
    blob = _blob(final)
    senior_hit = any(k in blob for k in sk)
    senior_min = _f(desc_cfg.get("senior_min_budget_usd"), 500.0)
    if senior_hit and budget_effective is not None and budget_effective < senior_min:
        reasons.append("MATRIX_DESC_SENIOR_BUDGET_MISMATCH")
    else:
        if budget_effective is not None or not senior_hit:
            d_pts += 1

    cx_kw = desc_cfg.get("complexity_keywords")
    cx = [str(x).lower() for x in cx_kw if isinstance(x, str)] if isinstance(cx_kw, list) else [
        "automation",
        "ai agent",
        "security",
        "multi-step",
        "workflow",
    ]
    cx_min = _f(desc_cfg.get("complexity_min_budget_usd"), 100.0)
    if any(k in blob for k in cx):
        # Align with L0 missing_budget_policy=pass: unknown budget must not imply "too low".
        if budget_effective is not None and budget_effective < cx_min:
            reasons.append("MATRIX_DESC_COMPLEXITY_BUDGET_LOW")

    extra = desc_cfg.get("extra_offplatform_phrases")
    if isinstance(extra, list):
        for ph in extra:
            if isinstance(ph, str) and ph.strip() and ph.strip().lower() in blob:
                reasons.append("MATRIX_DESC_OFFPLATFORM_EXTRA")
                break

    d_pts = min(3, d_pts)

    min_c = _i(root.get("min_client_pts"))
    if min_c is None:
        min_c = 1
    min_a = _i(root.get("min_activity_pts"))
    if min_a is None:
        min_a = 0
    min_d = _i(root.get("min_description_pts"))
    if min_d is None:
        min_d = 1
    min_eff = _i(root.get("min_effective_total"))
    if min_eff is None:
        min_eff = 5

    effective = c_pts + a_pts + d_pts - penalty
    eff_fail = effective < min_eff
    if c_pts < min_c:
        reasons.append("MATRIX_CLIENT_BELOW_MIN")
    if a_pts < min_a:
        reasons.append("MATRIX_ACTIVITY_BELOW_MIN")
    if d_pts < min_d:
        reasons.append("MATRIX_DESCRIPTION_BELOW_MIN")
    if eff_fail:
        reasons.append("MATRIX_EFFECTIVE_TOTAL_BELOW_MIN")
        for tag in penalty_tags[:penalty]:
            if tag not in reasons:
                reasons.append(tag)

    # Dedupe preserving order
    seen: set[str] = set()
    uniq: list[str] = []
    for r in reasons:
        if r not in seen:
            seen.add(r)
            uniq.append(r)

    failed = bool(uniq) or c_pts < min_c or a_pts < min_a or d_pts < min_d or effective < min_eff
    passed = not failed

    if failed and not uniq:
        uniq.append("MATRIX_THRESHOLD_FAIL")

    detail = (
        f"c={c_pts} a={a_pts} d={d_pts} pen={penalty} eff={effective} "
        f"thr(c>={min_c},a>={min_a},d>={min_d},sum>={min_eff}) "
        f"reasons={','.join(uniq)}"
    )

    return JobQualityMatrixResult(
        enabled=True,
        passed=passed,
        client_pts=c_pts,
        activity_pts=a_pts,
        description_pts=d_pts,
        penalty_hits=penalty,
        effective_total=effective,
        blocking_reasons=tuple(uniq) if not passed else (),
        detail=detail[:500],
    )
