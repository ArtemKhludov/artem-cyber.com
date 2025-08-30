"""
Two-lane coordination for concurrent Ollama HTTP on one asyncio event loop.

- **UI lane** (higher priority): L2 gray judge, cover-letter output safety — operator /
  Camoufox-sensitive paths should not wait behind background scoring LLM.
- **Background lane**: budget_llm_infer, semantic safety on job text — waits while any
  UI holder is active, then proceeds.

Within one sequential ``ainvoke_scoring_graph`` job, ``budget_infer`` runs before L2,
so lanes mainly help when multiple coroutines call Ollama on the same loop (parallel work,
or safety + graph overlap).

Enable via ``ollama_lanes.enabled`` in ``config/scoring.yaml`` (default True when key absent).
"""

from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator
from ghost_engine.utils.logger import get_logger

log = get_logger(__name__)


class OllamaLaneCoordinator:
    """``ui_lane`` holders block ``wait_background_turn`` waiters."""

    __slots__ = ("_ui_active", "_cond")

    def __init__(self) -> None:
        self._ui_active = 0
        self._cond = asyncio.Condition()

    @asynccontextmanager
    async def ui_lane(self) -> AsyncIterator[None]:
        async with self._cond:
            self._ui_active += 1
        try:
            yield
        finally:
            async with self._cond:
                self._ui_active -= 1
                self._cond.notify_all()

    async def wait_background_turn(self) -> None:
        async with self._cond:
            while self._ui_active > 0:
                await self._cond.wait()


_coordinator = OllamaLaneCoordinator()
_root_checked: bool = False
_lanes_enabled: bool = True


def _load_lanes_enabled_from_yaml() -> bool:
    global _root_checked, _lanes_enabled
    if _root_checked:
        return _lanes_enabled
    _root_checked = True
    try:
        from ghost_engine.scoring.engine import ScoringEngine

        root = ScoringEngine().scoring_root
        block = root.get("ollama_lanes")
        if not isinstance(block, dict):
            _lanes_enabled = True
            return _lanes_enabled
        v = block.get("enabled")
        _lanes_enabled = v is not False
        return _lanes_enabled
    except Exception as exc:
        log.warning("ollama_lanes.config_read_failed", error=str(exc))
        _lanes_enabled = True
        return _lanes_enabled


def reset_ollama_lanes_config_cache_for_tests() -> None:
    """Test-only: force re-read of YAML flag."""
    global _root_checked
    _root_checked = False


def ollama_lanes_enabled() -> bool:
    return _load_lanes_enabled_from_yaml()


@asynccontextmanager
async def ollama_ui_lane() -> AsyncIterator[None]:
    if not ollama_lanes_enabled():
        yield
        return
    async with _coordinator.ui_lane():
        yield


async def ollama_wait_background_turn() -> None:
    if not ollama_lanes_enabled():
        return
    await _coordinator.wait_background_turn()
