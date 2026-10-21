"""Tests for shared GraphQL sniff dump path."""

from __future__ import annotations

import pytest

from ghost_engine.adapters.graphql_payload_storage import save_graphql_payload_async


@pytest.mark.asyncio
async def test_save_graphql_payload_writes_under_data_site(tmp_path, monkeypatch) -> None:
    from ghost_engine.adapters import graphql_payload_storage as gps

    monkeypatch.setattr(gps, "_repo_root", lambda: tmp_path)
    rel = await save_graphql_payload_async("toptal", {"data": {"ok": True}})
    assert rel.startswith("data/toptal/jobs/")
    assert rel.endswith(".json")
    jobs = list((tmp_path / "data" / "toptal" / "jobs").rglob("*.json"))
    assert len(jobs) == 1
    text = jobs[0].read_text(encoding="utf-8")
    assert "ok" in text


@pytest.mark.asyncio
async def test_save_sanitizes_unsafe_site_id(tmp_path, monkeypatch) -> None:
    from ghost_engine.adapters import graphql_payload_storage as gps

    monkeypatch.setattr(gps, "_repo_root", lambda: tmp_path)
    await save_graphql_payload_async("../evil", {"a": 1})
    assert (tmp_path / "data" / "unknown" / "jobs").exists()


def test_repo_root_points_at_project(tmp_path) -> None:
    # Smoke: real _repo_root is parent of data/ in repo
    from ghost_engine.adapters.graphql_payload_storage import _repo_root

    root = _repo_root()
    assert (root / "config").is_dir()
