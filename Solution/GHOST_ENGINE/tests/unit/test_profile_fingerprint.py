"""Roundtrip tests for pinned Camoufox fingerprint JSON."""

from __future__ import annotations

from pathlib import Path

from browserforge.fingerprints import Screen
from camoufox.fingerprints import generate_fingerprint

from ghost_engine.browser.profile_fingerprint import (
    SCHEMA_VERSION,
    load_fingerprint,
    materialize_pinned_fingerprint,
    save_fingerprint,
)


def test_save_load_roundtrip_user_agent_stable(tmp_path: Path) -> None:
    sc = Screen(min_width=1280, max_width=1920, min_height=720, max_height=1080)
    fp = generate_fingerprint(screen=sc, window=(1440, 900), os="macos")
    path = tmp_path / "ghost_engine_camoufox_fingerprint.json"
    save_fingerprint(path, fp)
    fp2 = load_fingerprint(path)
    assert fp2 is not None
    assert fp2.navigator.userAgent == fp.navigator.userAgent
    assert fp2.screen.width == fp.screen.width


def test_load_wrong_schema_returns_none(tmp_path: Path) -> None:
    path = tmp_path / "x.json"
    path.write_text('{"schema_version": 0, "fingerprint": {}}', encoding="utf-8")
    assert load_fingerprint(path) is None


def test_materialize_respects_pin_disabled(tmp_path: Path) -> None:
    sc = Screen(min_width=1280, max_width=1920, min_height=720, max_height=1080)
    out = materialize_pinned_fingerprint(
        tmp_path,
        "p",
        screen=sc,
        window=(1440, 900),
        headless=False,
        target_os="macos",
        pin_enabled=False,
    )
    assert out is None


def test_materialize_creates_file_when_enabled(tmp_path: Path) -> None:
    sc = Screen(min_width=1280, max_width=1920, min_height=720, max_height=1080)
    fp = materialize_pinned_fingerprint(
        tmp_path,
        "p",
        screen=sc,
        window=(1440, 900),
        headless=False,
        target_os="macos",
        pin_enabled=True,
    )
    assert fp is not None
    stored = tmp_path / "ghost_engine_camoufox_fingerprint.json"
    assert stored.is_file()
    raw = stored.read_text(encoding="utf-8")
    assert f'"schema_version": {SCHEMA_VERSION}' in raw
