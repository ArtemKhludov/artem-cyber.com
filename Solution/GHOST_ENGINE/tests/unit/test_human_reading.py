"""Unit tests for reading dwell math (no Playwright)."""

from __future__ import annotations

import random

from ghost_engine.browser.human_behavior import compute_target_read_ms


def _cfg(**overrides: object) -> dict[str, object]:
    base: dict[str, object] = {
        "ms_per_word_min": 65,
        "ms_per_word_max": 105,
        "reading_total_jitter_ms_min": -80.0,
        "reading_total_jitter_ms_max": 420.0,
        "dwell_total_ms_min": 1400,
        "dwell_total_ms_max": 26000,
    }
    base.update(overrides)
    return base


def test_compute_target_read_ms_reproducible_with_seed() -> None:
    cfg = _cfg()
    r1 = random.Random(999_888)
    r2 = random.Random(999_888)
    assert compute_target_read_ms(120, cfg, r1) == compute_target_read_ms(120, cfg, r2)


def test_compute_target_read_ms_clamps_to_minimum() -> None:
    cfg = _cfg(
        ms_per_word_min=10,
        ms_per_word_max=10,
        reading_total_jitter_ms_min=-500.0,
        reading_total_jitter_ms_max=-100.0,
        dwell_total_ms_min=1400,
        dwell_total_ms_max=50000,
    )
    rng = random.Random(0)
    assert compute_target_read_ms(0, cfg, rng) == 1400


def test_compute_target_read_ms_clamps_to_maximum() -> None:
    cfg = _cfg(
        ms_per_word_min=100,
        ms_per_word_max=100,
        reading_total_jitter_ms_min=0.0,
        reading_total_jitter_ms_max=0.0,
        dwell_total_ms_min=100,
        dwell_total_ms_max=26000,
    )
    rng = random.Random(1)
    assert compute_target_read_ms(1_000_000, cfg, rng) == 26000


def test_compute_target_read_ms_differs_across_seeds_usually() -> None:
    cfg = _cfg()
    a = compute_target_read_ms(200, cfg, random.Random(1))
    b = compute_target_read_ms(200, cfg, random.Random(2))
    assert a != b
