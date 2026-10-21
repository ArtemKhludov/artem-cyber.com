"""Human-like delays, scroll, and typing (УЗЕЛ 1 — scrap_navigation §3).

Camoufox `humanize` handles Bezier-like pointer paths inside the browser.
This module adds a second entropy layer at the Playwright API: variable timing,
micro mouse moves, scroll patterns, typos, and rare double-key corrections.
"""

from __future__ import annotations

import asyncio
import random
import string
import time
from typing import Any, Mapping

from playwright.async_api import Locator, Page

from ghost_engine.config.settings import get_settings


def _delay_bounds() -> tuple[int, int, int, int]:
    settings = get_settings()
    base = settings.base_config.get("human_delays") or {}
    if not isinstance(base, dict):
        return (40, 120, 200, 800)
    t_min = int(base.get("typing_ms_min", 40))
    t_max = int(base.get("typing_ms_max", 120))
    a_min = int(base.get("between_actions_ms_min", 200))
    a_max = int(base.get("between_actions_ms_max", 800))
    return (t_min, t_max, a_min, a_max)


def _entropy() -> dict[str, float | int]:
    settings = get_settings()
    raw = settings.base_config.get("human_entropy") or {}
    if not isinstance(raw, dict):
        raw = {}
    return {
        "think_pause_probability": float(raw.get("think_pause_probability", 0.07)),
        "think_pause_ms_min": int(raw.get("think_pause_ms_min", 350)),
        "think_pause_ms_max": int(raw.get("think_pause_ms_max", 2800)),
        "burst_run_probability": float(raw.get("burst_run_probability", 0.14)),
        "burst_typing_ms_min": int(raw.get("burst_typing_ms_min", 12)),
        "burst_typing_ms_max": int(raw.get("burst_typing_ms_max", 42)),
        "double_key_probability": float(raw.get("double_key_probability", 0.018)),
        "typo_neighbor_key_probability": float(raw.get("typo_neighbor_key_probability", 0.004)),
        "jitter_before_scroll_probability": float(raw.get("jitter_before_scroll_probability", 0.38)),
        "scroll_reverse_probability": float(raw.get("scroll_reverse_probability", 0.12)),
        "scroll_double_step_probability": float(raw.get("scroll_double_step_probability", 0.22)),
        "micro_moves_before_action_max": int(raw.get("micro_moves_before_action_max", 2)),
    }


async def human_delay(ms_min: int | None = None, ms_max: int | None = None) -> None:
    _, _, a_min, a_max = _delay_bounds()
    lo = ms_min if ms_min is not None else a_min
    hi = ms_max if ms_max is not None else a_max
    await asyncio.sleep(random.uniform(lo, hi) / 1000.0)


async def chaos_sleep_ms(ms_min: int, ms_max: int) -> None:
    """Uniform sleep in milliseconds (breaks fixed cadence for polls / backoff)."""
    lo, hi = (ms_min, ms_max) if ms_min <= ms_max else (ms_max, ms_min)
    await asyncio.sleep(random.uniform(float(lo), float(hi)) / 1000.0)


def _human_navigation_config() -> dict[str, int]:
    settings = get_settings()
    raw = settings.base_config.get("human_navigation")
    src: dict[str, Any] = raw if isinstance(raw, dict) else {}

    def gi(key: str, default: int) -> int:
        v = src.get(key, default)
        try:
            return int(v)
        except (TypeError, ValueError):
            return default

    return {
        "page_ready_timeout_ms": gi("page_ready_timeout_ms", 12_000),
        "settle_delay_ms_min": gi("settle_delay_ms_min", 120),
        "settle_delay_ms_max": gi("settle_delay_ms_max", 600),
    }


async def after_navigation_settle(
    page: Page,
    *,
    humanize: bool,
    ready_selector: str | None,
    timeout_ms: int | None = None,
) -> None:
    """Optional wait for list shell + short delay + light scroll (post-goto)."""
    cfg = _human_navigation_config()
    t_out = timeout_ms if timeout_ms is not None else int(cfg["page_ready_timeout_ms"])
    sel = (ready_selector or "").strip()
    if sel:
        try:
            await page.wait_for_selector(sel, timeout=t_out, state="attached")
        except Exception:
            pass
    lo = int(cfg["settle_delay_ms_min"])
    hi = int(cfg["settle_delay_ms_max"])
    await human_delay(lo, hi if hi >= lo else lo)
    if humanize and random.random() < 0.62:
        await random_scroll(page, px_min=80, px_max=280)


def _human_idle_activity_config() -> dict[str, float | int | bool]:
    settings = get_settings()
    raw = settings.base_config.get("human_idle_activity")
    src: dict[str, Any] = raw if isinstance(raw, dict) else {}

    def gi(key: str, default: int) -> int:
        v = src.get(key, default)
        try:
            return int(v)
        except (TypeError, ValueError):
            return default

    def gf(key: str, default: float) -> float:
        v = src.get(key, default)
        try:
            return float(v)
        except (TypeError, ValueError):
            return default

    return {
        "enabled": bool(src.get("enabled", True)),
        "interval_sec_min": max(30, gi("interval_sec_min", 90)),
        "interval_sec_max": max(31, gi("interval_sec_max", 240)),
        "scroll_probability": gf("scroll_probability", 0.55),
    }


async def idle_micro_activity_tick(page: Page, *, humanize: bool) -> None:
    """Rare mouse jitter + optional small scroll during long idle."""
    if not humanize:
        return
    await maybe_micro_moves(page)
    cfg = _human_idle_activity_config()
    if random.random() < float(cfg["scroll_probability"]):
        await random_scroll(page, px_min=40, px_max=220)


async def run_idle_with_micro_activity(
    page: Page,
    *,
    total_seconds: float,
    humanize: bool,
) -> None:
    """Sleep for ``total_seconds`` while occasionally simulating idle user activity."""
    if total_seconds <= 0:
        return
    cfg = _human_idle_activity_config()
    if not humanize or not bool(cfg["enabled"]):
        await asyncio.sleep(total_seconds)
        return

    i_lo = int(cfg["interval_sec_min"])
    i_hi = int(cfg["interval_sec_max"])
    if i_hi < i_lo:
        i_lo, i_hi = i_hi, i_lo

    deadline = time.monotonic() + total_seconds
    next_tick = time.monotonic() + random.uniform(float(i_lo), float(i_hi))

    while time.monotonic() < deadline:
        now = time.monotonic()
        rem = deadline - now
        if rem <= 0:
            break
        nap = min(10.0, rem, max(0.05, next_tick - now))
        await asyncio.sleep(nap)
        now = time.monotonic()
        if now >= next_tick and now < deadline:
            await idle_micro_activity_tick(page, humanize=True)
            next_tick = now + random.uniform(float(i_lo), float(i_hi))


async def human_click(
    loc: Locator,
    *,
    humanize: bool = True,
    timeout_ms: int | None = None,
) -> None:
    """
    Click with optional micro-moves + delay before press (anti bot burst clicks).
    """
    t_out = timeout_ms if timeout_ms is not None else 30_000
    page = loc.page
    if humanize:
        await maybe_micro_moves(page)
        await human_delay()
    await loc.first.click(timeout=t_out)


async def coffee_break(min_seconds: float = 5.0, max_seconds: float = 15.0) -> None:
    """Random pause between targets (main_plan session rhythm)."""
    await asyncio.sleep(random.uniform(min_seconds, max_seconds))


def _keyboard_neighbor(ch: str) -> str:
    """Adjacent key typo on US QWERTY row (rough heuristic)."""
    rows = [
        "qwertyuiop",
        "asdfghjkl",
        "zxcvbnm",
    ]
    cl = ch.lower()
    for row in rows:
        if cl in row:
            i = row.index(cl)
            opts = [row[j] for j in (i - 1, i + 1) if 0 <= j < len(row)]
            if opts:
                pick = random.choice(opts)
                return pick.upper() if ch.isupper() else pick
    return "x" if ch.lower() != "x" else "s"


async def micro_mouse_adjust(page: Page) -> None:
    """Small hand-adjustment move (does not replace Camoufox Bezier; adds entropy)."""
    vp = page.viewport_size
    if not vp:
        return
    w, h = int(vp["width"]), int(vp["height"])
    if w < 80 or h < 80:
        return
    x = random.randint(max(8, w // 10), max(9, w * 9 // 10))
    y = random.randint(max(8, h // 10), max(9, h * 9 // 10))
    steps = random.randint(4, 18)
    await page.mouse.move(x, y, steps=steps)


async def maybe_micro_moves(page: Page) -> None:
    ent = _entropy()
    nmax = max(0, int(ent["micro_moves_before_action_max"]))
    if nmax <= 0:
        return
    n = random.randint(0, nmax)
    for _ in range(n):
        if random.random() < float(ent["jitter_before_scroll_probability"]):
            await micro_mouse_adjust(page)
            await asyncio.sleep(random.uniform(0.02, 0.12))


async def random_scroll(
    page: Page,
    *,
    px_min: int = 120,
    px_max: int = 520,
) -> None:
    """Scroll with optional jitter, double-step, or slight reverse (second entropy layer)."""
    ent = _entropy()
    await maybe_micro_moves(page)

    if random.random() < float(ent["scroll_reverse_probability"]):
        up = random.randint(40, min(220, px_max))
        await page.mouse.wheel(0, -up)
        await asyncio.sleep(random.uniform(0.05, 0.18))

    delta_y = random.randint(px_min, px_max)
    if random.random() < float(ent["scroll_double_step_probability"]):
        a = int(delta_y * random.uniform(0.35, 0.55))
        b = delta_y - a
        await page.mouse.wheel(0, a)
        await asyncio.sleep(random.uniform(0.04, 0.14))
        await page.mouse.wheel(0, b)
    else:
        await page.mouse.wheel(0, delta_y)

    await human_delay()


async def scroll_to_top(page: Page, *, humanize: bool = True) -> None:
    """
    Move viewport toward the top without a single instant jump (PageUp bursts + Home).

    Used after a deep feed pass so the user can re-scan the top of the list.
    """
    steps = random.randint(6, 14) if humanize else 3
    try:
        for _ in range(steps):
            await page.keyboard.press("PageUp")
            await asyncio.sleep(random.uniform(0.08, 0.28) if humanize else 0.02)
        if humanize:
            await human_delay(100, 380)
        await page.keyboard.press("Home")
        await asyncio.sleep(random.uniform(0.12, 0.35) if humanize else 0.05)
    except Exception:
        pass


async def gentle_feed_scroll_exploration(
    page: Page,
    *,
    humanize: bool = True,
    passes: int = 3,
) -> None:
    """
    A few wheel scrolls down with short gaps — human skim when no high-GRI tile to stop on.

    Avoids PageDown spam and ``End`` (no jump to document bottom).
    """
    n = max(1, min(int(passes), 12))
    for _ in range(n):
        await random_scroll(page, px_min=160, px_max=400)
        if humanize:
            await chaos_sleep_ms(180, 650)
        else:
            await asyncio.sleep(0.03)


async def scroll_toward_feed_bottom(
    page: Page,
    *,
    humanize: bool = True,
    rounds: int | None = None,
) -> None:
    """
    Move viewport toward the bottom (PageDown bursts + End) so virtualized feed tiles mount.

    ``rounds`` overrides step count when set; otherwise derived from humanize (fast path = fewer).
    """
    if rounds is not None:
        steps = max(1, min(int(rounds), 40))
    else:
        steps = random.randint(6, 14) if humanize else 4
    try:
        for _ in range(steps):
            await page.keyboard.press("PageDown")
            await asyncio.sleep(random.uniform(0.08, 0.28) if humanize else 0.02)
        if humanize:
            await human_delay(100, 380)
        await page.keyboard.press("End")
        await asyncio.sleep(random.uniform(0.12, 0.35) if humanize else 0.05)
    except Exception:
        pass


async def human_scroll(
    page: Page,
    *,
    px_min: int | None = None,
    px_max: int | None = None,
) -> None:
    """Human-like wheel scroll; thin wrapper over ``random_scroll`` (lesson / API alias)."""
    lo = 120 if px_min is None else px_min
    hi = 520 if px_max is None else px_max
    await random_scroll(page, px_min=lo, px_max=hi)


def _reading_config() -> dict[str, Any]:
    """Load ``human_reading`` from base.yaml with safe defaults (all timings in ms)."""
    settings = get_settings()
    raw = settings.base_config.get("human_reading")
    src: dict[str, Any] = raw if isinstance(raw, dict) else {}

    def gi(key: str, default: int) -> int:
        v = src.get(key, default)
        try:
            return int(v)
        except (TypeError, ValueError):
            return default

    def gf(key: str, default: float) -> float:
        v = src.get(key, default)
        try:
            return float(v)
        except (TypeError, ValueError):
            return default

    return {
        "visible_timeout_ms": gi("visible_timeout_ms", 15000),
        "pre_smooth_scroll_ms_min": gi("pre_smooth_scroll_ms_min", 80),
        "pre_smooth_scroll_ms_max": gi("pre_smooth_scroll_ms_max", 320),
        "wait_after_smooth_scroll_ms_min": gi("wait_after_smooth_scroll_ms_min", 400),
        "wait_after_smooth_scroll_ms_max": gi("wait_after_smooth_scroll_ms_max", 1200),
        "post_scroll_jitter_probability": gf("post_scroll_jitter_probability", 0.42),
        "jitter_scroll_px_min": gi("jitter_scroll_px_min", 40),
        "jitter_scroll_px_max": gi("jitter_scroll_px_max", 180),
        "ms_per_word_min": gi("ms_per_word_min", 65),
        "ms_per_word_max": gi("ms_per_word_max", 105),
        "reading_total_jitter_ms_min": gf("reading_total_jitter_ms_min", -80.0),
        "reading_total_jitter_ms_max": gf("reading_total_jitter_ms_max", 420.0),
        "dwell_total_ms_min": gi("dwell_total_ms_min", 1400),
        "dwell_total_ms_max": gi("dwell_total_ms_max", 26000),
        "reading_chunks_min": gi("reading_chunks_min", 5),
        "reading_chunks_max": gi("reading_chunks_max", 14),
        "micro_move_on_chunk_probability": gf("micro_move_on_chunk_probability", 0.55),
        "text_selection_probability": gf("text_selection_probability", 0.62),
        "pre_selection_ms_min": gi("pre_selection_ms_min", 120),
        "pre_selection_ms_max": gi("pre_selection_ms_max", 420),
        "post_selection_ms_min": gi("post_selection_ms_min", 180),
        "post_selection_ms_max": gi("post_selection_ms_max", 550),
        "clear_selection_ms_min": gi("clear_selection_ms_min", 80),
        "clear_selection_ms_max": gi("clear_selection_ms_max", 240),
        "max_chars_for_word_count": gi("max_chars_for_word_count", 24000),
    }


def compute_target_read_ms(
    word_count: int,
    cfg: Mapping[str, Any],
    rng: random.Random,
) -> int:
    """
    Layer-1 reading time: ``words * uniform(ms_per_word) + uniform(jitter)``, then clamp.

    Used by ``simulate_reading`` and unit-tested with a fixed ``rng``.
    """
    wc = max(0, word_count)
    mp_lo = int(cfg["ms_per_word_min"])
    mp_hi = int(cfg["ms_per_word_max"])
    if mp_hi < mp_lo:
        mp_lo, mp_hi = mp_hi, mp_lo
    rate = rng.uniform(float(mp_lo), float(mp_hi))
    jitter_lo = float(cfg["reading_total_jitter_ms_min"])
    jitter_hi = float(cfg["reading_total_jitter_ms_max"])
    if jitter_hi < jitter_lo:
        jitter_lo, jitter_hi = jitter_hi, jitter_lo
    raw = wc * rate + rng.uniform(jitter_lo, jitter_hi)
    lo = int(cfg["dwell_total_ms_min"])
    hi = int(cfg["dwell_total_ms_max"])
    if hi < lo:
        lo, hi = hi, lo
    return max(lo, min(hi, int(round(raw))))


async def _dwell_reading_chunks(
    page: Page,
    target_ms: float,
    cfg: Mapping[str, Any],
    rng: random.Random,
) -> None:
    """Layer-2: split dwell into jittered chunk weights; optional micro-moves per chunk."""
    n_lo = max(1, int(cfg["reading_chunks_min"]))
    n_hi = max(n_lo, int(cfg["reading_chunks_max"]))
    n = rng.randint(n_lo, n_hi)
    weights = [rng.uniform(0.35, 1.0) for _ in range(n)]
    total_w = sum(weights) or 1.0
    parts = [target_ms * w / total_w for w in weights]
    p_micro = float(cfg["micro_move_on_chunk_probability"])
    for part in parts:
        await asyncio.sleep(max(0.0, part) / 1000.0)
        if rng.random() < p_micro:
            await maybe_micro_moves(page)


async def _maybe_drag_select_words(
    page: Page,
    loc: Locator,
    text: str,
    cfg: Mapping[str, Any],
    rng: random.Random,
) -> None:
    await asyncio.sleep(
        rng.uniform(int(cfg["pre_selection_ms_min"]), int(cfg["pre_selection_ms_max"])) / 1000.0
    )
    box = await loc.bounding_box()
    if box is None:
        return
    x, y, w, h = float(box["x"]), float(box["y"]), float(box["width"]), float(box["height"])
    if w < 20.0 or h < 12.0:
        return
    margin_x = w * 0.08
    margin_y = h * 0.08
    sx = x + margin_x + rng.uniform(0.0, w * 0.2)
    sy = y + margin_y + rng.uniform(0.0, h * 0.25)
    chars = max(len(text), 1)
    span = min(w - margin_x, max(24.0, w * min(0.48, 48.0 / chars) * rng.uniform(0.85, 1.28)))
    ex = sx + span
    ey = sy + rng.uniform(-4.0, 4.0)
    await page.mouse.move(sx, sy, steps=rng.randint(3, 10))
    await page.mouse.down()
    await asyncio.sleep(rng.uniform(0.04, 0.12))
    await page.mouse.move(ex, ey, steps=max(6, rng.randint(8, 22)))
    await asyncio.sleep(rng.uniform(0.05, 0.14))
    await page.mouse.up()
    await asyncio.sleep(
        rng.uniform(int(cfg["post_selection_ms_min"]), int(cfg["post_selection_ms_max"])) / 1000.0
    )
    await page.keyboard.press("Escape")
    await asyncio.sleep(
        rng.uniform(int(cfg["clear_selection_ms_min"]), int(cfg["clear_selection_ms_max"])) / 1000.0
    )


async def simulate_reading(
    page: Page,
    locator: Locator,
    *,
    max_total_ms: int | None = None,
    rng: random.Random | None = None,
) -> None:
    """
    Scroll description into view (smooth), dwell proportional to word count (ms + RNG layers),
    optionally drag-select a short span then clear. All delays are drawn from YAML ms ranges.
    """
    rng_use = rng if rng is not None else random.Random()
    cfg = _reading_config()
    loc = locator.first
    await loc.wait_for(state="visible", timeout=int(cfg["visible_timeout_ms"]))

    await asyncio.sleep(
        rng_use.uniform(
            int(cfg["pre_smooth_scroll_ms_min"]),
            int(cfg["pre_smooth_scroll_ms_max"]),
        )
        / 1000.0
    )

    handle = await loc.element_handle(timeout=min(10000, int(cfg["visible_timeout_ms"])))
    if handle is not None:
        await handle.evaluate(
            "el => el.scrollIntoView({ behavior: 'smooth', block: 'center' })"
        )

    await asyncio.sleep(
        rng_use.uniform(
            int(cfg["wait_after_smooth_scroll_ms_min"]),
            int(cfg["wait_after_smooth_scroll_ms_max"]),
        )
        / 1000.0
    )

    if rng_use.random() < float(cfg["post_scroll_jitter_probability"]):
        await human_scroll(
            page,
            px_min=int(cfg["jitter_scroll_px_min"]),
            px_max=int(cfg["jitter_scroll_px_max"]),
        )

    try:
        blob = await loc.inner_text()
    except Exception:
        blob = ""
    max_c = int(cfg["max_chars_for_word_count"])
    if max_c > 0 and len(blob) > max_c:
        blob = blob[:max_c]
    words = len(blob.split())

    target_ms = float(compute_target_read_ms(words, cfg, rng_use))
    if max_total_ms is not None:
        target_ms = min(target_ms, float(max_total_ms))

    await _dwell_reading_chunks(page, target_ms, cfg, rng_use)

    if rng_use.random() < float(cfg["text_selection_probability"]):
        await _maybe_drag_select_words(page, loc, blob, cfg, rng_use)


def _next_typing_delay_ms(
    *,
    t_min: int,
    t_max: int,
    burst: bool,
    ent: dict[str, float | int],
) -> int:
    if burst:
        return random.randint(
            int(ent["burst_typing_ms_min"]),
            int(ent["burst_typing_ms_max"]),
        )
    return random.randint(t_min, t_max)


async def human_type(
    page: Page,
    target: str | Locator,
    text: str,
    *,
    typo_every: int = 200,
) -> None:
    """
    Type with per-key variable delay, bursts, think-pauses, typos, rare double-key.
    Complements Camoufox humanize (Bezier); does not duplicate it.
    """
    t_min, t_max, _, _ = _delay_bounds()
    ent = _entropy()

    loc: Locator = page.locator(target) if isinstance(target, str) else target
    await human_click(loc, humanize=True, timeout_ms=15_000)
    await human_delay(80, 260)
    await maybe_micro_moves(page)

    burst = random.random() < float(ent["burst_run_probability"])

    for i, ch in enumerate(text):
        if ch == " " and random.random() < float(ent["think_pause_probability"]):
            await asyncio.sleep(
                random.randint(
                    int(ent["think_pause_ms_min"]),
                    int(ent["think_pause_ms_max"]),
                )
                / 1000.0
            )

        if random.random() < float(ent["burst_run_probability"]) * 0.35:
            burst = random.random() < float(ent["burst_run_probability"])

        delay_ms = _next_typing_delay_ms(
            t_min=t_min, t_max=t_max, burst=burst, ent=ent
        )

        if typo_every > 0 and random.randint(1, typo_every) == 1 and ch.isalnum():
            if ch.isalpha() and random.random() < float(ent["typo_neighbor_key_probability"]):
                wrong = _keyboard_neighbor(ch)
            elif ch.isdigit():
                d = int(ch)
                wrong = str((d + random.choice([-1, 1, 2])) % 10)
                if wrong == ch:
                    wrong = str((d + 3) % 10)
            else:
                wrong = random.choice(string.ascii_lowercase) if ch.islower() else random.choice(
                    string.ascii_uppercase
                )
            await page.keyboard.type(wrong, delay=delay_ms)
            await asyncio.sleep(random.uniform(0.07, 0.28))
            await page.keyboard.press("Backspace")
            await asyncio.sleep(random.uniform(0.03, 0.12))

        await page.keyboard.type(ch, delay=delay_ms)

        if (
            ch.isalnum()
            and random.random() < float(ent["double_key_probability"])
        ):
            await page.keyboard.type(ch, delay=random.randint(8, 35))
            await asyncio.sleep(random.uniform(0.05, 0.16))
            await page.keyboard.press("Backspace")


def _human_job_search_config() -> dict[str, float | int]:
    settings = get_settings()
    raw = settings.base_config.get("human_job_search")
    src: dict[str, Any] = raw if isinstance(raw, dict) else {}

    def gi(key: str, default: int) -> int:
        v = src.get(key, default)
        try:
            return int(v)
        except (TypeError, ValueError):
            return default

    def gf(key: str, default: float) -> float:
        v = src.get(key, default)
        try:
            return float(v)
        except (TypeError, ValueError):
            return default

    return {
        "between_navigations_ms_min": gi("between_navigations_ms_min", 4000),
        "between_navigations_ms_max": gi("between_navigations_ms_max", 18000),
        "long_break_probability": gf("long_break_probability", 0.12),
        "long_break_sec_min": gf("long_break_sec_min", 8.0),
        "long_break_sec_max": gf("long_break_sec_max", 35.0),
        "after_load_scroll_passes_min": gi("after_load_scroll_passes_min", 1),
        "after_load_scroll_passes_max": gi("after_load_scroll_passes_max", 4),
        "after_load_extra_delay_ms_min": gi("after_load_extra_delay_ms_min", 600),
        "after_load_extra_delay_ms_max": gi("after_load_extra_delay_ms_max", 3500),
    }


async def between_job_search_navigations(page: Page, *, humanize: bool = True) -> None:
    """
    Call **before** navigating to the next saved filter / job-search URL.

    Long variable pause + micro-moves + occasional coffee break so URL chains
    do not resemble a port scan.
    """
    if not humanize:
        await asyncio.sleep(random.uniform(2.0, 5.5))
        return

    cfg = _human_job_search_config()
    lo = int(cfg["between_navigations_ms_min"])
    hi = int(cfg["between_navigations_ms_max"])
    if hi < lo:
        lo, hi = hi, lo
    await asyncio.sleep(random.uniform(lo, hi) / 1000.0)

    await maybe_micro_moves(page)
    ent = _entropy()
    if random.random() < float(ent["think_pause_probability"]):
        await asyncio.sleep(
            random.randint(
                int(ent["think_pause_ms_min"]),
                int(ent["think_pause_ms_max"]),
            )
            / 1000.0
        )

    if random.random() < float(cfg["long_break_probability"]):
        lb_lo = float(cfg["long_break_sec_min"])
        lb_hi = float(cfg["long_break_sec_max"])
        if lb_hi < lb_lo:
            lb_lo, lb_hi = lb_hi, lb_lo
        await coffee_break(lb_lo, lb_hi)


async def dwell_on_search_results(page: Page, *, humanize: bool = True) -> None:
    """
    After a job-search page loads: short skimming (scroll + delays) before any
    further automation.
    """
    if not humanize:
        await asyncio.sleep(random.uniform(1.5, 4.0))
        return

    cfg = _human_job_search_config()
    p_lo = int(cfg["after_load_scroll_passes_min"])
    p_hi = int(cfg["after_load_scroll_passes_max"])
    if p_hi < p_lo:
        p_lo, p_hi = p_hi, p_lo
    passes = random.randint(max(1, p_lo), max(1, p_hi))

    await human_delay(
        int(cfg["after_load_extra_delay_ms_min"]),
        int(cfg["after_load_extra_delay_ms_max"]),
    )
    await maybe_micro_moves(page)

    for _ in range(passes):
        await random_scroll(page)
        if random.random() < 0.35:
            await human_delay(200, 900)


async def warm_up_page(page: Page, *, scroll_times: int = 2) -> None:
    """Post-load reading simulation: idle, micro-moves, scrolls."""
    await human_delay(400, 1400)
    await maybe_micro_moves(page)
    for _ in range(max(1, scroll_times)):
        await random_scroll(page)


async def entropy_wait(page: Page, duration_sec: float, site_id: str | None = None) -> None:
    """
    Mask AI processing delays by simulating a distracted/thinking human.
    Performs very slow scrolls, micro-movements, and occasional harmless clicks
    (like looking at other vacancies) to maintain human-like activity patterns.
    """
    log.info("human_behavior.entropy_wait_start", duration=duration_sec, site_id=site_id)
    deadline = time.monotonic() + duration_sec
    while time.monotonic() < deadline:
        # 1. Random harmless activity: maybe click on another job card
        if site_id and random.random() < 0.15:
            await _maybe_perform_harmless_click(page, site_id)

        # 2. Random scrolls
        if random.random() < 0.4:
            # Very light scroll up or down
            px = random.randint(-250, 250)
            try:
                await page.mouse.wheel(0, px)
            except Exception:
                pass

        # 3. Micro-moves
        if random.random() < 0.35:
            await maybe_micro_moves(page)

        # Long variable pauses between distractions
        nap = random.uniform(2.0, 6.0)
        rem = deadline - time.monotonic()
        await asyncio.sleep(min(nap, max(0, rem)))

async def _maybe_perform_harmless_click(page: Page, site_id: str) -> None:
    """
    Finds and clicks a non-critical element to simulate exploration.
    On job sites, this usually means clicking a different job card.
    """
    try:
        if site_id == "upwork":
            # Selectors for job cards in search/feed
            selectors = [
                "article.job-tile h3 a", # Upwork New Feed
                ".up-card-section h3 a", # Older Upwork layout
            ]
            for sel in selectors:
                loc = page.locator(sel)
                count = await loc.count()
                if count > 1:
                    # Pick a random card (but not the first one, which we might be processing)
                    idx = random.randint(1, count - 1)
                    target = loc.nth(idx)
                    href = await target.get_attribute("href")
                    if not isinstance(href, str) or "/jobs/" not in href:
                        continue
                    log.info("human_behavior.harmless_click", site_id=site_id, selector=sel, index=idx)

                    # Human click + short read + go back
                    await human_click(target, humanize=True)
                    await asyncio.sleep(random.uniform(3.0, 8.0))

                    # Go back to the original context
                    await page.go_back()
                    await after_navigation_settle(page, humanize=True, ready_selector=None)
                    break
        # Add other sites as needed
    except Exception as e:
        log.warning("human_behavior.harmless_click_failed", site_id=site_id, error=str(e))

