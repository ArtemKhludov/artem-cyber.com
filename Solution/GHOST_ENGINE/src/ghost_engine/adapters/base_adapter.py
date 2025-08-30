"""Abstract site adapter: YAML-driven endpoints and network interception hooks."""

from __future__ import annotations

import asyncio
import copy
import inspect
import os
import re
import time
from collections import deque
from datetime import UTC, datetime
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import yaml
from playwright.async_api import Page

from ghost_engine.adapters.graphql_payload_storage import save_graphql_payload_async
from ghost_engine.browser import human_behavior
from ghost_engine.ops.reason_streak import ConsecutiveKeyStreak
from ghost_engine.utils.logger import get_logger

log = get_logger(__name__)

_scoring_graph_error_last_alert_m: float = 0.0

# Safe segment for job id in URL path (platform-specific templates in site YAML).
_JOB_ID_URL_SAFE = re.compile(r"^[a-zA-Z0-9._~-]+$")


async def _registry_record_job_event(
    site_id: str,
    job_id: str,
    outcome: str,
    *,
    gri: float | None = None,
    job_tier: str | None = None,
    l0_code: str | None = None,
    skip_notify_reason: str | None = None,
    artifact_relpath: str | None = None,
    sig: dict[str, Any] | None = None,
) -> None:
    from ghost_engine.db.job_scoring_repository import (
        build_summary_from_signal,
        parse_run_id_from_env,
        record_job_scoring_event,
    )

    await record_job_scoring_event(
        site_id=site_id,
        job_id=job_id,
        outcome=outcome,
        run_id=parse_run_id_from_env(),
        gri=gri,
        job_tier=str(job_tier) if job_tier is not None else None,
        l0_code=l0_code,
        skip_notify_reason=skip_notify_reason,
        artifact_relpath=artifact_relpath,
        summary=build_summary_from_signal(sig),
    )


def _sanitize_upwork_job_public_url_for_goto(raw: str | None) -> str | None:
    """Allow only https Upwork job URLs for optional navigation before apply template."""
    if not raw or not isinstance(raw, str):
        return None
    u = raw.strip().split("#", 1)[0].strip()
    if not u.startswith("https://"):
        return None
    p = urlparse(u)
    host = (p.hostname or "").lower()
    if not host:
        return None
    if host != "upwork.com" and not host.endswith(".upwork.com"):
        return None
    path_l = (p.path or "").lower()
    if "/jobs/" not in path_l:
        return None
    return u


def _string_map(raw: Any) -> dict[str, str]:
    """Keep only str->str pairs from YAML map."""
    if not isinstance(raw, dict):
        return {}
    out: dict[str, str] = {}
    for key, value in raw.items():
        if isinstance(key, str) and isinstance(value, str):
            out[key] = value
    return out


class BaseSiteAdapter(ABC):
    # Bound memory: cores from normalize_job_signals across sniff responses (DOM gap diagnostics).
    _SNIFF_NORMALIZED_CORES_CAP: int = 6000

    def __init__(self, site_yaml: Path) -> None:
        self._raw = self._load(site_yaml)
        self._runtime_config: Any | None = None
        self._l0_drop_streak = ConsecutiveKeyStreak()
        self._sniff_normalized_job_cores: set[str] = set()

    def set_runtime_config_manager(self, manager: Any) -> None:
        """Inject RuntimeConfigManager for dynamic selector overrides (self-healing)."""
        self._runtime_config = manager

    async def get_selector(self, key: str) -> str:
        """
        Get selector for a key. Checks Redis overrides first, then falls back to YAML.
        """
        if self._runtime_config is not None:
            override = await self._runtime_config.get_selector_override(self.site_id, key)
            if override:
                log.debug("adapter.selector_override_hit", site_id=self.site_id, key=key, selector=override)
                return override
        return str(self.selectors.get(key, "")).strip()

    @staticmethod
    def _load(path: Path) -> dict[str, Any]:
        with path.open("r", encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}
        return data if isinstance(data, dict) else {}

    @property
    def selectors(self) -> dict[str, str]:
        return _string_map(self._raw.get("selectors"))

    @property
    def chat_rules(self) -> dict[str, Any]:
        chat_rules = self._raw.get("chat_rules")
        if not isinstance(chat_rules, dict):
            return {}
        return dict(chat_rules)


    @property
    def site_id(self) -> str:
        value = self._raw.get("site_id")
        return value if isinstance(value, str) else ""

    @property
    def mouse_config(self) -> dict[str, Any]:
        mouse_config = self._raw.get("mouse_config")
        if not isinstance(mouse_config, dict):
            return {}
        return dict(mouse_config)

    @property
    def jobs_graphql_url(self) -> str:
        """Jobs GraphQL endpoint from site YAML (graphql.jobs_endpoint)."""
        graphql = self._raw.get("graphql")
        if not isinstance(graphql, dict):
            return ""
        value = graphql.get("jobs_endpoint")
        return value if isinstance(value, str) else ""

    @property
    def start_url(self) -> str:
        """First navigation URL from site YAML (url)."""
        value = self._raw.get("url")
        return value if isinstance(value, str) else ""

    @property
    def feed_url(self) -> str:
        """Optional find-work / feed entry (``feed_url``); falls back to ``start_url``."""
        fu = self._raw.get("feed_url")
        if isinstance(fu, str) and fu.strip():
            return fu.strip()
        return self.start_url

    @property
    def load_more_button_selector(self) -> str:
        """CSS for feed ``Load more`` (``selectors.load_more_button`` in site YAML)."""
        return self.selectors.get("load_more_button", "").strip()

    @property
    def apply_dom_first_timeout_sec(self) -> float:
        """Max seconds for DOM link resolution before falling back to ``apply_url_template``."""
        raw = self._raw.get("apply_dom_first_timeout_sec")
        if isinstance(raw, (int, float)) and float(raw) > 0:
            return max(0.5, min(float(raw), 120.0))
        env_ms = os.environ.get("GHOST_APPLY_DOM_FIRST_TIMEOUT_MS", "15000")
        try:
            ms = int(env_ms)
        except ValueError:
            ms = 15_000
        ms = max(500, min(ms, 120_000))
        return ms / 1000.0

    @property
    def page_ready_selector(self) -> str:
        """Optional CSS for main shell after navigation (``page_ready_selector`` or ``selectors.page_ready``)."""
        top = self._raw.get("page_ready_selector")
        if isinstance(top, str) and top.strip():
            return top.strip()
        pr = self.selectors.get("page_ready")
        return pr.strip() if isinstance(pr, str) and pr.strip() else ""

    @property
    def captcha_selectors_extra(self) -> list[str]:
        """Optional site-specific CSS selectors merged with defaults in captcha_detect."""
        raw = self._raw.get("captcha_selectors")
        if not isinstance(raw, list):
            return []
        out: list[str] = []
        for item in raw:
            if isinstance(item, str) and item.strip():
                out.append(item.strip())
        return out

    async def check_for_captcha(self, page: Page) -> None:
        """
        If a captcha widget is detected, wait for manual clearance, then escalate:
        screenshot + Telegram alert to operators, optional long sleep (no blind login spam).

        Env: GHOST_CAPTCHA_MANUAL_WAIT_SEC, GHOST_CAPTCHA_POLL_INTERVAL_SEC,
        GHOST_CAPTCHA_BLOCK_SEC, GHOST_CAPTCHA_BLOCK_ON_ALERT, GHOST_CAPTCHA_ALERT_GREETING.
        """
        from ghost_engine.adapters import captcha_detect
        from ghost_engine.browser import anti_captcha
        from ghost_engine.telegram import operator_alert
        from ghost_engine.utils.captcha_solver import solve_captcha_if_needed

        extra = self.captcha_selectors_extra
        sid = (self.site_id or "unknown").strip()
        # Failed-attempt UI: hard freeze + alert (never returns).
        await anti_captcha.check_for_captcha(page, extra, site_id=sid)
        if not await captcha_detect.is_captcha_present(page, extra):
            return

        log.warning("captcha.detected", site_id=sid)

        manual_wait = float(os.getenv("GHOST_CAPTCHA_MANUAL_WAIT_SEC", "45"))
        poll = max(0.5, float(os.getenv("GHOST_CAPTCHA_POLL_INTERVAL_SEC", "2.5")))
        deadline = time.monotonic() + max(0.0, manual_wait)

        while time.monotonic() < deadline:
            await asyncio.sleep(poll)
            if not await captcha_detect.is_captcha_present(page, extra):
                log.info("captcha.cleared_after_wait", site_id=sid)
                return

        await solve_captcha_if_needed(b"")
        if not await captcha_detect.is_captcha_present(page, extra):
            log.info("captcha.cleared_after_solver_hook", site_id=sid)
            return

        log.warning("captcha.escalate", site_id=sid)
        try:
            png: bytes = await page.screenshot(type="png", full_page=True)
        except Exception as exc:
            log.warning("captcha.screenshot_failed", error=str(exc))
            png = b""

        caption = operator_alert.format_captcha_alert_caption(site_id=sid)
        if png:
            await operator_alert.send_operator_photo_alert(photo_png=png, caption=caption)
        else:
            log.warning("captcha.skip_photo_alert", reason="screenshot_empty")

        raw_block = os.getenv("GHOST_CAPTCHA_BLOCK_ON_ALERT")
        if raw_block is None:
            block_on = True
        else:
            block_on = raw_block.strip().lower() not in ("0", "false", "no", "off")
        block_sec = float(os.getenv("GHOST_CAPTCHA_BLOCK_SEC", "3600"))
        if block_on and block_sec > 0:
            log.warning("captcha.blocked", site_id=sid, block_sec=block_sec)
            await asyncio.sleep(block_sec)

    @abstractmethod
    async def poll_inbox(self) -> list[dict[str, Any]]:
        """Fetch new messages / job signals."""

    def record_sniff_normalized_job_cores(self, raw_sigs: list[Any]) -> None:
        """
        Track job ciphertext cores extracted from each GraphQL body (before prefilter).

        Used to compare visible feed DOM links vs payloads the normalizer understands.
        """
        for s in raw_sigs:
            if not isinstance(s, dict):
                continue
            jid = str(s.get("job_id") or "").strip()
            if not jid or jid == "?":
                continue
            self._sniff_normalized_job_cores.add(jid.lstrip("~"))
        cap = int(self._SNIFF_NORMALIZED_CORES_CAP)
        while len(self._sniff_normalized_job_cores) > cap:
            try:
                self._sniff_normalized_job_cores.pop()
            except KeyError:
                break

    async def save_graphql_sniff_payload(self, data: dict[str, Any]) -> None:
        """
        L0/L1 sieve first; full JSON dump only if L0 passes.

        L0 drop or insufficient signal: one JSONL line under data/<site_id>/trash/ (no heavy jobs/ file).
        """
        await self._scoring_sieve_maybe_save(data)

    async def _scoring_sieve_maybe_save(self, data: dict[str, Any]) -> None:
        from ghost_engine.agents.graph import ainvoke_scoring_graph
        from ghost_engine.scoring.normalizer import (
            normalize_job_signals,
            scoring_signal_nonempty,
        )
        from ghost_engine.scoring.trash_log import (
            REASON_INSUFFICIENT_SIGNAL,
            append_trash_entry,
            build_trash_record,
        )

        sid = (self.site_id or "unknown").strip()
        sniff_iso = datetime.now(UTC).isoformat()
        from ghost_engine.db.job_scoring_repository import parse_run_id_from_env

        _run_uuid = parse_run_id_from_env()
        trash_run_id: str | None = str(_run_uuid) if _run_uuid is not None else None

        def _trash_audit(
            *,
            phase: str,
            job_id: str,
            title_hint: str | None,
            reason_code: str,
            detail: str,
            gri: float | None = None,
        ) -> None:
            tp = (title_hint or "").strip()
            if len(tp) > 160:
                tp = tp[:157] + "..."
            log.info(
                "job.trash_audit",
                site_id=sid,
                phase=phase,
                job_id=job_id,
                title_preview=tp or None,
                reason_code=reason_code,
                detail=(detail or "")[:500],
                gri=gri,
            )

        # Upwork (and others) multiplex many GraphQL aliases on one URL; most responses are
        # not job listings. Skip scoring + trash for payloads that normalize to empty signal —
        # avoids megabytes of INSUFFICIENT_SIGNAL JSONL noise (see scoring_signal_nonempty).
        # One GraphQL body may contain many jobs (feed Load More); score each signal separately.
        raw_sigs = normalize_job_signals(sid, data, sniffed_at=sniff_iso)
        self.record_sniff_normalized_job_cores(raw_sigs)
        candidates = [dict(s) for s in raw_sigs if scoring_signal_nonempty(s)]
        if not candidates:
            log.debug(
                "job.scoring_skip_preflight",
                site_id=sid,
                reason="graphql_not_job_shaped",
            )
            data_block = data.get("data")
            if isinstance(data_block, dict) and data_block:
                try:
                    from ghost_engine.ops.graphql_shape_diag import (
                        maybe_schedule_shape_diag_empty_parse,
                    )

                    maybe_schedule_shape_diag_empty_parse(site_id=sid, payload=data)
                except Exception as exc:
                    log.warning("graphql_shape_diag.empty_parse_hook_failed", error=str(exc))
            return

        artifact_cache: dict[str, str | None] = {"relpath": None}

        async def _post_after_scoring_graph(final: dict[str, Any]) -> None:
            if not isinstance(final.get("scoring_traversal"), dict):
                from ghost_engine.scoring.gate_ledger import build_scoring_traversal_report

                final["scoring_traversal"] = build_scoring_traversal_report(final)
            sig = final.get("job_signal")
            if not isinstance(sig, dict) or not scoring_signal_nonempty(sig):
                missing_id = not sig.get("job_id") if isinstance(sig, dict) else True
                missing_title = not (isinstance(sig.get("title"), str) and len(sig["title"].strip()) > 2) if isinstance(sig, dict) else True
                detail_msg = f"insufficient_signal (id_miss={missing_id}, title_miss={missing_title})"
                
                log.info("job.scoring_skip", site_id=sid, reason=detail_msg)
                _sig_d = sig if isinstance(sig, dict) else {}
                _tid = str(_sig_d.get("title") or "")[:200] if isinstance(_sig_d.get("title"), str) else None
                _trash_audit(
                    phase="insufficient_signal",
                    job_id=str(_sig_d.get("job_id") or "?"),
                    title_hint=_tid,
                    reason_code=REASON_INSUFFICIENT_SIGNAL,
                    detail=detail_msg,
                )
    
                # --- NEW: Trigger AI Diagnostic Streak on Adapter ---
                handler = getattr(self, "handle_insufficient_signal", None)
                if callable(handler):
                    await handler(data)
    
                rec = build_trash_record(
                    _sig_d,
                    sid,
                    REASON_INSUFFICIENT_SIGNAL,
                    detail=detail_msg,
                    run_id=trash_run_id,
                )
                await asyncio.to_thread(append_trash_entry, sid, rec)
                await _registry_record_job_event(
                    sid,
                    str(sig.get("job_id") or "?"),
                    "insufficient",
                    l0_code=None,
                    sig=sig if isinstance(sig, dict) else None,
                )
                _abandon = getattr(self, "abandon_detail_notify_defer", None)
                if callable(_abandon):
                    _abandon(str(sig.get("job_id") or "?"))
                from ghost_engine.scoring.feed_scoring_run_ledger import record_feed_sortie_outcome
    
                record_feed_sortie_outcome(
                    site_id=sid,
                    job_id=str(_sig_d.get("job_id") or "?"),
                    title_preview=_tid,
                    outcome_kind="insufficient",
                    reason_code=REASON_INSUFFICIENT_SIGNAL,
                    gri=None,
                )
                return
    
            # Reset insufficient-signal streak if graph produced a nonempty job signal
            resetter = getattr(self, "reset_insufficient_signal_streak", None)
            if callable(resetter):
                resetter()
    
            jid = sig.get("job_id") or "?"
    
            def _ledger_rec(
                kind: str,
                reason: str,
                *,
                gri_v: float | None = None,
                job_override: str | None = None,
            ) -> None:
                from ghost_engine.scoring.feed_scoring_run_ledger import record_feed_sortie_outcome
    
                t = sig.get("title")
                tp = str(t).strip() if isinstance(t, str) else None
                record_feed_sortie_outcome(
                    site_id=sid,
                    job_id=str(job_override if job_override is not None else jid),
                    title_preview=tp,
                    outcome_kind=kind,
                    reason_code=reason,
                    gri=gri_v,
                )
    
            if not final.get("l0_passed"):
                reason_code = str(final.get("l0_code") or "L0_FAIL")
                detail_l0 = str(final.get("l0_detail") or "")
                _trash_audit(
                    phase="l0_drop",
                    job_id=str(jid),
                    title_hint=str(sig.get("title") or "") if isinstance(sig.get("title"), str) else None,
                    reason_code=reason_code,
                    detail=detail_l0,
                )
                rec = build_trash_record(
                    sig, sid, reason_code, detail=detail_l0, run_id=trash_run_id
                )
                await asyncio.to_thread(append_trash_entry, sid, rec)
                streak_hit, streak_n = self._l0_drop_streak.record(reason_code)
                trav = final.get("scoring_traversal")
                trav_sum = str(trav.get("summary_ru", ""))[:600] if isinstance(trav, dict) else ""
                log.info(
                    "job.scoring_gate",
                    site_id=sid,
                    job_id=jid,
                    status="DROP_L0",
                    score=0,
                    reason=detail_l0,
                    reason_code=reason_code,
                    message=f"Job {jid} - DROP_L0 - 0 - {detail_l0}",
                    ops_event="l0_streak_tick",
                    l0_consecutive_same_code=streak_n,
                    scoring_traversal_summary=trav_sum or None,
                    scoring_flow_continues=trav.get("flow_continues") if isinstance(trav, dict) else None,
                )
                if streak_hit:
                    log.warning(
                        "job.l0_reason_streak_hit",
                        site_id=sid,
                        reason_code=reason_code,
                        consecutive=streak_n,
                        job_id=jid,
                        ops_event="l0_reason_streak_hit",
                        dashboard_hint="check normalizer GraphQL paths and L0 rules",
                    )
    
                    async def _l0_streak_alert() -> None:
                        from ghost_engine.telegram.operator_alert import send_operator_text_alert
    
                        body = (
                            f"L0 mass-drop streak ({streak_n}x same code)\n"
                            f"site={sid}\ncode={reason_code}\njob={jid}\n{detail_l0[:900]}"
                        )
                        await send_operator_text_alert(text=body, ops_topic="errors")
    
                    asyncio.create_task(_l0_streak_alert())
                await _registry_record_job_event(
                    sid,
                    str(jid),
                    "drop_l0",
                    l0_code=reason_code,
                    sig=sig,
                )
                _abandon = getattr(self, "abandon_detail_notify_defer", None)
                if callable(_abandon):
                    _abandon(str(jid))
                gri_l0 = float(final["gri"]) if isinstance(final.get("gri"), (int, float)) else None
                _ledger_rec("l0_drop", reason_code, gri_v=gri_l0)
                return
    
            self._l0_drop_streak.reset()
            rel = artifact_cache.get("relpath")
            if rel is None:
                rel = await save_graphql_payload_async(self.site_id, data)
                artifact_cache["relpath"] = rel
            artifact_relpath = rel
            gri = final.get("gri")
            gri_f = float(gri) if isinstance(gri, (int, float)) else None
            persona = final.get("persona_tag")
            tier = final.get("job_tier")
            score_ui = int(round(gri_f * 100)) if gri_f is not None else 0
            full_detail = (
                f"L0={final.get('l0_code')} | GRI={gri_f:.4f} | tier={tier} | persona={persona}"
                if gri_f is not None
                else f"L0={final.get('l0_code')} | GRI=n/a | tier={tier} | persona={persona}"
            )
            trav = final.get("scoring_traversal")
            trav_sum = str(trav.get("summary_ru", ""))[:600] if isinstance(trav, dict) else ""
            log.info(
                "job.scoring_gate",
                site_id=sid,
                job_id=jid,
                status="GRI_SCORED",
                score=score_ui,
                reason=full_detail,
                reason_code=str(final.get("l0_code") or ""),
                message=f"Job {jid} - GRI_SCORED - {score_ui} - {full_detail}",
                gri=gri_f,
                persona_tag=str(persona) if persona is not None else None,
                job_tier=str(tier) if tier is not None else None,
                scoring_traversal_summary=trav_sum or None,
                scoring_flow_continues=trav.get("flow_continues") if isinstance(trav, dict) else None,
            )
            gri_hook = getattr(self, "after_gri_scored", None)
            if callable(gri_hook):
                gri_hook(final)
            from ghost_engine.scoring.adapter_notify_policy import should_adapter_enqueue_notify
            from ghost_engine.scoring.engine import ScoringEngine
            from ghost_engine.scoring.job_quality_matrix import evaluate_job_quality_matrix
    
            _eng = ScoringEngine()
            mq = evaluate_job_quality_matrix(final, site_id=sid, scoring_root=_eng.scoring_root)
            if mq.enabled and not mq.passed:
                reasons_joined = ",".join(mq.blocking_reasons)
                detail_mq = (mq.detail or reasons_joined)[:500]
                _trash_audit(
                    phase="matrix_reject",
                    job_id=str(jid),
                    title_hint=str(sig.get("title") or "") if isinstance(sig.get("title"), str) else None,
                    reason_code="MATRIX_FAIL",
                    detail=detail_mq,
                    gri=gri_f,
                )
                try:
                    mq_rec = build_trash_record(
                        sig,
                        sid,
                        "MATRIX_FAIL",
                        detail=detail_mq,
                        run_id=trash_run_id,
                    )
                    await asyncio.to_thread(append_trash_entry, sid, mq_rec)
                except Exception as exc:
                    log.warning("job.trash_matrix_append_failed", error=str(exc))
                await _registry_record_job_event(
                    sid,
                    str(jid),
                    "matrix_reject",
                    gri=gri_f,
                    job_tier=str(tier) if tier is not None else None,
                    l0_code=str(final.get("l0_code") or ""),
                    skip_notify_reason=(reasons_joined[:200] if reasons_joined else "MATRIX_FAIL"),
                    artifact_relpath=artifact_relpath,
                    sig=sig,
                )
                _abandon = getattr(self, "abandon_detail_notify_defer", None)
                if callable(_abandon):
                    _abandon(str(jid))
                from ghost_engine.scoring.feed_scoring_run_ledger import record_feed_sortie_matrix_blocks
    
                _mt = sig.get("title")
                _mtp = str(_mt).strip() if isinstance(_mt, str) else None
                record_feed_sortie_matrix_blocks(
                    site_id=sid,
                    job_id=str(jid),
                    title_preview=_mtp,
                    blocking_reasons=list(mq.blocking_reasons),
                    gri=gri_f,
                )
                try:
                    from ghost_engine.ops.graphql_shape_diag import (
                        maybe_schedule_shape_diag_matrix_mismatch,
                    )

                    maybe_schedule_shape_diag_matrix_mismatch(
                        site_id=sid,
                        job_id=str(jid),
                        blocking_reasons=list(mq.blocking_reasons),
                        payload=data,
                    )
                except Exception as exc:
                    log.warning("graphql_shape_diag.matrix_hook_failed", error=str(exc))
                return
    
            ok_enqueue, skip_notify_reason = should_adapter_enqueue_notify(
                final, site_id=sid, scoring_root=_eng.scoring_root
            )
            if not ok_enqueue:
                log.info(
                    "job.scoring_skip_notify",
                    site_id=sid,
                    job_id=jid,
                    reason=skip_notify_reason,
                    gri=gri_f,
                    job_tier=str(tier) if tier is not None else None,
                )
                gate_detail = (
                    f"skip_notify={skip_notify_reason} gri={gri_f} tier={tier} "
                    f"l0={final.get('l0_code')}"
                )
                _trash_audit(
                    phase="notify_gate",
                    job_id=str(jid),
                    title_hint=str(sig.get("title") or "") if isinstance(sig.get("title"), str) else None,
                    reason_code=f"NOTIFY_{skip_notify_reason}",
                    detail=gate_detail,
                    gri=gri_f,
                )
                try:
                    gate_rec = build_trash_record(
                        sig,
                        sid,
                        f"NOTIFY_{skip_notify_reason}",
                        detail=gate_detail,
                        run_id=trash_run_id,
                    )
                    await asyncio.to_thread(append_trash_entry, sid, gate_rec)
                except Exception as exc:
                    log.warning("job.trash_notify_gate_append_failed", error=str(exc))
                out = (
                    "scored_trash"
                    if skip_notify_reason == "trash_tier"
                    else "notify_skipped"
                )
                await _registry_record_job_event(
                    sid,
                    str(jid),
                    out,
                    gri=gri_f,
                    job_tier=str(tier) if tier is not None else None,
                    l0_code=str(final.get("l0_code") or ""),
                    skip_notify_reason=skip_notify_reason,
                    artifact_relpath=artifact_relpath,
                    sig=sig,
                )
                _abandon = getattr(self, "abandon_detail_notify_defer", None)
                if callable(_abandon):
                    _abandon(str(jid))
                _ledger_rec("notify_gate", f"NOTIFY_{skip_notify_reason}", gri_v=gri_f)
                return
    
            snap = getattr(self, "record_scoring_final_snapshot", None)
            if callable(snap):
                snap(final)
    
            from ghost_engine.notify.dom_notify_policy import should_defer_upwork_notify_for_dom_url
    
            defer_dom = (
                sid.strip().lower() == "upwork"
                and isinstance(final, dict)
                and should_defer_upwork_notify_for_dom_url()
            )
            if defer_dom:
                from ghost_engine.config.settings import get_settings
                from ghost_engine.notify.redis_queue import enqueue_pending_dom_resolve_async
    
                settings = get_settings()
                queued = await enqueue_pending_dom_resolve_async(settings.redis_url, copy.deepcopy(final))
                if queued:
                    log.info("notify.deferred_for_dom_url", site_id=sid, job_id=jid)
                    await _registry_record_job_event(
                        sid,
                        str(jid),
                        "defer_dom",
                        gri=gri_f,
                        job_tier=str(tier) if tier is not None else None,
                        l0_code=str(final.get("l0_code") or ""),
                        artifact_relpath=artifact_relpath,
                        sig=sig,
                    )
                    _ledger_rec("defer_dom", "defer_dom_queued", gri_v=gri_f)
                    return
                log.warning(
                    "notify.defer_dom_queue_failed_fallback_immediate",
                    site_id=sid,
                    job_id=jid,
                )
    
            # defer_dom above must run first; successful defer_dom return avoids defer_detail for the same sniff.
            defer_detail_fn = getattr(self, "defer_notify_until_job_detail_if_needed", None)
            if callable(defer_detail_fn):
                maybe = defer_detail_fn(
                    final,
                    gri_f,
                    str(jid),
                    sid,
                    artifact_relpath,
                    sig,
                )
                if inspect.isawaitable(maybe):
                    maybe = await maybe
                if maybe:
                    _ledger_rec("defer_detail", "defer_detail_notify", gri_v=gri_f)
                    return
    
            # Bridge the gap: Invoke cover letter generation before notification.
            from ghost_engine.agents.nodes.cover_letter_node import cover_letter_node
            from ghost_engine.scoring.engine import ScoringEngine
            from ghost_engine.scoring.feed_reading import feed_reading_from_scoring_root
            try:
                # cover_letter_node will call _enqueue_notify_after_cover internally.
                # We pass the scoring graph state as input.
                cover_updates = cover_letter_node(final)
                if isinstance(cover_updates, dict):
                    cov_tr = cover_updates.get("cover_pipeline_traversal")
                    if isinstance(cov_tr, dict):
                        final["cover_pipeline_traversal"] = cov_tr
                        log.info(
                            "job.cover_pipeline_traversal",
                            site_id=sid,
                            job_id=jid,
                            summary_ru=str(cov_tr.get("summary_ru", ""))[:800],
                            flow_continues=cov_tr.get("flow_continues"),
                        )
    
                # If the adapter has a pending_jobs_to_read queue (e.g. UpworkAdapter),
                # add this job so the navigation loop can "read" it on page (GRI >= feed_reading.save_min_gri).
                if hasattr(self, "pending_jobs_to_read") and isinstance(self.pending_jobs_to_read, deque):
                    if jid and jid != "?":
                        _eng_fr = ScoringEngine()
                        _fr = feed_reading_from_scoring_root(_eng_fr.scoring_root)
                        enq_fn = getattr(self, "should_enqueue_pending_job_read", None)
                        if callable(enq_fn):
                            do_pending = enq_fn(str(jid), gri_f, _fr)
                        else:
                            do_pending = _fr.enabled and (
                                gri_f is None or gri_f >= _fr.save_min_gri
                            )
                        if not do_pending:
                            log.debug(
                                "adapter.skip_pending_dom_low_gri",
                                job_id=jid,
                                site_id=sid,
                                gri=gri_f,
                                save_min_gri=_fr.save_min_gri,
                            )
                        else:
                            self.pending_jobs_to_read.append(jid)
                            log.info("adapter.queue_for_reading", job_id=jid, site_id=sid)
                await _registry_record_job_event(
                    sid,
                    str(jid),
                    "notify_enqueued",
                    gri=gri_f,
                    job_tier=str(tier) if tier is not None else None,
                    l0_code=str(final.get("l0_code") or ""),
                    artifact_relpath=artifact_relpath,
                    sig=sig,
                )
                _clr = getattr(self, "clear_detail_notify_after_enqueue", None)
                if callable(_clr):
                    _clr(str(jid))
                _ledger_rec("success_notify", "notify_enqueued", gri_v=gri_f)
            except Exception as exc:
                log.warning("adapter.cover_letter_gen_failed", error=str(exc))
                # Fallback: if cover letter gen fails, try to send notification without it.
                try:
                    from ghost_engine.config.settings import get_settings
                    from ghost_engine.notify.payload_builder import (
                        build_notify_payload_from_scoring_graph_state,
                    )
                    from ghost_engine.notify.redis_queue import enqueue_notify_job_async
    
                    settings = get_settings()
                    payload = build_notify_payload_from_scoring_graph_state(final, sid)
                    if payload is not None:
                        await enqueue_notify_job_async(settings.redis_url, payload)
                        await _registry_record_job_event(
                            sid,
                            str(jid),
                            "notify_enqueued",
                            gri=gri_f,
                            job_tier=str(tier) if tier is not None else None,
                            l0_code=str(final.get("l0_code") or ""),
                            artifact_relpath=artifact_relpath,
                            sig=sig,
                        )
                        _clr = getattr(self, "clear_detail_notify_after_enqueue", None)
                        if callable(_clr):
                            _clr(str(jid))
                        _ledger_rec("success_notify", "notify_enqueued_fallback", gri_v=gri_f)
                    else:
                        await _registry_record_job_event(
                            sid,
                            str(jid),
                            "notify_fallback_failed",
                            gri=gri_f,
                            job_tier=str(tier) if tier is not None else None,
                            l0_code=str(final.get("l0_code") or ""),
                            artifact_relpath=artifact_relpath,
                            sig=sig,
                        )
                        _ledger_rec("notify_failed", "notify_fallback_no_payload", gri_v=gri_f)
                except Exception as inner_exc:
                    log.warning("notify.enqueue_fallback_failed", error=str(inner_exc))
                    await _registry_record_job_event(
                        sid,
                        str(jid),
                        "notify_fallback_failed",
                        gri=gri_f,
                        job_tier=str(tier) if tier is not None else None,
                        l0_code=str(final.get("l0_code") or ""),
                        artifact_relpath=artifact_relpath,
                        sig=sig,
                    )
                    _ledger_rec("notify_failed", "notify_fallback_exception", gri_v=gri_f)
    

        for sig_seed in candidates:
            try:
                final = await ainvoke_scoring_graph(
                    {
                        "job_signal": sig_seed,
                        "site_id": sid,
                        "sniffed_at": sniff_iso,
                    }
                )
            except Exception as exc:
                global _scoring_graph_error_last_alert_m
                log.error(
                    "job.scoring_graph_failed",
                    site_id=sid,
                    error=str(exc),
                    error_type=type(exc).__name__,
                    ops_event="scoring_graph_exception",
                )
                cool_raw = (os.getenv("GHOST_SCORING_GRAPH_ERROR_TELEGRAM_COOLDOWN_SEC") or "").strip()
                try:
                    cool_s = float(cool_raw) if cool_raw else 0.0
                except ValueError:
                    cool_s = 0.0
                now_m = time.monotonic()
                do_tg = cool_s <= 0.0 or (now_m - _scoring_graph_error_last_alert_m) >= cool_s
                if do_tg:
                    _scoring_graph_error_last_alert_m = now_m
                    jid_hint = str(sig_seed.get("job_id") or "?")
                    ttl_hint = str(sig_seed.get("title") or "")[:100]
                    msg = (
                        "[scoring_graph] EXCEPTION\n"
                        "topo: normalize→l0→market→client→effort→roi→"
                        "budget_infer→estimates→l2_eligibility→l2_ollama→merge_notify\n"
                        f"site={sid} job_id={jid_hint}\n"
                        f"title={ttl_hint!r}\n"
                        f"{type(exc).__name__}: {str(exc)[:900]}"
                    )

                    async def _graph_err_alert() -> None:
                        from ghost_engine.telegram.operator_alert import send_ops_errors_line

                        try:
                            await send_ops_errors_line(msg)
                        except Exception as alert_exc:
                            log.warning(
                                "job.scoring_graph_ops_errors_failed",
                                error=str(alert_exc),
                            )

                    asyncio.create_task(_graph_err_alert())
                else:
                    log.debug(
                        "job.scoring_graph_telegram_cooldown",
                        site_id=sid,
                        cooldown_sec=cool_s,
                    )
                continue

            await _post_after_scoring_graph(final)

    @abstractmethod
    async def intercept_network(self, page: Page) -> None:
        """Register route listeners for GraphQL / REST."""

    def _apply_url_for_job(self, job_id: str) -> str | None:
        jid = job_id.strip()
        if not jid or not _JOB_ID_URL_SAFE.match(jid):
            log.warning(
                "adapter.apply_bad_job_id",
                site_id=self.site_id,
                job_id_preview=jid[:32] if jid else "",
            )
            return None
        raw = self._raw.get("apply_url_template")
        template = raw.strip() if isinstance(raw, str) and raw.strip() else ""
        if not template:
            log.info(
                "adapter.apply_skip_no_template",
                site_id=self.site_id,
                hint="Set apply_url_template in config/sites/<site>.yaml for Telegram apply",
            )
            return None
        try:
            return template.format(job_id=jid)
        except (KeyError, ValueError) as exc:
            log.warning(
                "adapter.apply_template_format_failed",
                site_id=self.site_id,
                error=str(exc),
            )
            return None

    async def _try_follow_job_link_from_feed(self, page: Page, job_id: str, *, humanize: bool) -> bool:
        """
        Click a job deep link already present in the DOM (feed / search results).

        Returns True if navigation was attempted and load event fired.
        """
        jid = job_id.strip()
        if not jid:
            return False
        core = jid.lstrip("~")
        sid = (self.site_id or "unknown").strip()
        selectors: list[str] = []
        custom = self.selectors.get("feed_job_deep_link", "").strip()
        if custom:
            try:
                selectors.append(custom.format(job_id=jid, job_id_core=core))
            except (KeyError, ValueError) as exc:
                log.warning("adapter.feed_job_deep_link_format_failed", site_id=sid, error=str(exc))
        if core:
            selectors.append(f'a[href*="~{core}"]')
        selectors.append(f'a[href*="{jid}"]')

        for sel in selectors:
            loc = page.locator(sel)
            try:
                if await loc.count() == 0:
                    continue
                first = loc.first
                await first.scroll_into_view_if_needed(timeout=5_000)
                await human_behavior.human_click(
                    first,
                    humanize=humanize,
                    timeout_ms=12_000,
                )
                await page.wait_for_load_state("domcontentloaded", timeout=20_000)
                await human_behavior.after_navigation_settle(
                    page,
                    humanize=humanize,
                    ready_selector=self.page_ready_selector,
                )
                return True
            except Exception as exc:
                log.debug(
                    "adapter.feed_link_click_failed",
                    site_id=sid,
                    selector_preview=sel[:48],
                    error=str(exc),
                )
                continue
        return False

    async def _try_click_apply_now_button(self, page: Page, *, humanize: bool) -> bool:
        """
        Job detail page: open proposal flow when textarea is not visible (fix_1 §7.2).

        Requires non-empty ``apply_now_button`` in site YAML.
        """
        sid = (self.site_id or "unknown").strip()
        sel = self.selectors.get("apply_now_button", "").strip()
        if not sel:
            return False
        btn = page.locator(sel).first
        try:
            if await btn.count() == 0:
                return False
            await human_behavior.human_click(btn, humanize=humanize, timeout_ms=16_000)
            await page.wait_for_load_state("domcontentloaded", timeout=25_000)
            await human_behavior.after_navigation_settle(
                page,
                humanize=humanize,
                ready_selector=self.page_ready_selector,
            )
            await self.check_for_captcha(page)
            log.info("adapter.apply_now_clicked", site_id=sid)
            return True
        except Exception as exc:
            log.warning("adapter.apply_now_click_failed", site_id=sid, error=str(exc))
            return False

    async def apply_for_job(
        self,
        page: Page,
        job_id: str,
        cover_letter: str,
        *,
        humanize: bool = True,
        apply_strategy: str = "url_only",
        job_public_url: str | None = None,
        proposal_bid: str | None = None,
        proposal_duration: str | None = None,
        proposal_fee_percent: str | None = None,
        submit_proposal: bool = False,
    ) -> None:
        """
        YAML-driven: optional DOM-first open, optional ``job_public_url`` goto, then
        ``apply_url_template`` if textarea still missing.

        Fills cover letter; optional bid / duration / fee via site ``selectors`` when provided.
        Submit is opt-in (``submit_proposal`` or env ``GHOST_APPLY_AUTO_SUBMIT``).
        """
        sid = (self.site_id or "unknown").strip()
        opened_from_feed = False
        dom_first_timed_out = False
        navigated_via_apply_template = False
        used_job_public_url_goto = False
        if apply_strategy == "dom_first":
            t_sec = self.apply_dom_first_timeout_sec
            try:
                opened_from_feed = await asyncio.wait_for(
                    self._try_follow_job_link_from_feed(page, job_id, humanize=humanize),
                    timeout=t_sec,
                )
            except asyncio.TimeoutError:
                dom_first_timed_out = True
                log.warning(
                    "adapter.apply_feed_dom_timeout",
                    site_id=sid,
                    job_id=job_id.strip(),
                    timeout_sec=t_sec,
                )
                opened_from_feed = False
            if opened_from_feed:
                log.info("adapter.apply_opened_from_feed_dom", site_id=sid, job_id=job_id.strip())
            else:
                log.info("adapter.apply_feed_dom_miss", site_id=sid, job_id=job_id.strip())

        url = self._apply_url_for_job(job_id)
        hint = self.selectors.get("proposal_cover_letter", "").strip()
        candidates = page.locator(hint) if hint else page.locator("main textarea")

        async def _textarea_count() -> int:
            try:
                return await candidates.count()
            except Exception as exc:
                log.warning("adapter.apply_locator_error", site_id=sid, error=str(exc))
                return 0

        n = await _textarea_count()
        pub = _sanitize_upwork_job_public_url_for_goto(job_public_url)
        if n == 0 and pub:
            used_job_public_url_goto = True
            log.info(
                "adapter.apply_job_public_url_goto",
                site_id=sid,
                job_id=job_id.strip(),
                url_preview=pub[:96],
            )
            await page.goto(pub, wait_until="domcontentloaded")
            await human_behavior.after_navigation_settle(
                page,
                humanize=humanize,
                ready_selector=self.page_ready_selector,
            )
            await self.check_for_captcha(page)
            candidates = page.locator(hint) if hint else page.locator("main textarea")
            n = await _textarea_count()

        if n == 0 and url is not None:
            navigated_via_apply_template = True
            log.info("adapter.apply_goto", site_id=sid, job_id=job_id.strip(), url_preview=url[:96])
            await page.goto(url, wait_until="domcontentloaded")
            await human_behavior.after_navigation_settle(
                page,
                humanize=humanize,
                ready_selector=self.page_ready_selector,
            )
            await self.check_for_captcha(page)
            candidates = page.locator(hint) if hint else page.locator("main textarea")
            n = await _textarea_count()

        if n == 0:
            log.warning(
                "adapter.apply_no_cover_field_attempt_healing",
                site_id=sid,
                job_id=job_id.strip(),
            )
            
            # --- SELF-HEALING START ---
            from ghost_engine.browser.emergency import ask_ai_for_ui_fix
            from ghost_engine.core.redis_queue import get_redis
            
            redis = await get_redis()
            selector_key = "proposal_cover_letter"
            new_selector = await ask_ai_for_ui_fix(page, sid, selector_key, redis)
            
            if new_selector:
                log.info("adapter.apply_healing_success", site_id=sid, selector=new_selector)
                candidates = page.locator(new_selector)
                n = await _textarea_count()
            # --- SELF-HEALING END ---

        if n == 0:
            if await self._try_click_apply_now_button(page, humanize=humanize):
                candidates = page.locator(hint) if hint else page.locator("main textarea")
                n = await _textarea_count()

        if n == 0:
            log.warning(
                "adapter.apply_no_cover_field",
                site_id=sid,
                job_id=job_id.strip(),
                used_config_selector=bool(hint),
                had_apply_url=bool(url),
            )
            log.info(
                "adapter.apply_metrics",
                site_id=sid,
                job_id=job_id.strip(),
                strategy=apply_strategy,
                dom_nav_hit=opened_from_feed,
                dom_first_timed_out=dom_first_timed_out,
                used_job_public_url_goto=used_job_public_url_goto,
                used_apply_url_goto=navigated_via_apply_template,
                outcome="no_textarea",
            )
            return

        log.info(
            "adapter.apply_metrics",
            site_id=sid,
            job_id=job_id.strip(),
            strategy=apply_strategy,
            dom_nav_hit=opened_from_feed,
            dom_first_timed_out=dom_first_timed_out,
            used_job_public_url_goto=used_job_public_url_goto,
            used_apply_url_goto=navigated_via_apply_template,
            outcome="textarea_ready",
        )

        loc = candidates.first
        if humanize:
            await human_behavior.human_type(page, loc, cover_letter)
        else:
            await loc.click(timeout=15_000)
            await loc.fill(cover_letter)

        bid_s = proposal_bid.strip() if isinstance(proposal_bid, str) else ""
        if bid_s:
            sel_bid = self.selectors.get("proposal_bid_input", "").strip()
            if sel_bid:
                bl = page.locator(sel_bid).first
                try:
                    if await bl.count() > 0:
                        await bl.fill(bid_s, timeout=12_000)
                except Exception as exc:
                    log.warning("adapter.apply_bid_fill_failed", site_id=sid, error=str(exc))

        dur_s = proposal_duration.strip() if isinstance(proposal_duration, str) else ""
        if dur_s:
            sel_dur = (
                self.selectors.get("proposal_duration_input", "").strip()
                or self.selectors.get("proposal_duration_select", "").strip()
            )
            if sel_dur:
                dl = page.locator(sel_dur).first
                try:
                    if await dl.count() > 0:
                        tag = await dl.evaluate("e => e && e.tagName ? e.tagName : ''")
                        if isinstance(tag, str) and tag.upper() == "SELECT":
                            try:
                                await dl.select_option(label=dur_s, timeout=8_000)
                            except Exception:
                                await dl.select_option(value=dur_s, timeout=8_000)
                        else:
                            await dl.fill(dur_s, timeout=12_000)
                except Exception as exc:
                    log.warning("adapter.apply_duration_fill_failed", site_id=sid, error=str(exc))

        fee_s = proposal_fee_percent.strip() if isinstance(proposal_fee_percent, str) else ""
        if fee_s:
            sel_fee = self.selectors.get("proposal_fee_input", "").strip()
            if sel_fee:
                fl = page.locator(sel_fee).first
                try:
                    if await fl.count() > 0:
                        await fl.fill(fee_s, timeout=12_000)
                except Exception as exc:
                    log.warning("adapter.apply_fee_fill_failed", site_id=sid, error=str(exc))

        auto_submit = os.environ.get("GHOST_APPLY_AUTO_SUBMIT", "").strip().lower() in (
            "1",
            "true",
            "yes",
            "on",
        )
        do_submit = bool(submit_proposal) or auto_submit
        if do_submit:
            from ghost_engine.adapters import captcha_detect

            await self.check_for_captcha(page)
            extra_cf: list[str] = []
            raw_cf = self.selectors.get("cloudflare_turnstile_click")
            if isinstance(raw_cf, str) and raw_cf.strip():
                extra_cf.append(raw_cf.strip())
            elif isinstance(raw_cf, list):
                for x in raw_cf:
                    if isinstance(x, str) and x.strip():
                        extra_cf.append(x.strip())
            clicked = await captcha_detect.try_click_cloudflare_turnstile_checkbox(page, extra_cf)
            if clicked:
                log.info("adapter.apply_cloudflare_checkbox_attempted", site_id=sid)
            sub_sel = self.selectors.get("proposal_submit_button", "").strip()
            if sub_sel:
                btn = page.locator(sub_sel).first
                try:
                    if await btn.count() > 0:
                        await human_behavior.human_click(btn, humanize=humanize, timeout_ms=18_000)
                        log.info("adapter.apply_submit_clicked", site_id=sid, job_id=job_id.strip())
                except Exception as exc:
                    log.warning("adapter.apply_submit_failed", site_id=sid, error=str(exc))
            else:
                log.warning("adapter.apply_submit_no_selector", site_id=sid)
            ret_feed = os.environ.get("GHOST_APPLY_RETURN_TO_FEED", "").strip().lower() in (
                "1",
                "true",
                "yes",
                "on",
            )
            if ret_feed:
                nav_sel = self.selectors.get("nav_home_or_feed_button", "").strip()
                if nav_sel:
                    try:
                        nav = page.locator(nav_sel).first
                        if await nav.count() > 0:
                            await human_behavior.human_click(
                                nav, humanize=humanize, timeout_ms=16_000
                            )
                            await page.wait_for_load_state("domcontentloaded", timeout=25_000)
                            await human_behavior.after_navigation_settle(
                                page,
                                humanize=humanize,
                                ready_selector=self.page_ready_selector,
                            )
                            log.info("adapter.apply_returned_to_feed", site_id=sid)
                    except Exception as exc:
                        log.warning(
                            "adapter.apply_nav_home_failed",
                            site_id=sid,
                            error=str(exc),
                        )
        else:
            log.info(
                "adapter.apply_submit_skipped",
                site_id=sid,
                job_id=job_id.strip(),
                hint="set submit_proposal or GHOST_APPLY_AUTO_SUBMIT=1",
            )
