"""Shared cover-letter render context (used by cover_letter_node and LangGraph pipeline)."""

from __future__ import annotations

from typing import Any

from ghost_engine.negotiation.prompt_render import load_persona_voice, render_cover_letter_v1
from ghost_engine.negotiation.texture_beats import select_texture_beat
from ghost_engine.scoring.devsec_upsell import devsec_upsell_paragraph
from ghost_engine.scoring.engine import TAG_SECURITY_VALUED


def build_cover_letter_render_updates(state: dict[str, Any]) -> dict[str, Any]:
    """
    Build ``cover_letter_prompt_rendered`` (+ optional security addon) from ``approved_jobs[-1]``.

    Returns ``{}`` if there is no usable last job.
    """
    jobs = state.get("approved_jobs")
    if not isinstance(jobs, list) or not jobs:
        return {}
    last = jobs[-1]
    if not isinstance(last, dict):
        return {}
    title = str(last.get("title") or "")
    desc = str(last.get("description") or "")
    tags = last.get("job_tags")
    tags_list = [x for x in tags if isinstance(x, str)] if isinstance(tags, list) else []
    has_security = TAG_SECURITY_VALUED in tags_list
    security_block = devsec_upsell_paragraph() if has_security else ""
    persona_raw = last.get("persona_tag")
    if not (isinstance(persona_raw, str) and persona_raw.strip()):
        st_pt = state.get("persona_tag")
        persona_raw = st_pt if isinstance(st_pt, str) and st_pt.strip() else None
    persona_key = (
        str(persona_raw).strip().lower()
        if isinstance(persona_raw, str) and persona_raw.strip()
        else "consultant"
    )
    voice = load_persona_voice(persona_key)
    job_id = str(last.get("job_id") or "")
    site_raw = state.get("site_id")
    site_id = str(site_raw).strip().lower() if isinstance(site_raw, str) and site_raw.strip() else ""
    texture_beat = select_texture_beat(job_id, site_id, title=title, description=desc)
    rendered = render_cover_letter_v1(
        job_title=title,
        job_description=desc,
        security_block=security_block,
        texture_beat=texture_beat,
    )
    if voice:
        rendered = f"{voice}\n\n---\n\n{rendered}"
    out: dict[str, Any] = {
        "cover_letter_prompt_rendered": rendered,
        "cover_letter_pipeline_tags": tags_list,
        "cover_letter_pipeline_desc_len": len(desc),
        "cover_letter_persona_tag": persona_key,
    }
    if has_security:
        out["cover_letter_security_addon"] = security_block
    return out


def should_skip_llm_for_cover(state: dict[str, Any]) -> bool:
    """No Gemini call: nested asyncio loop or missing key."""
    from ghost_engine.config.settings import get_settings

    if get_settings().gemini_api_key is None:
        return True
    try:
        __import__("asyncio").get_running_loop()
    except RuntimeError:
        return False
    return True
