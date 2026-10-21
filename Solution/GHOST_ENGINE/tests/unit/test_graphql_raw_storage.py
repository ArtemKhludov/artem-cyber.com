"""graphql_raw_storage: envelope files and TTL prune."""

from __future__ import annotations

import json
import os
import time
from pathlib import Path
from unittest.mock import MagicMock

import pytest

from ghost_engine.adapters.graphql_raw_storage import (
    capture_raw_graphql_response,
    prune_stale_graphql_raw_files,
    save_graphql_raw_payload_sync,
)


@pytest.fixture
def raw_root(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    monkeypatch.setattr(
        "ghost_engine.adapters.graphql_raw_storage._repo_root",
        lambda: tmp_path,
    )
    monkeypatch.setattr(
        "ghost_engine.adapters.graphql_raw_storage.data_archive_day_str",
        lambda: "2099-01-15",
    )
    monkeypatch.setattr(
        "ghost_engine.adapters.graphql_raw_storage.data_archive_time_prefix",
        lambda: "12-00-00",
    )
    monkeypatch.setattr(
        "ghost_engine.adapters.graphql_raw_storage.raw_capture_enabled",
        lambda: True,
    )
    return tmp_path


def test_save_graphql_raw_writes_envelope(raw_root: Path) -> None:
    rel = save_graphql_raw_payload_sync(
        "upwork",
        {"data": {"jobSearch": {"edges": []}}},
        channel="http",
        url="https://www.upwork.com/api/graphql/v1?alias=x",
        http_status=200,
    )
    assert rel is not None
    assert rel.startswith("data/upwork/graphql_raw/")
    p = raw_root / rel
    assert p.is_file()
    obj = json.loads(p.read_text(encoding="utf-8"))
    assert obj["channel"] == "http"
    assert obj["http_status"] == 200
    assert obj["graphql"] == {"data": {"jobSearch": {"edges": []}}}


def test_save_graphql_raw_disabled_returns_none(
    raw_root: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        "ghost_engine.adapters.graphql_raw_storage.raw_capture_enabled",
        lambda: False,
    )
    assert (
        save_graphql_raw_payload_sync(
            "upwork", {"a": 1}, channel="http", url="u", http_status=200
        )
        is None
    )


def test_prune_stale_graphql_raw_files_by_mtime(raw_root: Path) -> None:
    day = raw_root / "data" / "upwork" / "graphql_raw" / "2099-01-10"
    day.mkdir(parents=True)
    stale = day / "old.json"
    stale.write_text("{}", encoding="utf-8")
    ancient = time.time() - 10 * 86400
    os.utime(stale, (ancient, ancient))

    fresh = day / "new.json"
    fresh.write_text("{}", encoding="utf-8")

    deleted = prune_stale_graphql_raw_files(retention_days=2, site_glob="upwork")
    assert deleted == 1
    assert not stale.exists()
    assert fresh.exists()


def test_capture_raw_graphql_response_calls_prune(
    raw_root: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        "ghost_engine.adapters.graphql_raw_storage.maybe_prune_graphql_raw",
        MagicMock(),
    )
    capture_raw_graphql_response(
        "upwork",
        {"ok": True},
        channel="http",
        url="https://x/graphql",
        http_status=200,
    )
    from ghost_engine.adapters.graphql_raw_storage import maybe_prune_graphql_raw

    assert maybe_prune_graphql_raw.called
