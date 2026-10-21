"""
Anchor layer: immutable job_id + canonical HTTPS URL for operator navigation.

Primary path stays human-like (feed / Saved jobs). When DOM search fails or controls
are missing, resolve a direct listing URL: command payload → PostgreSQL registry
→ platform URL template (Upwork ``/jobs/~...``).
"""

from __future__ import annotations

from ghost_engine.adapters.base_adapter import _sanitize_upwork_job_public_url_for_goto
from ghost_engine.db.job_scoring_repository import fetch_latest_job_public_url_from_registry
from ghost_engine.notify.job_urls import infer_job_public_url
from ghost_engine.utils.logger import get_logger

log = get_logger(__name__)


async def resolve_anchor_job_public_url(
    *,
    site_id: str,
    job_id: str,
    fallback_from_cmd: str | None,
) -> str | None:
    """
    Return a sanitized https URL to open the job detail page, or None.

    Order: Telegram/cmd URL → latest ``job_scoring_events.summary`` → infer template.
    """
    pub = _sanitize_upwork_job_public_url_for_goto(fallback_from_cmd)
    if pub:
        return pub

    sid_raw = (site_id or "").strip()
    sid = sid_raw.lower()
    jid = (job_id or "").strip()
    if not jid:
        return None

    db_url = await fetch_latest_job_public_url_from_registry(site_id=sid_raw, job_id=jid)
    pub = _sanitize_upwork_job_public_url_for_goto(db_url)
    if pub:
        log.info(
            "job_anchor.resolved_from_registry",
            site_id=sid,
            job_id=jid,
            url_preview=pub[:96],
        )
        return pub

    if sid == "upwork":
        tpl = infer_job_public_url(sid, jid, {})
        pub = _sanitize_upwork_job_public_url_for_goto(tpl)
        if pub:
            log.info(
                "job_anchor.resolved_from_template",
                site_id=sid,
                job_id=jid,
                url_preview=pub[:96],
            )
        return pub

    return None
