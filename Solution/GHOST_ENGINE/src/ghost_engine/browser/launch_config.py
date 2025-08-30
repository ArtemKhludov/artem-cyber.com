"""Load `config/browser.yaml` and merge env secrets into Camoufox / Playwright launch kwargs."""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Any
from urllib.parse import unquote, urlparse

import yaml
from browserforge.fingerprints import Screen

from ghost_engine.browser.profile_fingerprint import materialize_pinned_fingerprint
from ghost_engine.config.settings import Settings

GeoIPInput = bool | str | None


def _project_config_dir(settings: Settings) -> Path:
    return settings.config_dir


def load_browser_yaml(settings: Settings) -> dict[str, Any]:
    path = _project_config_dir(settings) / "browser.yaml"
    if not path.is_file():
        return {}
    with path.open("r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    return data if isinstance(data, dict) else {}


def fingerprint_target_os() -> str:
    plat = sys.platform
    if plat == "darwin":
        return "macos"
    if plat.startswith("linux"):
        return "linux"
    if plat == "win32":
        return "windows"
    return "linux"


def _proxy_from_url(url: str) -> dict[str, str]:
    parsed = urlparse(url.strip())
    if not parsed.scheme or not parsed.hostname:
        raise ValueError("Proxy URL must include scheme and host")
    port = parsed.port
    if port is None:
        port = 443 if parsed.scheme == "https" else 80
    server = f"{parsed.scheme}://{parsed.hostname}:{port}"
    out: dict[str, str] = {"server": server}
    if parsed.username:
        out["username"] = unquote(parsed.username)
    if parsed.password:
        out["password"] = unquote(parsed.password)
    return out


def resolve_playwright_proxy(settings: Settings, yaml_cfg: dict[str, Any]) -> dict[str, str] | None:
    explicit = yaml_cfg.get("playwright_proxy")
    if isinstance(explicit, dict):
        server = explicit.get("server")
        if isinstance(server, str) and server.strip():
            proxy: dict[str, str] = {"server": server.strip()}
            u = explicit.get("username")
            p = explicit.get("password")
            if isinstance(u, str) and u:
                proxy["username"] = u
            if isinstance(p, str) and p:
                proxy["password"] = p
            return proxy

    bd = settings.brightdata_proxy_url
    if bd is not None:
        return _proxy_from_url(bd.get_secret_value())

    return None


def oauth_popup_resize_target(settings: Settings) -> tuple[int, int]:
    """
    Target size for small OAuth popups (Google account picker often opens ~500×600).
    Set camoufox.oauth_popup_auto_resize: false to disable hook in launcher.
    """
    yaml_cfg = load_browser_yaml(settings)
    cam = yaml_cfg.get("camoufox") or {}
    if not isinstance(cam, dict):
        cam = {}
    if cam.get("oauth_popup_auto_resize") is False:
        return (0, 0)
    w = int(cam.get("oauth_popup_min_width", 1024))
    h = int(cam.get("oauth_popup_min_height", 768))
    return (max(640, w), max(520, h))


def build_screen(cam: dict[str, Any]) -> Screen:
    sc = cam.get("screen") or {}
    return Screen(
        min_width=int(sc.get("min_width", 1280)),
        max_width=int(sc.get("max_width", 1920)),
        min_height=int(sc.get("min_height", 720)),
        max_height=int(sc.get("max_height", 1080)),
    )


def build_camoufox_options(
    settings: Settings,
    profile_name: str,
    *,
    headless: bool,
    humanize: bool,
    geoip: GeoIPInput,
) -> dict[str, Any]:
    yaml_cfg = load_browser_yaml(settings)
    cam = yaml_cfg.get("camoufox") or {}
    if not isinstance(cam, dict):
        cam = {}

    user_data = settings.profiles_dir / profile_name
    user_data.mkdir(parents=True, exist_ok=True)

    os_opt = cam.get("fingerprint_os")
    if os_opt is None or (isinstance(os_opt, str) and not os_opt.strip()):
        target_os: str | list[str] = fingerprint_target_os()
    elif isinstance(os_opt, list):
        target_os = [str(x) for x in os_opt]
    else:
        target_os = str(os_opt)

    screen = build_screen(cam)
    window_raw = cam.get("window") or [1440, 900]
    if (
        isinstance(window_raw, list)
        and len(window_raw) == 2
        and all(isinstance(x, int) for x in window_raw)
    ):
        window: tuple[int, int] = (window_raw[0], window_raw[1])
    else:
        window = (1440, 900)

    humanize_kw: bool | float
    if humanize:
        hmax = cam.get("humanize_max_seconds")
        humanize_kw = float(hmax) if hmax is not None else True
    else:
        humanize_kw = False

    locale = cam.get("locale")
    locale_kw = str(locale) if isinstance(locale, str) and locale.strip() else None

    proxy = resolve_playwright_proxy(settings, yaml_cfg)

    extra_prefs = cam.get("extra_firefox_prefs")
    firefox_user_prefs: dict[str, Any] = {}
    if isinstance(extra_prefs, dict):
        firefox_user_prefs = dict(extra_prefs)

    license_key = settings.camoufox_license
    env_override: dict[str, str] | None = None
    if license_key is not None:
        env_override = {**dict(os.environ), "CAMOUFOX_LICENSE": license_key.get_secret_value()}

    kwargs: dict[str, Any] = {
        "persistent_context": True,
        "user_data_dir": str(user_data.resolve()),
        "headless": headless,
        "humanize": humanize_kw,
        "os": target_os,
        "screen": screen,
        "window": window,
        "disable_coop": bool(cam.get("disable_coop", True)),
        "block_webrtc": bool(cam.get("block_webrtc", True)),
        "enable_cache": bool(cam.get("enable_cache", True)),
        "geoip": geoip,
        "proxy": proxy,
        "firefox_user_prefs": firefox_user_prefs,
    }

    pin_fp = cam.get("pin_profile_fingerprint", True) is not False
    env_pin = (os.environ.get("GHOST_PIN_PROFILE_FINGERPRINT") or "").strip().lower()
    if env_pin in ("0", "false", "no", "off"):
        pin_fp = False
    elif env_pin in ("1", "true", "yes", "on"):
        pin_fp = True

    fp_pinned = materialize_pinned_fingerprint(
        user_data,
        profile_name,
        screen=screen,
        window=window,
        headless=headless,
        target_os=target_os,
        pin_enabled=pin_fp,
    )
    if fp_pinned is not None:
        kwargs["fingerprint"] = fp_pinned
        # Camoufox LeakWarning: intentional pinned fingerprint + existing disable_coop defaults.
        kwargs["i_know_what_im_doing"] = True

    if locale_kw:
        kwargs["locale"] = locale_kw
    if env_override is not None:
        kwargs["env"] = env_override

    return kwargs
