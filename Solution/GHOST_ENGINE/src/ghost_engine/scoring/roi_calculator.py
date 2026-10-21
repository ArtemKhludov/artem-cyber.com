"""
Ghost ROI Index (GRI): site-agnostic ranking 0–1 from canonical job_signal.

Formula (see config/scoring.yaml gri.*): multiplicative numerator/denominator with
explicit breakdown for logs and Telegram.
"""

from __future__ import annotations

import math
import re
from datetime import UTC, datetime
from typing import Any, Mapping

# Keep in sync with ``engine.TAG_SECURITY_VALUED`` (persona routing; avoid circular imports).
PERSONA_SECURITY_VALUED_TAG = "SECURITY_VALUED"

JOB_TIER_TRASH = "TRASH"
JOB_TIER_MANUAL_REVIEW = "MANUAL_REVIEW"
JOB_TIER_ZERO_TOUCH = "ZERO_TOUCH"

PERSONA_SNIPER = "sniper"
PERSONA_CONSULTANT = "consultant"
PERSONA_SPECIALIST = "specialist"


def merge_gri_config(scoring_root: Mapping[str, Any], site_id: str | None) -> dict[str, Any]:
    """Merge gri.* with gri.sites.<site_id> overrides."""
    raw = scoring_root.get("gri")
    base: dict[str, Any] = dict(raw) if isinstance(raw, dict) else {}
    sites = base.get("sites")
    if not isinstance(sites, dict):
        return base
    sid = (site_id or "").strip().lower()
    ov = sites.get(sid)
    if not isinstance(ov, dict):
        return base
    merged = {**base, **ov}
    merged["sites"] = sites
    return merged


def _clip(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))


def _coerce_float(v: Any) -> float | None:
    if v is None or isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return float(v)
    if isinstance(v, str):
        try:
            return float(v.strip())
        except ValueError:
            return None
    return None


def _coerce_int(v: Any) -> int | None:
    if v is None or isinstance(v, bool):
        return None
    if isinstance(v, int):
        return v
    if isinstance(v, float):
        return int(v) if v == int(v) else None
    if isinstance(v, str):
        try:
            return int(v.strip())
        except ValueError:
            return None
    return None


def _proposals_tier_midpoint(tier: Any) -> float | None:
    """Parse UI bucket strings like ``5-10`` or ``20-50`` into midpoint applicant count."""
    if not isinstance(tier, str) or not tier.strip():
        return None
    t = tier.strip().replace(" ", "")
    m = re.match(r"^(\d+)\s*-\s*(\d+)$", t)
    if not m:
        return None
    return (float(m.group(1)) + float(m.group(2))) / 2.0


def _parse_iso_utc(s: str) -> datetime | None:
    t = s.strip()
    if not t:
        return None
    t = t.replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(t)
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC)


def effective_budget_and_norm(
    job_signal: Mapping[str, Any], cfg: Mapping[str, Any]
) -> tuple[float, float, dict[str, Any]]:
    """
    Return (B_norm 0..1, raw_dollar_estimate, breakdown fragment).
    """
    micro = float(cfg.get("micro_budget_max") or 5.0)
    ref = float(cfg.get("budget_ref_for_norm") or 5000.0)
    est_h = float(cfg.get("estimated_hours_default") or 10.0)
    med = float(cfg.get("median_fallback_budget") or 500.0)
    spent_fac = float(cfg.get("impute_from_total_spent_factor") or 0.02)

    bv = _coerce_float(job_signal.get("budget_value"))
    stats = job_signal.get("client_stats")
    st: dict[str, Any] = stats if isinstance(stats, dict) else {}
    ah = _coerce_float(st.get("avg_hourly_rate_paid"))
    spent = _coerce_float(st.get("total_spent"))
    hourly_max = _coerce_float(job_signal.get("hourly_budget_max"))

    raw: float
    source: str
    if bv is not None and bv > micro:
        raw = max(bv, 0.0)
        source = "budget_value"
    elif hourly_max is not None and hourly_max > 0:
        raw = max(hourly_max * est_h, 0.0)
        source = "hourly_budget_max_x_hours"
    elif ah is not None and ah > 0:
        raw = max(ah * est_h, 0.0)
        source = "avg_hourly_paid_x_hours"
    elif spent is not None and spent > 0:
        raw = max(spent * spent_fac, 0.0)
        source = "total_spent_x_factor"
    else:
        raw = med
        source = "median_fallback"

    b_norm = _clip(math.log1p(raw) / math.log1p(ref), 0.05, 1.0)
    frag = {"B_raw_estimate": raw, "B_source": source, "B_norm": b_norm}
    return b_norm, raw, frag


def client_trust_factor(job_signal: Mapping[str, Any], cfg: Mapping[str, Any]) -> tuple[float, dict[str, Any]]:
    stats = job_signal.get("client_stats")
    st: dict[str, Any] = stats if isinstance(stats, dict) else {}
    rating = _coerce_float(st.get("avg_rating"))
    hr = _coerce_float(st.get("hire_rate"))
    inv = _coerce_int(job_signal.get("invitations_sent"))
    apps = _coerce_int(job_signal.get("total_applicants"))

    r_base = (rating / 5.0) if rating is not None else 0.55
    r_base = _clip(r_base, 0.05, 1.0)

    bonus_thr = float(cfg.get("hire_rate_bonus_threshold") or 0.6)
    bonus_mul = float(cfg.get("hire_rate_bonus_multiplier") or 1.15)
    pen_thr = float(cfg.get("hire_rate_penalty_threshold") or 0.2)
    pen_mul = float(cfg.get("hire_rate_penalty_multiplier") or 0.55)
    pay_boost = float(cfg.get("payment_verified_trust_boost") or 1.08)

    t = r_base
    hr_note = "missing"
    if hr is not None:
        hf = _clip(hr, 0.0, 1.0)
        hr_note = f"{hf:.2f}"
        if hf >= bonus_thr:
            t *= bonus_mul
        elif hf <= pen_thr:
            t *= pen_mul
    else:
        # Invitations without public applicants: slight uncertainty discount
        if inv is not None and inv > 5 and (apps is None or apps == 0):
            t *= 0.92
            hr_note = "inferred_busy_no_hire_rate"
        else:
            t *= 0.94
            hr_note = "no_hire_rate"

    if st.get("is_payment_verified") is True:
        t *= pay_boost

    if job_signal.get("opening_premium") is True:
        t *= float(cfg.get("premium_trust_boost") or 1.03)

    lba = job_signal.get("last_buyer_activity")
    if isinstance(lba, str) and lba.strip():
        ldt = _parse_iso_utc(lba.strip())
        if ldt is not None:
            rec_h = float(cfg.get("buyer_activity_recency_hours") or 168.0)
            hours_ago = max(0.0, (datetime.now(UTC) - ldt).total_seconds() / 3600.0)
            if hours_ago <= rec_h:
                t *= float(cfg.get("buyer_activity_trust_boost") or 1.04)

    t = _clip(t, 0.05, 1.0)
    frag = {"T_client": t, "T_rating_used": rating, "T_hire_rate": hr, "T_hr_note": hr_note}
    return t, frag


def freshness_factor(job_signal: Mapping[str, Any], cfg: Mapping[str, Any]) -> tuple[float, dict[str, Any]]:
    posted = job_signal.get("posted_at")
    sniff = job_signal.get("sniffed_at")
    ts = posted if isinstance(posted, str) and posted.strip() else None
    note = "posted_at"
    if ts is None and isinstance(sniff, str) and sniff.strip():
        ts = sniff.strip()
        note = "sniffed_at_proxy"
    if ts is None:
        return 1.0, {"V_freshness": 1.0, "V_freshness_note": "no_posted_at"}
    dt = _parse_iso_utc(ts)
    if dt is None:
        return 1.0, {"V_freshness": 1.0, "V_freshness_note": "parse_failed"}
    now = datetime.now(UTC)
    hours = max(0.0, (now - dt).total_seconds() / 3600.0)
    half = float(cfg.get("freshness_half_life_hours") or 48.0)
    floor = float(cfg.get("freshness_floor") or 0.35)
    if note == "sniffed_at_proxy":
        floor = max(floor, float(cfg.get("sniff_freshness_floor") or 0.48))
    ceil = float(cfg.get("freshness_ceiling") or 1.0)
    decay = math.exp(-hours / max(half, 1e-6))
    v = floor + (ceil - floor) * decay
    v = _clip(v, 0.05, 1.0)
    return v, {
        "V_freshness": v,
        "V_age_hours": round(hours, 2),
        "V_freshness_note": note,
    }


def competition_factor(job_signal: Mapping[str, Any], cfg: Mapping[str, Any]) -> tuple[float, dict[str, Any]]:
    mode = str(cfg.get("competition_mode") or cfg.get("competition_mode_default") or "applicants_or_invites")
    if mode.strip().lower() == "none":
        return 1.0, {"K_competition": 1.0, "K_note": "mode_none"}

    if job_signal.get("competition_unknown") is True:
        return 1.0, {"K_competition": 1.0, "K_note": "competition_unknown"}

    apps = _coerce_int(job_signal.get("total_applicants"))
    invs = _coerce_int(job_signal.get("invitations_sent"))
    ref_a = float(cfg.get("competition_applicants_ref") or 25.0)
    ref_i = float(cfg.get("competition_invitations_ref") or 25.0)
    high = float(cfg.get("applicants_high_penalty") or 20)

    k = 1.0
    tier_mid: float | None = None
    if apps is not None and apps > 0:
        k += 0.85 * _clip(apps / max(ref_a, 1.0), 0.0, 3.0)
        if apps >= high:
            k *= 1.35
    elif invs is not None and invs > 0:
        k += 0.55 * _clip(invs / max(ref_i, 1.0), 0.0, 2.5)
    else:
        tier_mid = _proposals_tier_midpoint(job_signal.get("proposals_tier"))
        if tier_mid is not None and tier_mid > 0:
            extra = float(cfg.get("proposals_tier_extra_k_factor") or 0.35)
            k += extra * _clip(tier_mid / max(ref_a, 1.0), 0.0, 3.0)
            if tier_mid >= float(high):
                k *= 1.2

    suc = _coerce_int(job_signal.get("sourcing_update_count"))
    if suc is not None and suc > 0 and (apps is None or apps == 0):
        sref = float(cfg.get("sourcing_update_competition_ref") or 10.0)
        sw = float(cfg.get("sourcing_update_competition_weight") or 0.18)
        k += sw * _clip(float(suc) / max(sref, 1.0), 0.0, 2.0)

    k = _clip(k, 1.0, 8.0)
    return k, {
        "K_competition": k,
        "K_applicants": apps,
        "K_invitations_sent": invs,
        "K_proposals_tier_mid": tier_mid,
        "K_sourcing_updates": suc,
    }


def complexity_factor(job_signal: Mapping[str, Any], cfg: Mapping[str, Any]) -> tuple[float, dict[str, Any]]:
    desc = job_signal.get("description")
    text = desc if isinstance(desc, str) else ""
    ref_len = float(cfg.get("description_len_ref") or 4000.0)
    tech_ref = float(cfg.get("tech_marker_density_ref") or 0.08)
    terms = cfg.get("tech_markers")
    markers = [str(x).lower() for x in terms if isinstance(x, str) and x.strip()] if isinstance(terms, list) else []

    blob = text.lower()
    words = max(1, len(text.split()))
    rel_len = len(text) / max(ref_len, 1.0)
    hits = sum(1 for m in markers if m in blob)
    density = hits / float(words)
    rel_tech = density / max(tech_ref, 1e-9)

    c = 1.0 + 0.45 * _clip(rel_len, 0.0, 2.5) + 0.35 * _clip(rel_tech, 0.0, 4.0)

    weeks = _coerce_int(job_signal.get("engagement_weeks"))
    w_ref = float(cfg.get("complexity_engagement_weeks_ref") or 26.0)
    w_w = float(cfg.get("complexity_engagement_weight") or 0.12)
    if weeks is not None and weeks > 0:
        c += w_w * _clip(weeks / max(w_ref, 1.0), 0.0, 2.5)

    ct = job_signal.get("contractor_tier")
    if isinstance(ct, str) and ct.strip().upper() == "EXPERT":
        c += float(cfg.get("complexity_expert_tier_bump") or 0.08)

    wl = job_signal.get("workload")
    if isinstance(wl, str) and "30" in wl and any(
        x in wl.lower() for x in ("more", ">", "plus", "over")
    ):
        c += float(cfg.get("complexity_workload_more_than_30h_bump") or 0.06)

    omw = float(cfg.get("ontology_mandatory_weight") or 0.04)
    mandatory_n = 0
    skills = job_signal.get("ontology_skills")
    if isinstance(skills, list):
        for item in skills:
            if not isinstance(item, Mapping):
                continue
            rel = str(item.get("relevance") or "").strip().upper()
            if rel == "MANDATORY":
                mandatory_n += 1
    if mandatory_n > 0:
        c += omw * float(min(mandatory_n, 8))

    qmw = _coerce_float(job_signal.get("qualification_min_hours_week"))
    if qmw is not None and qmw >= 10.0:
        qh_ref = float(cfg.get("complexity_qual_hours_week_ref") or 30.0)
        qh_w = float(cfg.get("complexity_qual_hours_weight") or 0.07)
        c += qh_w * _clip((qmw - 10.0) / max(qh_ref, 1.0), 0.0, 2.5)

    c = _clip(c, 1.0, 6.0)
    return c, {
        "C_complexity": c,
        "C_desc_len": len(text),
        "C_tech_hits": hits,
        "C_ontology_mandatory_count": mandatory_n,
    }


def scope_mismatch_multiplier(job_signal: Mapping[str, Any], cfg: Mapping[str, Any]) -> tuple[float, dict[str, Any]]:
    desc = job_signal.get("description")
    title = job_signal.get("title")
    blob = f"{title or ''}\n{desc or ''}".lower()
    terms = cfg.get("team_scope_terms")
    tlist = [str(x).lower() for x in terms if isinstance(x, str) and x.strip()] if isinstance(terms, list) else []
    hits = sum(1 for t in tlist if t in blob)
    base_m = float(cfg.get("scope_hit_base_multiplier") or 1.35)
    pos_m = float(cfg.get("scope_positions_multiplier") or 1.25)

    m = 1.0
    if hits > 0:
        m *= base_m ** min(hits, 4)
    npos = _coerce_int(job_signal.get("number_of_positions_to_hire"))
    if npos is not None and npos > 1:
        m *= pos_m
    if job_signal.get("segmentation_employment_ongoing") is True:
        m *= 1.12
    m = _clip(m, 1.0, 6.0)
    return m, {
        "M_scope": m,
        "M_scope_term_hits": hits,
        "M_positions": npos,
    }


def gri_compute_market_factors(job_signal: Mapping[str, Any], cfg: Mapping[str, Any]) -> dict[str, Any]:
    v, fv = freshness_factor(job_signal, cfg)
    k, fk = competition_factor(job_signal, cfg)
    out = {"V_market": v, "K_competition": k, **fv, **fk}
    return out


def gri_compute_client_factors(job_signal: Mapping[str, Any], cfg: Mapping[str, Any]) -> dict[str, Any]:
    b_norm, raw_b, fb = effective_budget_and_norm(job_signal, cfg)
    t, ft = client_trust_factor(job_signal, cfg)
    return {"B_norm": b_norm, "B_raw": raw_b, "T_client": t, **fb, **ft}


def gri_compute_effort_factors(job_signal: Mapping[str, Any], cfg: Mapping[str, Any]) -> dict[str, Any]:
    c, fc = complexity_factor(job_signal, cfg)
    m, fm = scope_mismatch_multiplier(job_signal, cfg)
    return {"C_complexity": c, **fc, **fm}


def gri_assemble(components: Mapping[str, Any], cfg: Mapping[str, Any]) -> tuple[float, dict[str, Any]]:
    b = float(components.get("B_norm") or 0.1)
    t = float(components.get("T_client") or 0.1)
    v = float(components.get("V_market") or 1.0)
    c = float(components.get("C_complexity") or 1.0)
    k = float(components.get("K_competition") or 1.0)
    m = float(components.get("M_scope") or 1.0)

    num = b * t * v
    den = max(c * k * m, 1e-9)
    raw = num / den
    gri = _clip(raw, 0.0, 1.0)
    breakdown = dict(components)
    breakdown["GRI_raw"] = raw
    breakdown["GRI"] = gri
    return gri, breakdown


def assign_job_tier(gri: float, cfg: Mapping[str, Any]) -> str:
    hi = float(cfg.get("tier_high") or 0.8)
    mid = float(cfg.get("tier_mid") or 0.5)
    if gri >= hi:
        return JOB_TIER_ZERO_TOUCH
    if gri >= mid:
        return JOB_TIER_MANUAL_REVIEW
    return JOB_TIER_TRASH


def assign_persona(
    gri: float,
    job_signal: Mapping[str, Any],
    components: Mapping[str, Any],
    cfg: Mapping[str, Any],
    *,
    job_tags: list[str] | None = None,
) -> str:
    """Plan §5: Sniper / Consultant / Specialist after GRI (generation policy, not the score)."""
    tags = [t for t in (job_tags or []) if isinstance(t, str)]
    title = job_signal.get("title")
    desc = job_signal.get("description")
    blob = f"{title or ''}\n{desc or ''}".lower()
    desc_len = len(desc) if isinstance(desc, str) else 0

    apps = _coerce_int(job_signal.get("total_applicants")) or 0
    sniper_gri = float(cfg.get("persona_sniper_gri") or 0.85)
    sniper_apps = int(cfg.get("persona_sniper_max_applicants") or 8)
    sniper_max_desc = int(cfg.get("persona_sniper_max_desc_chars") or 10_000)
    if gri >= sniper_gri and apps <= sniper_apps and desc_len <= sniper_max_desc:
        return PERSONA_SNIPER

    tech = cfg.get("tech_markers")
    markers = [str(x).lower() for x in tech if isinstance(x, str) and x.strip()] if isinstance(tech, list) else []
    skills = job_signal.get("ontology_skills")
    overlap = 0
    if isinstance(skills, list):
        for item in skills:
            if not isinstance(item, Mapping):
                continue
            pl = item.get("prefLabel")
            if not isinstance(pl, str):
                continue
            plow = pl.lower()
            overlap += sum(1 for m in markers if m in plow)
    min_ov = int(cfg.get("persona_specialist_stack_overlap_min") or 2)
    if overlap >= min_ov:
        return PERSONA_SPECIALIST

    niche = cfg.get("persona_specialist_niche_terms")
    nlist = [str(x).lower() for x in niche if isinstance(x, str) and x.strip()] if isinstance(niche, list) else []
    if nlist and any(nt in blob for nt in nlist):
        return PERSONA_SPECIALIST

    use_sec = cfg.get("persona_consultant_on_security_valued_tag")
    if use_sec is not False and PERSONA_SECURITY_VALUED_TAG in tags:
        return PERSONA_CONSULTANT

    risk = cfg.get("persona_consultant_risk_terms")
    rlist = [str(x).lower() for x in risk if isinstance(x, str) and x.strip()] if isinstance(risk, list) else []
    if rlist and any(rt in blob for rt in rlist):
        return PERSONA_CONSULTANT

    cpx = float(components.get("C_complexity") or 1.0)
    c_consult = float(cfg.get("persona_consultant_complexity_min") or 2.45)
    if cpx >= c_consult:
        return PERSONA_CONSULTANT

    b_norm = float(components.get("B_norm") or 0.0)
    min_bn = float(cfg.get("persona_consultant_min_budget_norm") or 0.45)
    if b_norm >= min_bn:
        return PERSONA_CONSULTANT
    return PERSONA_SPECIALIST


def merge_gri_component_maps(job_signal: Mapping[str, Any], cfg: Mapping[str, Any]) -> dict[str, Any]:
    """Single merge order for market + client + effort factors."""
    mkt = gri_compute_market_factors(job_signal, cfg)
    cli = gri_compute_client_factors(job_signal, cfg)
    eff = gri_compute_effort_factors(job_signal, cfg)
    return {**cli, **mkt, **eff}


def finalize_gri_scoring_pipeline(
    components: Mapping[str, Any],
    job_signal: Mapping[str, Any],
    cfg: Mapping[str, Any],
    site_id: Any,
    job_tags: list[str] | None = None,
) -> tuple[float, dict[str, Any], str, str]:
    """
    Assemble GRI, then plan §3 scope cap / §7 binary gates, tier and persona.

    Used by ``calculate_gri_with_breakdown`` and the analytical subgraph ROI node.
    """
    gri_assembled, breakdown = gri_assemble(components, cfg)
    g = float(breakdown.get("GRI", gri_assembled))
    gri_before_rules = g

    hits = int(breakdown.get("M_scope_term_hits") or 0)
    min_hits = int(cfg.get("scope_force_manual_review_min_hits") or 999)
    cap = float(cfg.get("scope_gri_cap") or 0.72)
    scope_strong = hits >= min_hits
    if scope_strong:
        g = min(g, cap)
    g = _clip(g, 0.0, 1.0)

    tier = assign_job_tier(g, cfg)
    if scope_strong and tier == JOB_TIER_ZERO_TOUCH:
        tier = JOB_TIER_MANUAL_REVIEW

    gates = cfg.get("gri_gates")
    if isinstance(gates, dict):
        hclb = gates.get("high_complexity_low_budget")
        if isinstance(hclb, dict) and hclb.get("enabled"):
            c = float(components.get("C_complexity") or 1.0)
            b = float(components.get("B_norm") or 0.0)
            cmin = float(hclb.get("c_complexity_min") or 99.0)
            bmax = float(hclb.get("b_norm_max") or 0.0)
            if c >= cmin and b <= bmax:
                ft = str(hclb.get("force_job_tier") or JOB_TIER_MANUAL_REVIEW)
                if tier == JOB_TIER_ZERO_TOUCH and ft == JOB_TIER_MANUAL_REVIEW:
                    tier = JOB_TIER_MANUAL_REVIEW
                breakdown["gate_high_complexity_low_budget"] = True

    persona = assign_persona(g, job_signal, components, cfg, job_tags=job_tags)

    breakdown["GRI"] = g
    breakdown["GRI_before_post_rules"] = gri_before_rules
    breakdown["job_tier"] = tier
    breakdown["persona_tag"] = persona
    breakdown["source_site"] = site_id
    if scope_strong:
        breakdown["scope_strong_team_signal"] = True
    return g, breakdown, tier, persona


def calculate_gri_with_breakdown(
    job_signal: Mapping[str, Any],
    scoring_root: Mapping[str, Any],
    *,
    site_id: str | None = None,
    job_tags: list[str] | None = None,
) -> tuple[float, dict[str, Any], str, str]:
    """
    Returns (gri 0..1, flat breakdown dict, job_tier, persona_tag).

    ``job_tags``: upsell tags from ``ScoringEngine.collect_upsell_tags`` (e.g. SECURITY_VALUED → consultant).
    """
    sid = site_id if site_id is not None else job_signal.get("source_site")
    cfg = merge_gri_config(scoring_root, str(sid) if sid is not None else None)
    components = merge_gri_component_maps(job_signal, cfg)
    return finalize_gri_scoring_pipeline(components, job_signal, cfg, sid, job_tags=job_tags)


def calculate_gri(job_signal: Mapping[str, Any], scoring_root: Mapping[str, Any]) -> float:
    gri, _, _, _ = calculate_gri_with_breakdown(job_signal, scoring_root)
    return gri
