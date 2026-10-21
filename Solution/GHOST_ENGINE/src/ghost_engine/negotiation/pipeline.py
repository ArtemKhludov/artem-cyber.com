"""Load ``config/negotiation_pipeline.yaml`` (cockpit flags for cover-letter steps)."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from ghost_engine.config.settings import get_settings


def _load_yaml(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    with path.open("r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    return data if isinstance(data, dict) else {}


def load_negotiation_pipeline() -> dict[str, Any]:
    """Load pipeline YAML from ``Settings.config_dir`` (re-read each call for cockpit edits)."""
    path = get_settings().config_dir / "negotiation_pipeline.yaml"
    return _load_yaml(path)


def cover_letter_section(pipeline: dict[str, Any] | None = None) -> dict[str, Any]:
    raw = pipeline if pipeline is not None else load_negotiation_pipeline()
    cl = raw.get("cover_letter")
    return cl if isinstance(cl, dict) else {}
