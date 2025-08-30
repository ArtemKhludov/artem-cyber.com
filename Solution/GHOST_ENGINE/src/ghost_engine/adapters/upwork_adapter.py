"""Upwork adapter"""

import asyncio
import base64
import os
import random
import re
import time as time_module
from collections import OrderedDict, deque
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from playwright.async_api import Page

from ghost_engine.browser.feed_policy import (
    feed_after_load_scroll_rounds,
    feed_duplicate_load_streak_need,
    feed_empty_fresh_retries,
    feed_load_more_click_backoff_ms_max,
    feed_load_more_click_backoff_ms_min,
    feed_load_more_click_retries,
    feed_max_posted_age_days,
    feed_no_interest_gentle_passes_max,
    feed_no_interest_gentle_passes_min,
    feed_no_interest_gentle_scroll_enabled,
    feed_redis_seen_wall_min_ratio,
    feed_stealth_fast,
    feed_stealth_max_load_more,
)
from ghost_engine.browser.upwork_feed_loop import (
    collect_feed_dom_locator_counts,
    collect_ordered_job_cores_from_links,
    feed_seen_redis_key,
    persist_seen_to_redis,
    wait_for_feed_job_anchors_post_load,
)

from ghost_engine.adapters.base_adapter import BaseSiteAdapter, _registry_record_job_event
from ghost_engine.scoring.feed_reading import FeedReadingConfig
from ghost_engine.adapters.graphql_sniff import attach_graphql_sniffers
from ghost_engine.adapters.upwork_graphql_parser import (
    index_posted_at_by_core_from_graphql_snippets,
    try_parse_inbox_unread_count,
)
from ghost_engine.browser import messages_nav
from ghost_engine.browser.upwork_feed_dom import scroll_to_job_on_feed
from ghost_engine.utils.logger import get_logger

log = get_logger(__name__)

_LAST_FEED_DOM_SCREENSHOT_MONO: float = 0.0
_REPO_ROOT_UPWORK = Path(__file__).resolve().parents[3]


async def _maybe_screenshot_feed_dom_debug(page: Page, *, url_preview: str) -> None:
    if os.getenv("GHOST_DEBUG_SCREENSHOT_ON_FEED_DOM", "").strip().lower() not in (
        "1",
        "true",
        "yes",
    ):
        return
    global _LAST_FEED_DOM_SCREENSHOT_MONO
    try:
        gap = float(os.getenv("GHOST_DEBUG_SCREENSHOT_FEED_DOM_MIN_SEC", "120"))
    except ValueError:
        gap = 120.0
    now_m = time_module.monotonic()
    if now_m - _LAST_FEED_DOM_SCREENSHOT_MONO < gap:
        return
    _LAST_FEED_DOM_SCREENSHOT_MONO = now_m
    try:
        png = await page.screenshot(type="png", full_page=False)
    except Exception as exc:
        log.warning("upwork.feed_dom_screenshot_failed", error=str(exc))
        return
    rid = (os.environ.get("GHOST_RUN_ID") or "").strip()
    out_dir = (
        (_REPO_ROOT_UPWORK / "logs" / "runs" / rid)
        if rid
        else (_REPO_ROOT_UPWORK / "logs" / "debug")
    )
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"feed_no_job_dom_{int(time_module.time())}.png"
    path.write_bytes(png)
    log.info("upwork.feed_dom_screenshot_saved", path=str(path))
    if os.getenv("GHOST_DEBUG_SCREENSHOT_ON_FEED_DOM_TELEGRAM", "").strip().lower() in (
        "1",
        "true",
        "yes",
    ):
        from ghost_engine.telegram import operator_alert

        cap = f"feed_no_job_dom url={url_preview[:200]}"
        try:
            await operator_alert.send_operator_photo_alert(
                photo_png=png, caption=cap, ops_topic="errors"
            )
        except Exception as exc:
            log.warning("upwork.feed_dom_screenshot_telegram_failed", error=str(exc))


def _ops_ai_diag_enabled() -> bool:
    v = os.environ.get("GHOST_OPS_AI_DIAG_ENABLED", "1").strip().lower()
    return v not in ("0", "false", "no", "off")


async def _ops_ai_diag_try_image_b64(page: Page) -> str | None:
    """PNG viewport as base64 for local Ollama vision only (not sent to Gemini API)."""
    if os.getenv("GHOST_OPS_AI_DIAG_IMAGE", "1").strip().lower() not in (
        "1",
        "true",
        "yes",
    ):
        return None
    try:
        max_b = int(os.environ.get("GHOST_OPS_AI_DIAG_IMAGE_MAX_BYTES", "750000"))
    except ValueError:
        max_b = 750_000
    try:
        png = await page.screenshot(type="png", full_page=False)
    except Exception as exc:
        log.debug("upwork.ops_ai_diag_screenshot_skipped", error=str(exc))
        return None
    if len(png) > max_b:
        log.debug(
            "upwork.ops_ai_diag_screenshot_too_large",
            bytes=len(png),
            max_bytes=max_b,
        )
        return None
    return base64.standard_b64encode(png).decode("ascii")


def _schedule_ops_feed_diagnosis(
    site_id: str,
    incident: str,
    context: dict[str, Any],
    *,
    image_base64: str | None = None,
) -> None:
    if not _ops_ai_diag_enabled():
        return
    from ghost_engine.ops.ops_ai_diag import schedule_ops_llm_diagnosis

    schedule_ops_llm_diagnosis(
        incident=incident,
        context=context,
        site_id=site_id,
        ops_topic="errors",
        image_base64=image_base64,
    )


_DEFAULT_MESSAGES_FALLBACK_URL = "https://www.upwork.com/messages/main"


def _posted_age_days_utc(iso_s: str) -> float | None:
    try:
        s = iso_s.strip().replace("Z", "+00:00")
        dt = datetime.fromisoformat(s)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        else:
            dt = dt.astimezone(timezone.utc)
        return (datetime.now(timezone.utc) - dt).total_seconds() / 86400.0
    except Exception:
        return None


def _fresh_temporal_wall(
    fresh: frozenset[str],
    posted_by_core: dict[str, str],
    max_age_days: float,
) -> bool:
    """True only if every core in ``fresh`` has posted_at and each is older than ``max_age_days``."""
    if max_age_days <= 0.0 or not fresh:
        return False
    for core in fresh:
        pa = posted_by_core.get(core)
        if not pa:
            return False
        age = _posted_age_days_utc(pa)
        if age is None or age <= max_age_days:
            return False
    return True


async def _redis_smembers_job_cores(redis: Any, key: str) -> set[str]:
    if redis is None:
        return set()
    try:
        raw = await redis.smembers(key)
    except Exception:
        return set()
    out: set[str] = set()
    for m in raw or []:
        if isinstance(m, bytes):
            out.add(m.decode("utf-8", errors="replace"))
        elif isinstance(m, str):
            out.add(m)
    return out


def _ordered_unique_cores(ordered: list[str]) -> list[str]:
    out: list[str] = []
    seen: set[str] = set()
    for x in ordered:
        s = x.strip()
        if not s or s in seen:
            continue
        seen.add(s)
        out.append(s)
    return out


def _sanitize_upwork_messages_inbox_url(raw: str) -> str | None:
    """https only, upwork host, path must reference messages (inbox deep link)."""
    u = raw.strip().split("#", 1)[0].strip()
    if not u.startswith("https://"):
        return None
    p = urlparse(u)
    host = (p.hostname or "").lower()
    if not host:
        return None
    if host != "upwork.com" and not host.endswith(".upwork.com"):
        return None
    path = (p.path or "").lower()
    if "/messages" not in path:
        return None
    return u


class UpworkAdapter(BaseSiteAdapter):
    def __init__(self, site_yaml: Path) -> None:
        super().__init__(site_yaml)
        self._dev_graphql_snippets: deque[dict[str, Any]] = deque(maxlen=50)
        # Queue of job_ids that passed scoring and need "human reading" on page.
        self.pending_jobs_to_read: deque[str] = deque(maxlen=20)
        self._feed_load_more_zero_streak: int = 0
        self._feed_job_card_miss_streak: int = 0
        self._insufficient_signal_streak: int = 0
        self._visible_feed_job_cores: deque[str] = deque(maxlen=400)
        self._recent_scoring_snapshots: deque[dict[str, Any]] = deque(maxlen=48)
        self._feed_stealth_load_more_count: int = 0
        self._feed_no_job_dom_streak: int = 0
        self._feed_empty_load_streak: int = 0
        self._gql_unread_count: int | None = None
        self._gql_unread_bumped: bool = False
        # Feed humanization: map ciphertext core (no ~) -> last GRI from sniff path.
        self._feed_gri_by_core: OrderedDict[str, float] = OrderedDict()
        self._feed_title_by_core: OrderedDict[str, str] = OrderedDict()
        self._feed_saved_cores: set[str] = set()
        # Two-phase notify: feed GraphQL → flush opens detail URL → detail GraphQL → cover + Telegram
        self._jobs_awaiting_detail_notify: set[str] = set()
        self._jobs_detail_goto_done: set[str] = set()
        self._defer_dom_detail_both_warned: bool = False

    def abandon_detail_notify_defer(self, job_id: str) -> None:
        """Drop two-phase state when scoring ends without notify (trash, L0, timeout, etc.)."""
        j = (job_id or "").strip()
        if not j or j == "?":
            return
        self._jobs_awaiting_detail_notify.discard(j)
        self._jobs_detail_goto_done.discard(j)

    def clear_detail_notify_after_enqueue(self, job_id: str) -> None:
        j = (job_id or "").strip()
        if not j:
            return
        self._jobs_awaiting_detail_notify.discard(j)
        self._jobs_detail_goto_done.discard(j)

    def mark_detail_notify_goto_done(self, job_id: str) -> None:
        j = (job_id or "").strip()
        if j:
            self._jobs_detail_goto_done.add(j)

    def should_enqueue_pending_job_read(
        self,
        job_id: str,
        gri_f: float | None,
        fr: FeedReadingConfig,
    ) -> bool:
        """Skip re-queuing flush while we are on the job detail pass (post-goto)."""
        if not fr.enabled or not job_id or job_id == "?":
            return False
        if gri_f is not None and gri_f < fr.save_min_gri:
            return False
        if job_id in self._jobs_detail_goto_done:
            return False
        return True

    async def defer_notify_until_job_detail_if_needed(
        self,
        final: dict[str, Any],
        gri_f: float | None,
        jid: str,
        sid: str,
        artifact_relpath: str | None,
        sig: dict[str, Any] | None,
    ) -> bool:
        """
        When True, skip cover + Telegram until job detail page is opened and scored again.

        Order vs defer_dom: defer_dom runs first in base_adapter; if it queues, this is not reached.
        """
        from ghost_engine.notify.dom_notify_policy import should_defer_upwork_notify_for_dom_url
        from ghost_engine.scoring.engine import ScoringEngine
        from ghost_engine.scoring.feed_reading import feed_reading_from_scoring_root

        if (sid or "").strip().lower() != "upwork":
            return False

        eng = ScoringEngine()
        fr = feed_reading_from_scoring_root(eng.scoring_root)
        if not fr.defer_notify_until_job_detail:
            return False
        if not fr.enabled:
            return False
        if gri_f is None or gri_f < fr.save_min_gri:
            return False
        if not jid or jid == "?":
            return False

        if fr.defer_notify_until_job_detail and should_defer_upwork_notify_for_dom_url():
            if not self._defer_dom_detail_both_warned:
                self._defer_dom_detail_both_warned = True
                log.warning(
                    "notify.defer_detail_and_defer_dom_both_enabled",
                    hint="defer_dom runs first; pending_dom worker may race the same Page — disable one",
                )

        if jid in self._jobs_detail_goto_done:
            return False

        if jid in self._jobs_awaiting_detail_notify:
            log.debug("job.defer_detail_duplicate_feed_sniff", job_id=jid, site_id=sid)
            return True

        self._jobs_awaiting_detail_notify.add(jid)
        if jid not in self.pending_jobs_to_read:
            self.pending_jobs_to_read.append(jid)
        log.info("job.defer_detail_notify_queued", job_id=jid, site_id=sid, gri=gri_f)
        await _registry_record_job_event(
            sid,
            jid,
            "defer_detail_notify",
            gri=gri_f,
            job_tier=str(final.get("job_tier")) if final.get("job_tier") is not None else None,
            l0_code=str(final.get("l0_code") or ""),
            artifact_relpath=artifact_relpath,
            sig=sig,
        )
        return True

    async def handle_insufficient_signal(self, data: dict[str, Any]) -> None:
        """Trigger AI diagnostics if we see a long streak of empty signals."""
        self._insufficient_signal_streak += 1
        threshold = int(os.environ.get("GHOST_AI_DIAG_THRESHOLD", "10"))
        if self._insufficient_signal_streak >= threshold:
            log.warning(
                "upwork.insufficient_signal_streak_hit",
                count=self._insufficient_signal_streak,
                ops_event="insufficient_signal_streak_hit",
                dashboard_hint="GraphQL→signal path; compare with last AI suggestion",
            )
            from ghost_engine.browser.emergency_parsing import ask_ai_for_parsing_fix
            
            # Reset streak after diagnostic call
            self._insufficient_signal_streak = 0
            
            # Fire and forget: do not await LLM diagnostic in the main loop
            async def run_diag_background():
                try:
                    fix = await ask_ai_for_parsing_fix(
                        data, 
                        self.site_id, 
                        "INSUFFICIENT_SIGNAL",
                        "upwork_graphql_parser.py: search in jobPubDetails, opening, jobs, setSearch"
                    )
                    if fix:
                        log.warning(
                            "upwork.ai_fix_suggestion_alert",
                            suggestion=fix[:1000],
                            ops_event="ai_parsing_suggestion",
                            dashboard_hint="truncate idempotency key in external dashboard",
                        )
                        # --- NEW: Send to Telegram ---
                        from ghost_engine.telegram.operator_alert import send_operator_alert
                        await send_operator_alert(
                            f"🤖 *Local LLM Diagnostic Report*\n\n"
                            f"Site: `{self.site_id}`\n"
                            f"Issue: `INSUFFICIENT_SIGNAL` (10+ streak)\n\n"
                            f"💡 *Suggestion:*\n{fix[:3000]}"
                        )
                except Exception as e:
                    log.error("upwork.ai_diag_background_failed", error=str(e))
            
            asyncio.create_task(run_diag_background())
        else:
            log.debug("upwork.insufficient_signal_accumulated", streak=self._insufficient_signal_streak)

    def reset_insufficient_signal_streak(self) -> None:
        self._insufficient_signal_streak = 0

    def reset_stealth_feed_cycle(self) -> None:
        """Reset Load More counter and empty-load streak at the start of a stealth feed sortie."""
        self._feed_stealth_load_more_count = 0
        self._feed_empty_load_streak = 0
        self._sniff_normalized_job_cores.clear()

    async def _stealth_feed_humanize_round(
        self,
        page: Page,
        *,
        humanize: bool,
        eff_humanize: bool,
    ) -> None:
        from ghost_engine.browser.upwork_feed_humanize import (
            apply_feed_inter_round_pause,
            linger_feed_cards_for_gri,
        )

        if humanize:
            await linger_feed_cards_for_gri(page, self, humanize=True)
        await apply_feed_inter_round_pause(humanize=bool(humanize), eff_humanize=eff_humanize)

    def note_feed_job_card_selector_miss(self) -> None:
        """Increment health counter when ``feed_job_card`` matched no nodes during a full scroll."""
        self._feed_job_card_miss_streak += 1
        if self._feed_job_card_miss_streak >= 5:
            log.warning(
                "upwork.feed_job_card_selector_health",
                zero_streak=self._feed_job_card_miss_streak,
                hint="Check feed_job_card in config/sites/upwork.yaml",
            )

    def reset_feed_job_card_miss_streak(self) -> None:
        self._feed_job_card_miss_streak = 0

    def after_gri_scored(self, final: dict[str, Any]) -> None:
        """Update feed humanization cache for every L0-pass + GRI job (before notify gate)."""
        sig = final.get("job_signal")
        jid = ""
        if isinstance(sig, dict):
            jid = str(sig.get("job_id") or "").strip()
        gri_raw = final.get("gri")
        gri_f = float(gri_raw) if isinstance(gri_raw, (int, float)) else None
        core = jid.strip().lstrip("~")
        if core and gri_f is not None:
            self._feed_gri_by_core[core] = gri_f
            self._feed_gri_by_core.move_to_end(core)
            while len(self._feed_gri_by_core) > 800:
                self._feed_gri_by_core.popitem(last=False)
        if isinstance(sig, dict) and core:
            t = sig.get("title")
            if isinstance(t, str) and t.strip():
                self._feed_title_by_core[core] = t.strip()[:500]
                self._feed_title_by_core.move_to_end(core)
                while len(self._feed_title_by_core) > 800:
                    self._feed_title_by_core.popitem(last=False)

    def record_scoring_final_snapshot(self, final: dict[str, Any]) -> None:
        """Ring buffer for last scoring results (feed orchestration / debugging)."""
        sig = final.get("job_signal")
        jid = ""
        if isinstance(sig, dict):
            jid = str(sig.get("job_id") or "").strip()
        gri_raw = final.get("gri")
        gri_f = float(gri_raw) if isinstance(gri_raw, (int, float)) else None
        tier = final.get("job_tier")
        self._recent_scoring_snapshots.append(
            {"job_id": jid, "gri": gri_f, "job_tier": tier},
        )

    def feed_gri_for_core(self, core: str) -> float | None:
        """Last known GRI for job ciphertext core (DOM ``data-item-key`` without leading ~)."""
        c = core.strip().lstrip("~")
        if not c:
            return None
        v = self._feed_gri_by_core.get(c)
        return float(v) if isinstance(v, (int, float)) else None

    def _all_visible_cores_known_below_linger(
        self, cores: frozenset[str], linger_min_gri: float
    ) -> bool:
        """
        Every visible core has a cached GRI and all are below ``linger_min_gri``.

        Unknown GRI → False (keep aggressive bottom scroll so virtualized tiles can mount).
        """
        if not cores:
            return False
        floor = float(linger_min_gri)
        for raw in cores:
            c = raw.strip().lstrip("~")
            if not c:
                continue
            g = self.feed_gri_for_core(c)
            if g is None:
                return False
            if g >= floor:
                return False
        return True

    async def try_save_job_on_feed_tile(
        self,
        page: Page,
        core: str,
        *,
        humanize: bool,
        gri: float,
    ) -> bool:
        """
        Click save/heart inside a find-work tile (no navigation to job detail).

        Requires ``selectors.save_job_feed_tile_button`` or ``save_job_button`` in site YAML.
        """
        from ghost_engine.browser import human_behavior
        from ghost_engine.browser.feed_liked_log import append_upwork_feed_liked

        sid = (self.site_id or "unknown").strip()
        c = core.strip().lstrip("~")
        if not c:
            return False
        if c in self._feed_saved_cores:
            return False
        inner = (self.selectors.get("save_job_feed_tile_button") or "").strip() or (
            self.selectors.get("save_job_button") or ""
        ).strip()
        if not inner:
            log.warning("upwork.save_feed_tile_no_selector", site_id=sid)
            return False
        for attr in (f"~{c}", c):
            root = page.locator(f'article[data-item-key="{attr}"]')
            try:
                if await root.count() == 0:
                    continue
            except Exception:
                continue
            btn = root.first.locator(inner).first
            try:
                if await btn.count() == 0:
                    continue
            except Exception:
                continue
            try:
                await root.first.scroll_into_view_if_needed(timeout=8_000)
                await human_behavior.human_click(btn, humanize=humanize, timeout_ms=12_000)
            except Exception as exc:
                log.warning("upwork.save_feed_tile_click_failed", core=c, error=str(exc))
                return False
            self._feed_saved_cores.add(c)
            title = self._feed_title_by_core.get(c)
            try:
                await asyncio.to_thread(
                    append_upwork_feed_liked,
                    ciphertext_core=c,
                    gri=float(gri),
                    title=title,
                )
            except Exception as exc:
                log.warning("upwork.save_feed_tile_jsonl_failed", error=str(exc))
            log.info(
                "upwork.feed_card_saved",
                site_id=sid,
                job_core=c,
                gri=round(float(gri), 4),
            )
            return True
        return False

    def job_core_visible(self, job_id: str) -> bool:
        core = job_id.strip().lstrip("~")
        return bool(core) and core in self._visible_feed_job_cores

    async def update_visible_feed_job_cores_from_page(self, page: Page) -> None:
        ordered = await collect_ordered_job_cores_from_links(page)
        u = _ordered_unique_cores(ordered)
        if len(u) > 400:
            u = u[-400:]
        self._visible_feed_job_cores.clear()
        for x in u:
            self._visible_feed_job_cores.append(x)
        if os.environ.get("GHOST_FEED_DOM_GRAPHQL_GAP_LOG", "").strip().lower() in (
            "1",
            "true",
            "yes",
        ):
            vis = frozenset(self._visible_feed_job_cores)
            sniffed = getattr(self, "_sniff_normalized_job_cores", frozenset())
            dom_only = sorted(vis - sniffed)
            if dom_only:
                log.info(
                    "feed.dom_without_normalize_match",
                    site_id=self.site_id,
                    visible_count=len(vis),
                    sniffed_cores_tracked=len(sniffed),
                    dom_only_count=len(dom_only),
                    dom_only_sample=dom_only[:24],
                    hint=(
                        "DOM shows job links/cores not yet seen in normalize_job_signals this sortie; "
                        "causes: virtualized list without fresh GraphQL, SSR-only tiles, non-v1 GraphQL "
                        "shape, or responses not matched by sniffer"
                    ),
                )

    async def save_graphql_sniff_payload(self, data: dict[str, Any]) -> None:
        from ghost_engine.adapters.upwork_graphql_parser import try_parse_chat_messages
        
        # 1. Unread count check
        n = try_parse_inbox_unread_count(data)
        if isinstance(n, int) and n >= 0:
            old = self._gql_unread_count
            self._gql_unread_count = n
            self._gql_unread_bumped = old is not None and n > old
            if self._gql_unread_bumped:
                log.info("upwork.gql_unread_increase", previous=old, current=n)
        
        # 2. Chat messages check
        msgs = try_parse_chat_messages(data)
        if msgs:
            log.info("upwork.chat_messages_sniffed", count=len(msgs))
            from ghost_engine.config.settings import get_settings
            from ghost_engine.notify.redis_queue import enqueue_notify_job_async
            from ghost_engine.notify.contract import ApprovedJobNotifyPayload
            
            settings = get_settings()
            for m in msgs:
                # Mirroring chat message as a 'job notify' payload with a special tag
                payload = ApprovedJobNotifyPayload(
                    job_id=m["thread_id"], # Reusing job_id as thread_id for routing
                    site_id=self.site_id,
                    l1_score=100,
                    job_signal={
                        "title": f"Chat with {m['sender_name']}",
                        "description": m["text"],
                        "thread_id": m["thread_id"]
                    },
                    opsec={"source": "chat_sniff"},
                    needs_manual_review=False,
                    notify_source="chat_sniff",
                    job_tags=["CHAT_MESSAGE"],
                    job_public_url=f"https://www.upwork.com/messages/main/threads/{m['thread_id']}"
                )
                await enqueue_notify_job_async(settings.redis_url, payload)

        await super().save_graphql_sniff_payload(data)

    async def poll_inbox(self) -> list[dict[str, Any]]:
        return []

    async def intercept_network(self, page: Page) -> None:
        attach_graphql_sniffers(
            page,
            site_id=self.site_id,
            jobs_graphql_url=self.jobs_graphql_url,
            snippets=self._dev_graphql_snippets,
            log_prefix="upwork",
            save_to_disc_callbacks=(self.save_graphql_sniff_payload,),
        )

    async def scroll_to_job(self, page: Page, job_id: str, *, humanize: bool = True) -> bool:
        """
        Scroll find-work until the job card/link is visible; short human glance (no navigation).
        """
        return await scroll_to_job_on_feed(self, page, job_id, humanize=humanize)

    async def maybe_random_glance(self, page: Page, *, humanize: bool = True) -> None:
        """
        Entropy layer: occasionally pick a random visible job and 'glance' at it (micro-scroll).
        Mimics a human scanning the feed before deciding to load more.
        """
        if not humanize or not self._visible_feed_job_cores:
            return

        # 10-15% chance to glance at a random job
        if random.random() > 0.15:
            return

        job_id = random.choice(list(self._visible_feed_job_cores))
        log.info("upwork.random_glance", job_id=job_id)
        
        selector = f'article[data-item-key="{job_id}"]'
        tile = page.locator(selector)
        try:
            if await tile.count() > 0:
                # Use light scroll to job tile (not full reading simulation)
                await tile.first.scroll_into_view_if_needed()
                await asyncio.sleep(random.uniform(1.2, 3.5))
        except Exception:
            pass

    async def _collect_fresh_after_load_more(
        self,
        page: Page,
        before_ids: frozenset[str],
        *,
        eff_humanize: bool,
    ) -> tuple[frozenset[str], frozenset[str]]:
        """Scroll down, wait, recollect job ids until ``fresh`` non-empty or retries end."""
        from ghost_engine.browser import human_behavior
        from ghost_engine.scoring.engine import ScoringEngine
        from ghost_engine.scoring.feed_reading import feed_reading_from_scoring_root

        scroll_rounds = feed_after_load_scroll_rounds()
        n_extra = feed_empty_fresh_retries()
        total_passes = 1 + max(0, n_extra)
        fr = feed_reading_from_scoring_root(ScoringEngine().scoring_root)
        linger_min = float(fr.linger_min_gri)
        after_ids: frozenset[str] = frozenset()
        for attempt in range(total_passes):
            ids_for_decision = (
                after_ids if attempt > 0 and after_ids else before_ids
            )
            use_gentle = (
                eff_humanize
                and feed_no_interest_gentle_scroll_enabled()
                and fr.enabled
                and len(ids_for_decision) > 0
                and self._all_visible_cores_known_below_linger(
                    ids_for_decision, linger_min
                )
            )
            if use_gentle:
                n_pass = random.randint(
                    feed_no_interest_gentle_passes_min(),
                    feed_no_interest_gentle_passes_max(),
                )
                await human_behavior.gentle_feed_scroll_exploration(
                    page,
                    humanize=True,
                    passes=n_pass,
                )
            elif attempt == 0:
                await human_behavior.scroll_toward_feed_bottom(
                    page,
                    humanize=eff_humanize,
                    rounds=scroll_rounds,
                )
            else:
                await human_behavior.scroll_toward_feed_bottom(
                    page,
                    humanize=eff_humanize,
                    rounds=max(3, scroll_rounds // 2),
                )
                await human_behavior.chaos_sleep_ms(450, 1400)
            if use_gentle and attempt > 0:
                await human_behavior.chaos_sleep_ms(280, 900)
            await wait_for_feed_job_anchors_post_load(page, humanize=eff_humanize)
            await self.update_visible_feed_job_cores_from_page(page)
            after_ids = frozenset(self._visible_feed_job_cores)
            fresh = after_ids - before_ids
            if fresh:
                return after_ids, fresh
        return after_ids, after_ids - before_ids

    async def drive_feed(
        self,
        page: Page,
        *,
        humanize: bool = True,
        redis_client: Any | None = None,
        profile_name: str = "default",
    ) -> bool:
        """
        Human-like feed: one ``Load More`` click when possible, then bottom scroll + id recollect.

        Returns ``False`` when the stealth cycle should stop (cap, no button, duplicate empty
        streak, temporal wall, optional Redis seen wall). Returns ``True`` to continue.
        """
        max_lm = feed_stealth_max_load_more()
        if self._feed_stealth_load_more_count >= max_lm:
            log.info(
                "upwork.feed_stealth_cap",
                load_more_count=self._feed_stealth_load_more_count,
                max_per_cycle=max_lm,
                feed_stop_reason="stealth_cap",
                ops_event="feed_stealth_stop",
            )
            return False

        from ghost_engine.browser import human_behavior
        from ghost_engine.scoring.engine import ScoringEngine
        from ghost_engine.scoring.feed_reading import feed_reading_from_scoring_root

        fast = feed_stealth_fast()
        eff_humanize = humanize and not fast
        seen_key = feed_seen_redis_key(self.site_id, profile_name)
        streak_need = feed_duplicate_load_streak_need()
        max_age_days = feed_max_posted_age_days()
        redis_wall_ratio = feed_redis_seen_wall_min_ratio()

        await self.update_visible_feed_job_cores_from_page(page)
        if eff_humanize:
            await self.maybe_random_glance(page, humanize=True)

        before_ids = frozenset(self._visible_feed_job_cores)
        if before_ids:
            self._feed_no_job_dom_streak = 0

        fr_pre = feed_reading_from_scoring_root(ScoringEngine().scoring_root)
        if eff_humanize:
            if (
                feed_no_interest_gentle_scroll_enabled()
                and fr_pre.enabled
                and before_ids
                and self._all_visible_cores_known_below_linger(
                    before_ids, float(fr_pre.linger_min_gri)
                )
            ):
                n_pre = random.randint(
                    feed_no_interest_gentle_passes_min(),
                    feed_no_interest_gentle_passes_max(),
                )
                await human_behavior.gentle_feed_scroll_exploration(
                    page, humanize=True, passes=n_pre
                )
            else:
                await human_behavior.random_scroll(page, px_min=200, px_max=600)
                await asyncio.sleep(random.uniform(0.8, 2.4))
        elif humanize and fast:
            await human_behavior.chaos_sleep_ms(200, 550)

        load_more_selector = self.load_more_button_selector or 'button[data-test="load-more-button"]'
        btn = page.locator(load_more_selector)
        retries = feed_load_more_click_retries()
        total_attempts = 1 + max(0, retries)
        last_exc: str | None = None
        for attempt in range(total_attempts):
            try:
                cnt = await btn.count()
                if cnt == 0:
                    if attempt + 1 < total_attempts:
                        await human_behavior.chaos_sleep_ms(
                            feed_load_more_click_backoff_ms_min(),
                            feed_load_more_click_backoff_ms_max(),
                        )
                        continue
                    self._feed_load_more_zero_streak += 1
                    self._feed_empty_load_streak = 0
                    if self._feed_load_more_zero_streak >= 5:
                        log.warning(
                            "upwork.feed_selector_health",
                            selector_preview=load_more_selector[:80],
                            zero_streak=self._feed_load_more_zero_streak,
                            hint="Check load_more_button in YAML / Upwork DOM",
                        )
                    log.info(
                        "upwork.feed_stealth_stop",
                        reason="load_more_not_found",
                        feed_stop_reason="load_more_not_found",
                        attempt=attempt + 1,
                        attempts=total_attempts,
                        ops_event="feed_stealth_stop",
                    )
                    return False
                self._feed_load_more_zero_streak = 0

                log.info("upwork.feed_load_more_visible", attempt=attempt + 1)
                if eff_humanize:
                    await human_behavior.human_click(btn, humanize=True)
                else:
                    await btn.first.click(timeout=15_000)
                log.info("upwork.feed_load_more_clicked", attempt=attempt + 1)
                if eff_humanize:
                    await asyncio.sleep(random.uniform(2.0, 4.0))
                else:
                    await asyncio.sleep(random.uniform(0.9, 1.7))
                await human_behavior.after_navigation_settle(
                    page,
                    humanize=eff_humanize,
                    ready_selector="",
                )

                after_ids, fresh = await self._collect_fresh_after_load_more(
                    page,
                    before_ids,
                    eff_humanize=eff_humanize,
                )

                if before_ids and not after_ids:
                    log.info(
                        "upwork.feed_remount_after_empty_bottom_viewport",
                        before=len(before_ids),
                        hint="Virtualized feed often unmounts tiles at End; scroll to top and recollect",
                        ops_event="feed_viewport_remount",
                    )
                    await human_behavior.scroll_to_top(page, humanize=eff_humanize)
                    await wait_for_feed_job_anchors_post_load(page, humanize=eff_humanize)
                    await human_behavior.chaos_sleep_ms(700, 2200)
                    await self.update_visible_feed_job_cores_from_page(page)
                    after_ids = frozenset(self._visible_feed_job_cores)
                    fresh = after_ids - before_ids

                if not after_ids and not before_ids:
                    for snap_try in range(3):
                        await human_behavior.chaos_sleep_ms(1800, 4200)
                        await wait_for_feed_job_anchors_post_load(page, humanize=eff_humanize)
                        await self.update_visible_feed_job_cores_from_page(page)
                        after_ids = frozenset(self._visible_feed_job_cores)
                        fresh = after_ids - before_ids
                        if after_ids:
                            log.info(
                                "upwork.feed_dom_ids_recovered_after_wait",
                                attempt=snap_try + 1,
                                count=len(after_ids),
                            )
                            break
                    if not after_ids:
                        dom_counts = await collect_feed_dom_locator_counts(page)
                        url_preview = ""
                        try:
                            url_preview = (page.url or "")[:160]
                        except Exception:
                            pass
                        self._feed_no_job_dom_streak += 1
                        log.warning(
                            "upwork.feed_no_job_dom_ids",
                            feed_stop_reason="no_job_links_in_dom",
                            load_more_count=self._feed_stealth_load_more_count + 1,
                            ops_event="feed_stealth_stop",
                            dom_locator_counts=dom_counts,
                            page_url_preview=url_preview,
                            feed_no_job_dom_streak=self._feed_no_job_dom_streak,
                            hint="No job hrefs or data-item-key tiles after Load More; check DOM or filters",
                        )
                        img_b64 = await _ops_ai_diag_try_image_b64(page)
                        _schedule_ops_feed_diagnosis(
                            self.site_id,
                            "upwork.feed_no_job_dom_ids",
                            {
                                "feed_stop_reason": "no_job_links_in_dom",
                                "dom_locator_counts": dict(dom_counts),
                                "page_url_preview": url_preview,
                                "load_more_count": self._feed_stealth_load_more_count + 1,
                                "feed_no_job_dom_streak": self._feed_no_job_dom_streak,
                            },
                            image_base64=img_b64,
                        )
                        await _maybe_screenshot_feed_dom_debug(page, url_preview=url_preview)
                        try:
                            thr = int(os.environ.get("GHOST_FEED_DOM_EMPTY_STREAK_TELEGRAM_THRESHOLD", "0"))
                        except ValueError:
                            thr = 0
                        if thr > 0 and self._feed_no_job_dom_streak >= thr:
                            streak_at_alert = self._feed_no_job_dom_streak
                            counts_snapshot = dict(dom_counts)
                            self._feed_no_job_dom_streak = 0

                            async def _alert_feed_dom() -> None:
                                try:
                                    from ghost_engine.telegram.operator_alert import (
                                        send_operator_text_alert,
                                    )

                                    await send_operator_text_alert(
                                        text=(
                                            f"GHOST: `{self.site_id}` feed_no_job_dom_ids reached "
                                            f"{streak_at_alert} consecutive events "
                                            f"(threshold={thr}). DOM/hydration or selectors likely broken. "
                                            f"url={url_preview!r} counts={counts_snapshot!r}"
                                        ),
                                        ops_topic="errors",
                                    )
                                except Exception as exc:
                                    log.warning(
                                        "upwork.feed_dom_streak_telegram_failed",
                                        error=str(exc),
                                    )

                            asyncio.create_task(_alert_feed_dom())
                        self._feed_stealth_load_more_count += 1
                        return False

                self._feed_stealth_load_more_count += 1

                if not fresh:
                    if (
                        redis_wall_ratio > 0.0
                        and redis_client is not None
                        and after_ids
                    ):
                        rseen = await _redis_smembers_job_cores(redis_client, seen_key)
                        ratio = len(after_ids & rseen) / max(len(after_ids), 1)
                        if ratio >= redis_wall_ratio:
                            await human_behavior.scroll_to_top(page, humanize=eff_humanize)
                            log.info(
                                "upwork.feed_redis_seen_wall",
                                feed_stop_reason="redis_seen_wall",
                                after_size=len(after_ids),
                                redis_overlap_ratio=round(ratio, 4),
                                threshold=redis_wall_ratio,
                                load_more_count=self._feed_stealth_load_more_count,
                                ops_event="feed_stealth_stop",
                            )
                            return False

                    self._feed_empty_load_streak += 1
                    log.info(
                        "upwork.feed_empty_load_round",
                        empty_streak=self._feed_empty_load_streak,
                        streak_need=streak_need,
                        before=len(before_ids),
                        after=len(after_ids),
                        load_more_count=self._feed_stealth_load_more_count,
                        ops_event="feed_empty_load_round",
                    )
                    if self._feed_empty_load_streak >= streak_need:
                        await human_behavior.scroll_to_top(page, humanize=eff_humanize)
                        log.info(
                            "upwork.feed_duplicate_empty_load_streak",
                            feed_stop_reason="duplicate_empty_load_streak",
                            empty_streak=self._feed_empty_load_streak,
                            streak_need=streak_need,
                            load_more_count=self._feed_stealth_load_more_count,
                            ops_event="feed_stealth_stop",
                        )
                        _schedule_ops_feed_diagnosis(
                            self.site_id,
                            "upwork.feed_duplicate_empty_load_streak",
                            {
                                "feed_stop_reason": "duplicate_empty_load_streak",
                                "empty_streak": self._feed_empty_load_streak,
                                "streak_need": streak_need,
                                "load_more_count": self._feed_stealth_load_more_count,
                                "before_ids_count": len(before_ids),
                                "after_ids_count": len(after_ids),
                            },
                        )
                        return False
                    if self._feed_stealth_load_more_count >= max_lm:
                        log.info(
                            "upwork.feed_stealth_cap_after_click",
                            max_per_cycle=max_lm,
                            feed_stop_reason="stealth_cap_after_click",
                            ops_event="feed_stealth_stop",
                        )
                        return False
                    await self._stealth_feed_humanize_round(
                        page,
                        humanize=humanize,
                        eff_humanize=eff_humanize,
                    )
                    return True

                self._feed_empty_load_streak = 0
                self._feed_no_job_dom_streak = 0

                posted_by_core = index_posted_at_by_core_from_graphql_snippets(
                    self._dev_graphql_snippets,
                )
                if _fresh_temporal_wall(fresh, posted_by_core, max_age_days):
                    await human_behavior.scroll_to_top(page, humanize=eff_humanize)
                    log.info(
                        "upwork.feed_temporal_wall",
                        feed_stop_reason="feed_temporal_wall",
                        fresh_jobs=len(fresh),
                        max_posted_age_days=max_age_days,
                        load_more_count=self._feed_stealth_load_more_count,
                        ops_event="feed_stealth_stop",
                    )
                    await persist_seen_to_redis(redis_client, seen_key, set(fresh))
                    return False

                await persist_seen_to_redis(redis_client, seen_key, set(fresh))

                log.info(
                    "upwork.feed_stealth_chunk_ok",
                    fresh_jobs=len(fresh),
                    load_more_count=self._feed_stealth_load_more_count,
                    ops_event="feed_stealth_round_ok",
                )
                if self._feed_stealth_load_more_count >= max_lm:
                    log.info(
                        "upwork.feed_stealth_cap_after_click",
                        max_per_cycle=max_lm,
                        feed_stop_reason="stealth_cap_after_click",
                        ops_event="feed_stealth_stop",
                    )
                    return False
                await self._stealth_feed_humanize_round(
                    page,
                    humanize=humanize,
                    eff_humanize=eff_humanize,
                )
                return True
            except Exception as exc:
                last_exc = str(exc)
                log.warning(
                    "upwork.feed_load_more_failed",
                    error=last_exc,
                    attempt=attempt + 1,
                    attempts=total_attempts,
                )
                if attempt + 1 >= total_attempts:
                    log.warning(
                        "upwork.feed_load_more_exhausted",
                        error=last_exc,
                        feed_stop_reason="load_more_error_exhausted",
                        ops_event="feed_stealth_stop",
                    )
                    _schedule_ops_feed_diagnosis(
                        self.site_id,
                        "upwork.feed_load_more_exhausted",
                        {
                            "feed_stop_reason": "load_more_error_exhausted",
                            "error": last_exc,
                            "attempts": total_attempts,
                            "load_more_count": self._feed_stealth_load_more_count,
                        },
                    )
                    return False
                await human_behavior.chaos_sleep_ms(
                    feed_load_more_click_backoff_ms_min(),
                    feed_load_more_click_backoff_ms_max(),
                )
        return False

    async def check_new_messages(self, page: Page) -> bool:
        """
        Unread detection: optional GraphQL hint (see ``try_parse_inbox_unread_count``)
        or DOM badge on ``nav_messages_button``.
        """
        if getattr(self, "_gql_unread_bumped", False):
            self._gql_unread_bumped = False
            log.info("upwork.new_messages_signal", source="graphql_hint")
            return True
        # Common Upwork badge selector: nav a[href*="/messages/"] span.up-nav-badge
        # or similar indicator.
        selector = self.selectors.get("nav_messages_button", "")
        if not selector:
            return False
            
        badge_selector = f"{selector} span" # Counter is usually inside a span
        try:
            loc = page.locator(badge_selector)
            if await loc.count() > 0:
                text = await loc.first.inner_text()
                if text.strip().isdigit() and int(text.strip()) > 0:
                    return True
            return False
        except Exception:
            return False

    def _messages_fallback_url(self) -> str | None:
        raw = self._raw.get("messages_fallback_url")
        if isinstance(raw, str) and raw.strip():
            return _sanitize_upwork_messages_inbox_url(raw)
        return _sanitize_upwork_messages_inbox_url(_DEFAULT_MESSAGES_FALLBACK_URL)

    async def _goto_messages_by_url(self, page: Page, url: str, *, humanize: bool) -> bool:
        from ghost_engine.browser import human_behavior

        try:
            log.info("upwork.goto_messages_by_url", url_preview=url[:96])
            await page.goto(url, wait_until="domcontentloaded", timeout=30_000)
            await page.wait_for_url("**/messages/**", timeout=20_000)
            await human_behavior.after_navigation_settle(
                page,
                humanize=humanize,
                ready_selector="main",
            )
            return True
        except Exception as exc:
            log.warning("upwork.goto_messages_by_url_failed", error=str(exc))
            return False

    async def goto_messages(self, page: Page, *, humanize: bool = True) -> bool:
        """
        Navigate to Messages: prefer nav click (human-like), then optional alt selector,
        then direct ``page.goto`` to ``messages_fallback_url`` (default inbox URL) if clicks fail.
        """
        selector = self.selectors.get("nav_messages_button", "").strip()
        if selector:
            btn = page.locator(selector).first
            try:
                n = await btn.count()
                if n == 0:
                    log.warning(
                        "upwork.goto_messages_nav_link_not_found",
                        selector_preview=selector[:160],
                        hint="Update selectors.nav_messages_button in config/sites/upwork.yaml (DevTools)",
                    )
                else:
                    log.info("upwork.navigating_to_messages_via_click")
                    if humanize:
                        from ghost_engine.browser import human_behavior

                        await human_behavior.human_click(btn, humanize=True)
                    else:
                        await btn.click()

                    # Upwork may serve /nx/messages/ or legacy /messages/main/
                    await page.wait_for_url("**/messages/**", timeout=22_000)
                    if humanize:
                        from ghost_engine.browser import human_behavior

                        await human_behavior.after_navigation_settle(page, humanize=True, ready_selector="main")
                    return True
            except Exception as exc:
                log.warning("upwork.goto_messages_failed", error=str(exc))
        alt = self.selectors.get("messages_nav", "").strip()
        if alt and await messages_nav.try_open_messages_via_nav(page, alt, humanize=humanize):
            return True
        if selector and await messages_nav.try_open_messages_via_nav(page, selector, humanize=humanize):
            return True
        fb = self._messages_fallback_url()
        if fb and await self._goto_messages_by_url(page, fb, humanize=humanize):
            return True
        return False

    async def open_saved_jobs_via_header(
        self,
        page: Page,
        *,
        humanize: bool = True,
    ) -> bool:
        """
        Human path: open Find work → Saved jobs. Falls back to ``saved_jobs_url`` after
        ``SAVED_JOBS_HEADER_MAX_ATTEMPTS`` failed UI attempts.
        """
        from ghost_engine.browser import human_behavior
        from ghost_engine.browser.orchestrator_constants import SAVED_JOBS_HEADER_MAX_ATTEMPTS

        sid = (self.site_id or "unknown").strip()
        saved_url = (self.selectors.get("saved_jobs_url") or "").strip()
        trigger_css = (self.selectors.get("nav_find_work_open") or "").strip()
        saved_css = (self.selectors.get("nav_saved_jobs_link") or "").strip()

        for attempt in range(1, SAVED_JOBS_HEADER_MAX_ATTEMPTS + 1):
            try:
                if trigger_css:
                    trig = page.locator(trigger_css).first
                    if await trig.count() > 0:
                        await human_behavior.human_click(trig, humanize=humanize, timeout_ms=12_000)
                        await human_behavior.chaos_sleep_ms(380, 920)
                else:
                    fw_btn = page.get_by_role("button", name=re.compile(r"find\s*work", re.I))
                    if await fw_btn.count() > 0:
                        await human_behavior.human_click(
                            fw_btn.first, humanize=humanize, timeout_ms=12_000
                        )
                        await human_behavior.chaos_sleep_ms(380, 920)
                    else:
                        fw_link = page.get_by_role("link", name=re.compile(r"find\s*work", re.I))
                        if await fw_link.count() > 0:
                            await human_behavior.human_click(
                                fw_link.first, humanize=humanize, timeout_ms=12_000
                            )
                            await human_behavior.chaos_sleep_ms(380, 920)

                if saved_css:
                    sl = page.locator(saved_css).first
                    if await sl.count() > 0:
                        await human_behavior.human_click(sl, humanize=humanize, timeout_ms=12_000)
                        await human_behavior.after_navigation_settle(
                            page,
                            humanize=humanize,
                            ready_selector=self.page_ready_selector,
                        )
                        log.info(
                            "upwork.saved_jobs_via_header",
                            site_id=sid,
                            attempt=attempt,
                            mode="css",
                        )
                        return True

                sj = page.get_by_role("link", name=re.compile(r"saved\s*jobs", re.I))
                if await sj.count() > 0:
                    await human_behavior.human_click(sj.first, humanize=humanize, timeout_ms=12_000)
                    await human_behavior.after_navigation_settle(
                        page,
                        humanize=humanize,
                        ready_selector=self.page_ready_selector,
                    )
                    log.info(
                        "upwork.saved_jobs_via_header",
                        site_id=sid,
                        attempt=attempt,
                        mode="role",
                    )
                    return True
            except Exception as exc:
                log.warning(
                    "upwork.saved_jobs_header_attempt_failed",
                    site_id=sid,
                    attempt=attempt,
                    error=str(exc),
                )
            await human_behavior.chaos_sleep_ms(520, 1600)

        if saved_url:
            try:
                await page.goto(saved_url, wait_until="domcontentloaded", timeout=45_000)
                await human_behavior.after_navigation_settle(
                    page,
                    humanize=humanize,
                    ready_selector=self.page_ready_selector,
                )
                log.info("upwork.saved_jobs_fallback_url", site_id=sid)
                return True
            except Exception as exc:
                log.warning("upwork.saved_jobs_url_failed", site_id=sid, error=str(exc))
        return False

    async def orchestrator_return_to_main_entry(
        self,
        page: Page,
        *,
        humanize: bool = True,
    ) -> None:
        """After a feed round: scroll top, or click header home, or reload (navigation timeout wins)."""
        from ghost_engine.browser import human_behavior

        sel = (self.selectors.get("nav_upwork_home_click") or "").strip()
        try:
            if sel:
                loc = page.locator(sel).first
                if await loc.count() > 0:
                    await human_behavior.human_click(loc, humanize=humanize, timeout_ms=12_000)
                    await human_behavior.after_navigation_settle(
                        page,
                        humanize=humanize,
                        ready_selector=self.page_ready_selector,
                    )
                    return
            await human_behavior.scroll_to_top(page, humanize=humanize)
            await page.reload(wait_until="domcontentloaded", timeout=45_000)
            await human_behavior.after_navigation_settle(
                page,
                humanize=humanize,
                ready_selector=self.page_ready_selector,
            )
        except Exception as exc:
            log.warning("upwork.orchestrator_return_main_failed", error=str(exc))

    async def save_job_on_page(
        self,
        page: Page,
        job_id: str,
        *,
        humanize: bool = True,
        job_public_url: str | None = None,
    ) -> None:
        """Open job detail (feed → optional Anchor URL) and click save/heart."""
        from ghost_engine.adapters.base_adapter import _sanitize_upwork_job_public_url_for_goto
        from ghost_engine.browser import human_behavior
        from ghost_engine.notify.job_anchor import resolve_anchor_job_public_url

        sid = (self.site_id or "unknown").strip()
        jid = job_id.strip()
        if not jid:
            log.warning("upwork.save_job_bad_id", site_id=sid)
            return
        opened = await self._try_follow_job_link_from_feed(page, jid, humanize=humanize)
        pub = _sanitize_upwork_job_public_url_for_goto(job_public_url)
        if not opened and not pub:
            pub = await resolve_anchor_job_public_url(
                site_id=sid,
                job_id=jid,
                fallback_from_cmd=job_public_url,
            )
        if not opened and pub:
            log.info(
                "upwork.save_job_anchor_goto",
                site_id=sid,
                job_id=jid,
                url_preview=pub[:96],
            )
            await page.goto(pub, wait_until="domcontentloaded", timeout=45_000)
            await human_behavior.after_navigation_settle(
                page,
                humanize=humanize,
                ready_selector=self.page_ready_selector,
            )
            await self.check_for_captcha(page)
        if not opened and not pub:
            log.warning("upwork.save_job_navigation_miss", site_id=sid, job_id=jid)
            return

        anchor_url = pub
        await self.check_for_captcha(page)
        save_sel = self.selectors.get("save_job_button", "").strip()
        if not save_sel:
            log.warning("upwork.save_job_no_selector", site_id=sid)
            return
        loc = page.locator(save_sel).first
        if await loc.count() == 0:
            log.warning(
                "upwork.save_job_button_missing_try_anchor",
                site_id=sid,
                job_id=jid,
                hint="Anchor retry: regoto direct URL or reload",
            )
            retry_url = anchor_url or await resolve_anchor_job_public_url(
                site_id=sid,
                job_id=jid,
                fallback_from_cmd=job_public_url,
            )
            if retry_url:
                try:
                    await page.goto(retry_url, wait_until="domcontentloaded", timeout=45_000)
                    await human_behavior.after_navigation_settle(
                        page,
                        humanize=humanize,
                        ready_selector=self.page_ready_selector,
                    )
                    await self.check_for_captcha(page)
                except Exception as exc:
                    log.warning("upwork.save_job_anchor_regoto_failed", error=str(exc))
            else:
                try:
                    await page.reload(wait_until="domcontentloaded", timeout=45_000)
                    await human_behavior.after_navigation_settle(
                        page,
                        humanize=humanize,
                        ready_selector=self.page_ready_selector,
                    )
                except Exception as exc:
                    log.warning("upwork.save_job_anchor_reload_failed", error=str(exc))
            loc = page.locator(save_sel).first
        if await loc.count() == 0:
            log.warning("upwork.save_job_button_still_missing", site_id=sid, job_id=jid)
            return
        await human_behavior.human_click(loc, humanize=humanize, timeout_ms=14_000)
        log.info("upwork.save_job_clicked", site_id=sid, job_id=jid)

    async def unsave_job_on_page(
        self,
        page: Page,
        job_id: str,
        *,
        humanize: bool = True,
        job_public_url: str | None = None,
    ) -> None:
        """Remove saved state: prefer ``unsave_job_button`` on job detail, else open Saved list URL."""
        from ghost_engine.adapters.base_adapter import _sanitize_upwork_job_public_url_for_goto
        from ghost_engine.browser import human_behavior

        sid = (self.site_id or "unknown").strip()
        jid = job_id.strip()
        if not jid:
            log.warning("upwork.unsave_job_bad_id", site_id=sid)
            return

        from ghost_engine.notify.job_anchor import resolve_anchor_job_public_url

        uns_sel = self.selectors.get("unsave_job_button", "").strip()
        opened = await self._try_follow_job_link_from_feed(page, jid, humanize=humanize)
        pub = _sanitize_upwork_job_public_url_for_goto(job_public_url)
        if not opened and not pub:
            pub = await resolve_anchor_job_public_url(
                site_id=sid,
                job_id=jid,
                fallback_from_cmd=job_public_url,
            )
        if not opened and pub:
            await page.goto(pub, wait_until="domcontentloaded", timeout=45_000)
            await human_behavior.after_navigation_settle(
                page,
                humanize=humanize,
                ready_selector=self.page_ready_selector,
            )
            await self.check_for_captcha(page)
        elif not opened:
            saved_u = self.selectors.get("saved_jobs_url", "").strip()
            if saved_u:
                await page.goto(saved_u, wait_until="domcontentloaded")
                await human_behavior.after_navigation_settle(
                    page,
                    humanize=humanize,
                    ready_selector=self.page_ready_selector,
                )
                await self.check_for_captcha(page)
            else:
                log.warning("upwork.unsave_job_navigation_miss", site_id=sid, job_id=jid)
                return

        await self.check_for_captcha(page)
        target_sel = uns_sel or self.selectors.get("save_job_button", "").strip()
        if not target_sel:
            log.warning("upwork.unsave_job_no_selector", site_id=sid)
            return
        loc = page.locator(target_sel).first
        if await loc.count() == 0:
            log.warning("upwork.unsave_job_button_missing", site_id=sid, job_id=jid)
            return
        await human_behavior.human_click(loc, humanize=humanize, timeout_ms=14_000)
        log.info("upwork.unsave_job_clicked", site_id=sid, job_id=jid)


def load_default() -> UpworkAdapter:
    root = Path(__file__).resolve().parents[3] / "config" / "sites" / "upwork.yaml"
    return UpworkAdapter(root)
