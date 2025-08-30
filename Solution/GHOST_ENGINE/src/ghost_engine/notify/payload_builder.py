"""Build notify payloads from browser adapter path (no duplicate L0/L1)."""

from __future__ import annotations

from typing import Any, Mapping

from ghost_engine.agents.nodes.scoring_node import _sanitize_for_storage
from ghost_engine.notify.contract import ApprovedJobNotifyPayload
from ghost_engine.notify.job_urls import infer_job_public_url
from ghost_engine.scoring.engine import L0_CODE_SOFT_HOLD_MISSING_BUDGET, ScoringEngine
from ghost_engine.utils.sanitizer import TextSanitizer

_MAX_DESC_CHARS = 4000
_HIGH_GRI_TENSION = 0.85


def build_notify_payload_from_adapter_signal(
    sig: Mapping[str, Any],
    site_id: str,
    l1_score: int,
    *,
    job_tags: list[str] | None = None,
) -> ApprovedJobNotifyPayload:
    """
    Sanitize title/description for Telegram-safe preview; flag manual review on regex risk only.
    """
    san = TextSanitizer(max_chars=_MAX_DESC_CHARS)
    title_raw = str(sig.get("title") or "")
    desc_raw = str(sig.get("description") or "")
    t_res = san.sanitize(title_raw)
    d_res = san.sanitize(desc_raw)
    desc_trim = d_res.sanitized_text[:_MAX_DESC_CHARS]
    js: dict[str, Any] = dict(sig)
    js["title"] = t_res.sanitized_text
    js["description"] = desc_trim
    regex_risk = max(t_res.risk_score, d_res.risk_score)
    jid = sig.get("job_id")
    job_id_out: str | None
    if jid is None:
        job_id_out = None
    else:
        job_id_out = str(jid)
    sid = site_id.strip() if site_id.strip() else "unknown"
    opsec: dict[str, Any] = {
        "source": "adapter_sniff",
        "regex_risk": regex_risk,
        "semantic_is_safe": None,
        "semantic_risk_level": "unknown",
    }
    tags = list(job_tags) if job_tags else []
    pub = infer_job_public_url(sid, job_id_out, js)
    return ApprovedJobNotifyPayload(
        job_id=job_id_out,
        site_id=sid,
        l1_score=max(0, min(100, int(l1_score))),
        job_signal=js,
        opsec=opsec,
        needs_manual_review=regex_risk > 0.5,
        notify_source="adapter_sniff",
        job_tags=tags,
        cover_letter=None,
        gri=None,
        persona_tag=None,
        job_tier=None,
        job_public_url=pub,
        apply_strategy="auto",
        estimated_price_usd=None,
        estimated_time_hours=None,
        estimate_confidence=None,
    )


def build_notify_payload_from_scoring_graph_state(
    graph_state: Mapping[str, Any],
    site_id: str,
) -> ApprovedJobNotifyPayload | None:
    """
    After ``ainvoke_scoring_graph``: sanitized job_signal, OPSEC layers, GRI/persona/tier for Telegram.

    Safety vs money: high GRI + failed semantic check → ``opsec['high_gri_opsec_tension']`` and
    ``needs_manual_review`` so operators see "strong lead, verify intent" without silent auto-apply.
    """
    sig_raw = graph_state.get("job_signal")
    if not isinstance(sig_raw, dict):
        return None

    gri_raw = graph_state.get("gri")
    gri_f: float | None = None
    if isinstance(gri_raw, (int, float)):
        gri_f = max(0.0, min(1.0, float(gri_raw)))

    persona_raw = graph_state.get("persona_tag")
    persona_s = str(persona_raw).strip() if isinstance(persona_raw, str) and persona_raw.strip() else None

    tier_raw = graph_state.get("job_tier")
    tier_s = str(tier_raw).strip() if isinstance(tier_raw, str) and tier_raw.strip() else None

    sig_safe, opsec, needs_manual, _honey = _sanitize_for_storage(sig_raw)
    opsec["source"] = "adapter_sniff"
    if gri_f is not None:
        opsec["gri_at_notify"] = gri_f

    eng = ScoringEngine()
    job_tags = eng.collect_upsell_tags(sig_safe)

    l1_from_gri = int(round(gri_f * 100.0)) if gri_f is not None else 0
    l1_from_gri = max(0, min(100, l1_from_gri))

    l0_code = graph_state.get("l0_code")
    soft_hold = l0_code == L0_CODE_SOFT_HOLD_MISSING_BUDGET
    flag_manual = needs_manual or soft_hold

    if (
        gri_f is not None
        and gri_f >= _HIGH_GRI_TENSION
        and opsec.get("semantic_is_safe") is False
    ):
        opsec["high_gri_opsec_tension"] = True
        flag_manual = True

    jid = sig_safe.get("job_id")
    job_id_out: str | None = str(jid) if jid is not None and jid != "" else None
    sid = site_id.strip() if site_id.strip() else "unknown"
    pub = infer_job_public_url(sid, job_id_out, sig_safe)

    ep = graph_state.get("estimated_price_usd")
    price_v: float | None = None
    if isinstance(ep, (int, float)) and ep > 0:
        price_v = float(ep)
    eth = graph_state.get("estimated_time_hours")
    hours_v: float | None = None
    if isinstance(eth, (int, float)) and eth > 0:
        hours_v = float(eth)
    ec_raw = graph_state.get("estimate_confidence")
    ec_v: float | None = None
    if isinstance(ec_raw, (int, float)):
        ec_v = max(0.0, min(1.0, float(ec_raw)))

    return ApprovedJobNotifyPayload(
        job_id=job_id_out,
        site_id=sid,
        l1_score=l1_from_gri,
        job_signal=sig_safe,
        opsec=opsec,
        needs_manual_review=flag_manual,
        notify_source="adapter_sniff",
        job_tags=job_tags,
        cover_letter=None,
        gri=gri_f,
        persona_tag=persona_s,
        job_tier=tier_s,
        job_public_url=pub,
        apply_strategy="auto",
        estimated_price_usd=price_v,
        estimated_time_hours=hours_v,
        estimate_confidence=ec_v,
    )
