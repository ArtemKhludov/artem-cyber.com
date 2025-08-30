"""Map site_id (from YAML) to adapter factory callables."""

from __future__ import annotations

from collections.abc import Callable

from ghost_engine.adapters.arc_adapter import load_default as load_arc_dev
from ghost_engine.adapters.base_adapter import BaseSiteAdapter
from ghost_engine.adapters.contra_adapter import load_default as load_contra
from ghost_engine.adapters.gun_io_adapter import load_default as load_gun_io
from ghost_engine.adapters.toptal_adapter import load_default as load_toptal
from ghost_engine.adapters.upwork_adapter import load_default as load_upwork

# Keys must match site_id in config/sites/*.yaml
SITE_LOADERS: dict[str, Callable[[], BaseSiteAdapter]] = {
    "upwork": load_upwork,
    "arc_dev": load_arc_dev,
    "gun_io": load_gun_io,
    "toptal": load_toptal,
    "contra": load_contra,
}


def load_site_adapter(site_id: str) -> BaseSiteAdapter:
    """Return a loaded adapter for the given site_id."""
    loader = SITE_LOADERS.get(site_id)
    if loader is None:
        supported = ", ".join(sorted(SITE_LOADERS))
        raise KeyError(f"Unknown site_id {site_id!r}; supported: {supported}")
    return loader()
