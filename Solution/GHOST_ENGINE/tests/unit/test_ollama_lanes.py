"""Ollama UI vs background lane coordination."""

from __future__ import annotations

import asyncio

import pytest

from ghost_engine.scoring import ollama_lanes as ol


@pytest.mark.asyncio
async def test_background_waits_until_ui_lane_released(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(ol, "ollama_lanes_enabled", lambda: True)
    order: list[str] = []

    async def ui() -> None:
        async with ol.ollama_ui_lane():
            order.append("ui_in")
            await asyncio.sleep(0.08)
        order.append("ui_out")

    async def bg() -> None:
        await asyncio.sleep(0.01)
        await ol.ollama_wait_background_turn()
        order.append("bg_go")

    await asyncio.gather(ui(), bg())
    assert order == ["ui_in", "ui_out", "bg_go"]


@pytest.mark.asyncio
async def test_when_lanes_disabled_wait_is_noop(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(ol, "ollama_lanes_enabled", lambda: False)
    await ol.ollama_wait_background_turn()
    async with ol.ollama_ui_lane():
        pass
