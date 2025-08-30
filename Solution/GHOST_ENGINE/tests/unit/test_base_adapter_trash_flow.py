"""BaseSiteAdapter: sieve via scoring graph, trash JSONL, notify enqueue."""

from __future__ import annotations

from unittest.mock import AsyncMock

import pytest

from ghost_engine.adapters.contra_adapter import ContraAdapter
from ghost_engine.scoring.engine import L0_CODE_BLACKLISTED_COUNTRY, L0_CODE_PASS


@pytest.fixture(autouse=True)
def _stub_notify_enqueue_adapter(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        "ghost_engine.notify.redis_queue.enqueue_notify_job_async",
        AsyncMock(return_value=True),
    )


@pytest.fixture(autouse=True)
def _disable_pg_scoring_registry(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GHOST_DB_SCORING_REGISTRY", "0")


def _minimal_site_yaml(tmp) -> object:
    p = tmp / "site.yaml"
    p.write_text(
        "site_id: contra\nurl: https://example.com\ngraphql:\n  jobs_endpoint: https://example.com/gql\n",
        encoding="utf-8",
    )
    return p


@pytest.fixture
def nonempty_contra_payload() -> dict:
    return {
        "data": {
            "feed": {
                "items": [
                    {
                        "title": "Build API",
                        "description": "REST",
                        "id": "x1",
                        "amount": {"amount": 300.0},
                    }
                ]
            }
        }
    }


def _sig_x1() -> dict:
    return {
        "job_id": "x1",
        "title": "Build API",
        "description": "REST",
        "budget_value": 300.0,
        "budget_type": "fixed",
        "source_site": "contra",
        "client_stats": {"country": "USA", "avg_rating": 5.0},
    }


async def test_l0_fail_skips_save_and_appends_trash(
    monkeypatch, tmp_path, nonempty_contra_payload
) -> None:
    trash_rows: list[dict] = []

    def capture_trash(site_id: str, rec: dict, *, root=None) -> None:
        trash_rows.append(dict(rec))

    monkeypatch.setattr(
        "ghost_engine.scoring.trash_log.append_trash_entry",
        capture_trash,
    )
    save_mock = AsyncMock()
    monkeypatch.setattr(
        "ghost_engine.adapters.base_adapter.save_graphql_payload_async",
        save_mock,
    )

    async def mock_graph(_state: dict) -> dict:
        return {
            "job_signal": _sig_x1(),
            "l0_passed": False,
            "l0_code": L0_CODE_BLACKLISTED_COUNTRY,
            "l0_detail": "DROP: blacklisted_country job_id=x1",
        }

    monkeypatch.setattr("ghost_engine.agents.graph.ainvoke_scoring_graph", mock_graph)

    adapter = ContraAdapter(_minimal_site_yaml(tmp_path))
    await adapter.save_graphql_sniff_payload(nonempty_contra_payload)

    save_mock.assert_not_awaited()
    assert len(trash_rows) == 1
    assert trash_rows[0]["reason_code"] == L0_CODE_BLACKLISTED_COUNTRY
    assert trash_rows[0]["job_id"] == "x1"


async def test_l0_pass_calls_save_and_enqueue(
    monkeypatch, tmp_path, nonempty_contra_payload
) -> None:
    trash_rows: list[dict] = []

    def capture_trash(site_id: str, rec: dict, *, root=None) -> None:
        trash_rows.append(dict(rec))

    monkeypatch.setattr(
        "ghost_engine.scoring.trash_log.append_trash_entry",
        capture_trash,
    )
    save_mock = AsyncMock(return_value="data/contra/jobs/2000-01-01/mock.json")
    monkeypatch.setattr(
        "ghost_engine.adapters.base_adapter.save_graphql_payload_async",
        save_mock,
    )
    enq = AsyncMock(return_value=True)
    monkeypatch.setattr(
        "ghost_engine.notify.redis_queue.enqueue_notify_job_async",
        enq,
    )

    async def mock_graph(_state: dict) -> dict:
        return {
            "job_signal": _sig_x1(),
            "l0_passed": True,
            "l0_code": L0_CODE_PASS,
            "l0_detail": "ok",
            "gri": 0.9,
            "persona_tag": "consultant",
            "job_tier": "MANUAL_REVIEW",
            "approved_jobs": [
                {
                    "job_id": "x1",
                    "site_id": "contra",
                    "l1_score": 90,
                    "job_signal": _sig_x1(),
                    "opsec": {},
                    "needs_manual_review": False,
                    "gri": 0.9,
                    "persona_tag": "consultant",
                    "job_tier": "MANUAL_REVIEW",
                }
            ],
        }

    monkeypatch.setattr("ghost_engine.agents.graph.ainvoke_scoring_graph", mock_graph)
    sync_payloads: list = []

    def capture_sync(_url: object, payload: object) -> None:
        sync_payloads.append(payload)

    monkeypatch.setattr(
        "ghost_engine.agents.nodes.cover_letter_node.enqueue_notify_job_sync",
        capture_sync,
    )

    adapter = ContraAdapter(_minimal_site_yaml(tmp_path))
    await adapter.save_graphql_sniff_payload(nonempty_contra_payload)

    save_mock.assert_awaited_once()
    assert trash_rows == []
    assert enq.await_count == 0
    assert len(sync_payloads) == 1
    arg_payload = sync_payloads[0]
    assert arg_payload.gri == pytest.approx(0.9)
    assert arg_payload.persona_tag == "consultant"


async def test_insufficient_signal_preflight_skips_graph_and_trash(monkeypatch, tmp_path) -> None:
    trash_rows: list[dict] = []

    def capture_trash(site_id: str, rec: dict, *, root=None) -> None:
        trash_rows.append(dict(rec))

    monkeypatch.setattr(
        "ghost_engine.scoring.trash_log.append_trash_entry",
        capture_trash,
    )
    save_mock = AsyncMock()
    monkeypatch.setattr(
        "ghost_engine.adapters.base_adapter.save_graphql_payload_async",
        save_mock,
    )

    graph_mock = AsyncMock(
        side_effect=AssertionError("scoring graph must not run when preflight signal is empty")
    )
    monkeypatch.setattr("ghost_engine.agents.graph.ainvoke_scoring_graph", graph_mock)

    adapter = ContraAdapter(_minimal_site_yaml(tmp_path))
    await adapter.save_graphql_sniff_payload({"data": {}})

    save_mock.assert_not_awaited()
    graph_mock.assert_not_awaited()
    assert trash_rows == []
