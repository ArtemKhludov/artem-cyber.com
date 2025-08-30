"""Dispatch Redis operator commands to browser adapter (dev_session / future worker)."""

from __future__ import annotations

import os
from typing import Any, Mapping

from ghost_engine.db.job_scoring_repository import fetch_latest_job_public_url_from_registry
from ghost_engine.notify.operator_metrics import record_operator_dispatch_outcome
from ghost_engine.utils.logger import get_logger

log = get_logger(__name__)


def _safe_site_id(v: Any) -> str:
    return v.strip().lower() if isinstance(v, str) else ""


def _truthy_env(name: str) -> bool:
    return os.environ.get(name, "").strip().lower() in ("1", "true", "yes", "on")


async def _enrich_cmd_job_public_url_from_registry(cmd: dict[str, Any], site_id: str) -> None:
    """Fill ``job_public_url`` from PostgreSQL when Telegram payload omitted it (Anchor)."""
    jpu = cmd.get("job_public_url")
    if isinstance(jpu, str) and jpu.strip():
        return
    jid = cmd.get("job_id")
    if not isinstance(jid, str) or not jid.strip():
        return
    u = await fetch_latest_job_public_url_from_registry(site_id=site_id, job_id=jid.strip())
    if isinstance(u, str) and u.strip():
        cmd["job_public_url"] = u.strip()
        log.info(
            "operator.cmd_enriched_job_public_url",
            site_id=site_id,
            job_id=jid.strip(),
        )


async def dispatch_operator_command(
    adapter: Any,
    page: Any,
    cmd: Mapping[str, Any],
    *,
    session_site_id: str,
    humanize: bool,
) -> str:
    """
    Handle one decoded command dict. Returns a short outcome label for metrics/tests.

    ``page`` is passed through to adapter methods (Playwright Page in production).
    """
    sid = _safe_site_id(session_site_id)
    raw_site = cmd.get("site_id")
    cmd_site = _safe_site_id(raw_site)
    if not cmd_site:
        log.warning("operator.dispatch_bad_cmd", reason="missing_site_id", cmd_keys=list(cmd.keys()))
        record_operator_dispatch_outcome(
            "bad_payload",
            action=str(cmd.get("action") or ""),
            job_id=str(cmd.get("job_id") or ""),
            site_id=sid,
        )
        return "bad_payload"
    if cmd_site != sid:
        log.info(
            "operator.dispatch_skip_site",
            session_site_id=sid,
            cmd_site_id=cmd_site,
            action=cmd.get("action"),
        )
        record_operator_dispatch_outcome(
            "ignored_site",
            action=str(cmd.get("action") or ""),
            job_id=str(cmd.get("job_id") or ""),
            site_id=cmd_site,
        )
        return "ignored_site"

    action = cmd.get("action")
    if not isinstance(action, str) or not action.strip():
        log.warning("operator.dispatch_bad_cmd", reason="missing_action")
        record_operator_dispatch_outcome(
            "bad_payload",
            action="",
            job_id="",
            site_id=cmd_site,
        )
        return "bad_payload"

    action_l = action.strip().lower()

    if action_l == "skip":
        log.info(
            "operator.skip_ack",
            site_id=cmd_site,
            job_id=cmd.get("job_id"),
            idempotency_key=cmd.get("idempotency_key"),
        )
        record_operator_dispatch_outcome(
            "skip_logged",
            action="skip",
            job_id=str(cmd.get("job_id") or ""),
            site_id=cmd_site,
        )
        return "skip_logged"

    job_id = cmd.get("job_id")
    if not isinstance(job_id, str) or not job_id.strip():
        if action_l in ("apply", "save_job", "unsave_job"):
            log.warning(
                "operator.dispatch_bad_cmd",
                reason="missing_job_id",
                action=action_l,
            )
            record_operator_dispatch_outcome(
                "bad_payload",
                action=action_l,
                job_id="",
                site_id=cmd_site,
            )
            return "bad_payload"

    jid = job_id.strip() if isinstance(job_id, str) else ""

    if isinstance(cmd, dict) and action_l in ("apply", "save_job", "unsave_job"):
        await _enrich_cmd_job_public_url_from_registry(cmd, cmd_site)

    if action_l == "save_job":
        fn = getattr(adapter, "save_job_on_page", None)
        if not callable(fn):
            log.warning(
                "operator.dispatch_no_save_method",
                site_id=cmd_site,
                adapter=type(adapter).__name__,
            )
            record_operator_dispatch_outcome(
                "save_no_handler",
                action="save_job",
                job_id=jid,
                site_id=cmd_site,
            )
            return "save_no_handler"
        jpu_raw = cmd.get("job_public_url")
        jpu = jpu_raw.strip() if isinstance(jpu_raw, str) and jpu_raw.strip() else None
        try:
            await fn(page, jid, humanize=humanize, job_public_url=jpu)
        except Exception as exc:
            log.exception(
                "operator.save_job_failed",
                site_id=cmd_site,
                job_id=jid,
                error_type=type(exc).__name__,
            )
            record_operator_dispatch_outcome(
                "save_failed",
                action="save_job",
                job_id=jid,
                site_id=cmd_site,
            )
            return "save_failed"
        record_operator_dispatch_outcome(
            "save_ok",
            action="save_job",
            job_id=jid,
            site_id=cmd_site,
        )
        return "save_ok"

    if action_l == "unsave_job":
        fn = getattr(adapter, "unsave_job_on_page", None)
        if not callable(fn):
            log.warning(
                "operator.dispatch_no_unsave_method",
                site_id=cmd_site,
                adapter=type(adapter).__name__,
            )
            record_operator_dispatch_outcome(
                "unsave_no_handler",
                action="unsave_job",
                job_id=jid,
                site_id=cmd_site,
            )
            return "unsave_no_handler"
        jpu_raw = cmd.get("job_public_url")
        jpu = jpu_raw.strip() if isinstance(jpu_raw, str) and jpu_raw.strip() else None
        try:
            await fn(page, jid, humanize=humanize, job_public_url=jpu)
        except Exception as exc:
            log.exception(
                "operator.unsave_job_failed",
                site_id=cmd_site,
                job_id=jid,
                error_type=type(exc).__name__,
            )
            record_operator_dispatch_outcome(
                "unsave_failed",
                action="unsave_job",
                job_id=jid,
                site_id=cmd_site,
            )
            return "unsave_failed"
        record_operator_dispatch_outcome(
            "unsave_ok",
            action="unsave_job",
            job_id=jid,
            site_id=cmd_site,
        )
        return "unsave_ok"

    if action_l != "apply":
        log.info("operator.dispatch_unknown_action", action=action_l)
        record_operator_dispatch_outcome(
            "unknown",
            action=action_l,
            job_id=jid,
            site_id=cmd_site,
        )
        return "unknown"

    cover = cmd.get("cover_letter")
    cover_s = str(cover) if cover is not None else ""

    strat_raw = cmd.get("apply_strategy")
    strat = strat_raw.strip().lower() if isinstance(strat_raw, str) else "url_only"
    if strat == "url_fallback":
        strat = "url_only"
    if strat not in ("dom_first", "url_only"):
        strat = "url_only"
    jpu_raw = cmd.get("job_public_url")
    jpu = jpu_raw.strip() if isinstance(jpu_raw, str) and jpu_raw.strip() else None

    bid_raw = cmd.get("proposal_bid")
    bid_s = bid_raw.strip() if isinstance(bid_raw, str) else ""
    dur_raw = cmd.get("proposal_duration")
    dur_s = dur_raw.strip() if isinstance(dur_raw, str) else ""
    if not dur_s:
        dur_s = (os.environ.get("GHOST_APPLY_DURATION_LABEL") or "").strip()
    fee_raw = cmd.get("proposal_fee_percent")
    fee_s = fee_raw.strip() if isinstance(fee_raw, str) else ""
    if not fee_s:
        fee_s = (os.environ.get("GHOST_APPLY_FEE_PERCENT") or "").strip()

    submit_flag = cmd.get("submit_proposal")
    submit_proposal = bool(submit_flag) if submit_flag is not None else _truthy_env(
        "GHOST_APPLY_AUTO_SUBMIT"
    )

    fn = getattr(adapter, "apply_for_job", None)
    if not callable(fn):
        log.warning(
            "operator.dispatch_no_apply_method",
            site_id=cmd_site,
            adapter=type(adapter).__name__,
        )
        record_operator_dispatch_outcome(
            "no_handler",
            action="apply",
            job_id=jid,
            site_id=cmd_site,
        )
        return "no_handler"

    try:
        await fn(
            page,
            jid,
            cover_s,
            humanize=humanize,
            apply_strategy=strat,
            job_public_url=jpu,
            proposal_bid=bid_s or None,
            proposal_duration=dur_s or None,
            proposal_fee_percent=fee_s or None,
            submit_proposal=submit_proposal,
        )
    except Exception as exc:
        log.exception(
            "operator.apply_failed",
            site_id=cmd_site,
            job_id=jid,
            error_type=type(exc).__name__,
        )
        record_operator_dispatch_outcome(
            "apply_failed",
            action="apply",
            job_id=jid,
            site_id=cmd_site,
        )
        return "apply_failed"

    log.info("operator.apply_dispatched_ok", site_id=cmd_site, job_id=jid)
    record_operator_dispatch_outcome(
        "apply_ok",
        action="apply",
        job_id=jid,
        site_id=cmd_site,
    )
    return "apply_ok"
