"""Create, load, and backup Camoufox profile directories."""

from __future__ import annotations

import shutil
from datetime import UTC, datetime
from pathlib import Path

from playwright.async_api import BrowserContext

from ghost_engine.config.settings import get_settings


def ensure_profile(name: str) -> Path:
    settings = get_settings()
    path = settings.profiles_dir / name
    path.mkdir(parents=True, exist_ok=True)
    return path


async def export_storage_state(context: BrowserContext, path: Path) -> Path:
    """Write cookies/localStorage snapshot for rotation / backup (main_plan export/import)."""
    path.parent.mkdir(parents=True, exist_ok=True)
    await context.storage_state(path=str(path.resolve()))
    return path.resolve()


def backup_profile(name: str) -> Path:
    settings = get_settings()
    src = settings.profiles_dir / name
    backup_root = settings.profiles_dir / "backup"
    backup_root.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(tz=UTC).strftime("%Y%m%d_%H%M%S")
    dest = backup_root / f"{name}_{stamp}"
    if src.exists():
        shutil.copytree(src, dest)
    return dest
