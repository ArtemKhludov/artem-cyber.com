"""
Pin Browserforge/Camoufox fingerprint JSON next to the Firefox user_data profile.

Without pinning, Camoufox draws a new random fingerprint every process start while reusing
the same cookies — sites often treat that as a new device and force re-login.
"""

from __future__ import annotations

import json
from dataclasses import asdict
from pathlib import Path
from typing import Any

from browserforge.fingerprints import (
    Fingerprint,
    NavigatorFingerprint,
    Screen,
    ScreenFingerprint,
    VideoCard,
)
from camoufox.fingerprints import ExtendedScreen, generate_fingerprint
from camoufox.utils import get_screen_cons

from ghost_engine.utils.logger import get_logger

log = get_logger(__name__)

FINGERPRINT_FILENAME = "ghost_engine_camoufox_fingerprint.json"
SCHEMA_VERSION = 1


def _screen_from_dict(d: dict[str, Any]) -> ScreenFingerprint:
    """Restore screen; Camoufox may persist ExtendedScreen (+ optional screenY)."""
    return ExtendedScreen(**d)


def _fingerprint_from_dict(data: dict[str, Any]) -> Fingerprint:
    screen = _screen_from_dict(data["screen"])
    nav = NavigatorFingerprint(**data["navigator"])
    vc = VideoCard(**data["videoCard"]) if data.get("videoCard") else None
    return Fingerprint(
        screen=screen,
        navigator=nav,
        headers=data["headers"],
        videoCodecs=data["videoCodecs"],
        audioCodecs=data["audioCodecs"],
        pluginsData=data["pluginsData"],
        battery=data.get("battery"),
        videoCard=vc,
        multimediaDevices=data["multimediaDevices"],
        fonts=data["fonts"],
        mockWebRTC=data.get("mockWebRTC"),
        slim=data.get("slim"),
    )


def load_fingerprint(path: Path) -> Fingerprint | None:
    if not path.is_file():
        return None
    try:
        raw = path.read_text(encoding="utf-8")
        wrapper = json.loads(raw)
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        log.warning("profile_fingerprint.load_failed", path=str(path), error=str(exc))
        return None
    if not isinstance(wrapper, dict):
        return None
    if wrapper.get("schema_version") != SCHEMA_VERSION:
        log.warning(
            "profile_fingerprint.schema_mismatch",
            path=str(path),
            version=wrapper.get("schema_version"),
        )
        return None
    fp_data = wrapper.get("fingerprint")
    if not isinstance(fp_data, dict):
        return None
    try:
        return _fingerprint_from_dict(fp_data)
    except (TypeError, KeyError, ValueError) as exc:
        log.warning("profile_fingerprint.parse_failed", path=str(path), error=str(exc))
        return None


def save_fingerprint(path: Path, fp: Fingerprint) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    wrapper = {"schema_version": SCHEMA_VERSION, "fingerprint": asdict(fp)}
    path.write_text(json.dumps(wrapper, indent=2), encoding="utf-8")


def materialize_pinned_fingerprint(
    user_data: Path,
    profile_name: str,
    *,
    screen: Screen | None,
    window: tuple[int, int],
    headless: bool,
    target_os: str | list[str],
    pin_enabled: bool,
) -> Fingerprint | None:
    """
    Load pinned fingerprint from ``user_data`` or generate once and save.

    Returns ``None`` when pinning is off (Camoufox keeps its per-launch random fingerprint).
    """
    if not pin_enabled:
        return None
    fp_path = user_data / FINGERPRINT_FILENAME
    loaded = load_fingerprint(fp_path)
    if loaded is not None:
        log.info("profile_fingerprint.loaded", profile=profile_name, path=str(fp_path))
        return loaded

    eff_screen = screen if screen is not None else get_screen_cons(headless)
    fp = generate_fingerprint(screen=eff_screen, window=window, os=target_os)
    try:
        save_fingerprint(fp_path, fp)
        log.info("profile_fingerprint.created", profile=profile_name, path=str(fp_path))
    except OSError as exc:
        log.warning("profile_fingerprint.save_failed", path=str(fp_path), error=str(exc))
    return fp
