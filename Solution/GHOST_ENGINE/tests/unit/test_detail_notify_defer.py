"""Two-phase notify: defer Telegram until job detail URL is opened (Upwork)."""

from __future__ import annotations

from unittest.mock import AsyncMock

import pytest

from ghost_engine.adapters.upwork_adapter import UpworkAdapter
from ghost_engine.scoring.engine import L0_CODE_PASS
from ghost_engine.scoring.feed_reading import FeedReadingConfig, default_feed_reading_config
from ghost_engine.scoring import job_quality_matrix as job_quality_matrix_mod


@pytest.fixture(autouse=True)
def _stub_redis_notify(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        "ghost_engine.notify.redis_queue.enqueue_notify_job_async",
        AsyncMock(return_value=True),
    )


@pytest.fixture(autouse=True)
def _disable_pg_scoring_registry(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GHOST_DB_SCORING_REGISTRY", "0")


@pytest.fixture(autouse=True)
def _disable_job_quality_matrix_for_adapter_mocks(monkeypatch: pytest.MonkeyPatch) -> None:
    """Mock graph output lacks rich signal; repo scoring.yaml matrix would block."""

    def _mq_off(
        *_a: object,
        **_k: object,
    ) -> job_quality_matrix_mod.JobQualityMatrixResult:
        return job_quality_matrix_mod.JobQualityMatrixResult(
            enabled=False,
            passed=True,
            client_pts=0,
            activity_pts=0,
            description_pts=0,
            penalty_hits=0,
            effective_total=0,
        )

    monkeypatch.setattr(job_quality_matrix_mod, "evaluate_job_quality_matrix", _mq_off)


def _upwork_site_yaml(tmp_path: object) -> object:
    p = tmp_path / "upwork.yaml"
    p.write_text(
        "site_id: upwork\n"
        "url: https://www.upwork.com/nx/find-work/\n"
        "feed_url: https://www.upwork.com/nx/find-work/\n"
        'apply_url_template: "https://www.upwork.com/ab/proposals/job/{job_id}/apply/"\n'
        "graphql:\n"
        "  jobs_endpoint: https://www.upwork.com/api/graphql/v1\n"
        "selectors:\n"
        '  logged_in_bootstrap: "main"\n'
        '  login_button: "a"\n'
        '  login_username_input: "input"\n'
        '  login_password_input: "input"\n'
        '  login_continue_button: "button"\n'
        '  nav_messages_button: "a"\n'
        '  load_more_button: "button"\n',
        encoding="utf-8",
    )
    return p


def _upwork_graphql_payload() -> dict:
    return {
        "data": {
            "jobPubDetails": {
                "opening": {
                    "description": "Desc",
                    "info": {"id": "99", "title": "T", "type": "HOURLY"},
                    "budget": {"amount": 0.0},
                    "extendedBudgetInfo": {
                        "hourlyBudgetMin": 10.0,
                        "hourlyBudgetMax": 25.0,
                    },
                },
                "buyer": {
                    "location": {"country": "USA"},
                    "stats": {
                        "totalCharges": 100.0,
                        "score": 4.8,
                        "feedbackCount": 3,
                        "avgHourlyRatePaid": 22.0,
                    },
                    "isPaymentMethodVerified": True,
                },
            }
        }
    }


def _graph_state_high_gri() -> dict:
    return {
        "site_id": "upwork",
        "job_signal": {
            "job_id": "99",
            "title": "T",
            "description": "Desc",
            "budget_value": 25.0,
            "budget_type": "hourly",
            "source_site": "upwork",
            "client_stats": {"country": "USA", "avg_rating": 5.0},
        },
        "l0_passed": True,
        "l0_code": L0_CODE_PASS,
        "l0_detail": "ok",
        "gri": 0.9,
        "persona_tag": "consultant",
        "job_tier": "MANUAL_REVIEW",
        "approved_jobs": [],
    }


def _fr_with_defer(*, defer: bool, save_min: float = 0.85) -> FeedReadingConfig:
    b = default_feed_reading_config()
    return FeedReadingConfig(
        enabled=b.enabled,
        linger_min_gri=b.linger_min_gri,
        linger_sleep_ms_min=b.linger_sleep_ms_min,
        linger_sleep_ms_max=b.linger_sleep_ms_max,
        save_min_gri=save_min,
        pause_before_save_ms_min=b.pause_before_save_ms_min,
        pause_before_save_ms_max=b.pause_before_save_ms_max,
        max_cards_per_round=b.max_cards_per_round,
        defer_notify_until_job_detail=defer,
        detail_notify_wait_timeout_sec=b.detail_notify_wait_timeout_sec,
    )


@pytest.fixture
def defer_on_feed_reading(monkeypatch: pytest.MonkeyPatch) -> None:
    def _fr(_root: object) -> FeedReadingConfig:
        return _fr_with_defer(defer=True)

    monkeypatch.setattr(
        "ghost_engine.scoring.feed_reading.feed_reading_from_scoring_root",
        _fr,
    )


async def test_defer_first_sniff_queues_pending_no_cover(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: object,
    defer_on_feed_reading: None,
) -> None:
    monkeypatch.setattr(
        "ghost_engine.notify.dom_notify_policy.should_defer_upwork_notify_for_dom_url",
        lambda: False,
    )
    save_mock = AsyncMock(return_value="data/upwork/jobs/2000-01-01/mock.json")
    monkeypatch.setattr(
        "ghost_engine.adapters.base_adapter.save_graphql_payload_async",
        save_mock,
    )
    registry_calls: list[tuple[str, str]] = []

    async def cap_registry(site_id: str, job_id: str, outcome: str, **kwargs: object) -> None:
        registry_calls.append((outcome, job_id))

    for _mod in (
        "ghost_engine.adapters.base_adapter",
        "ghost_engine.adapters.upwork_adapter",
    ):
        monkeypatch.setattr(f"{_mod}._registry_record_job_event", cap_registry)
    def _no_cover(_final: dict) -> dict:
        raise AssertionError("cover must not run when deferred")

    monkeypatch.setattr(
        "ghost_engine.agents.nodes.cover_letter_node.cover_letter_node",
        _no_cover,
    )

    async def mock_graph(_state: dict) -> dict:
        return _graph_state_high_gri()

    monkeypatch.setattr("ghost_engine.agents.graph.ainvoke_scoring_graph", mock_graph)

    adapter = UpworkAdapter(_upwork_site_yaml(tmp_path))
    await adapter.save_graphql_sniff_payload(_upwork_graphql_payload())

    save_mock.assert_awaited_once()
    assert "99" in adapter._jobs_awaiting_detail_notify
    assert "99" not in adapter._jobs_detail_goto_done
    assert list(adapter.pending_jobs_to_read) == ["99"]
    assert ("defer_detail_notify", "99") in registry_calls
    assert not any(o == "notify_enqueued" for o, _ in registry_calls)


async def test_defer_duplicate_feed_sniff_skips_double_pending(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: object,
    defer_on_feed_reading: None,
) -> None:
    monkeypatch.setattr(
        "ghost_engine.notify.dom_notify_policy.should_defer_upwork_notify_for_dom_url",
        lambda: False,
    )
    monkeypatch.setattr(
        "ghost_engine.adapters.base_adapter.save_graphql_payload_async",
        AsyncMock(return_value="data/upwork/jobs/x.json"),
    )
    monkeypatch.setattr(
        "ghost_engine.adapters.base_adapter._registry_record_job_event",
        AsyncMock(),
    )
    monkeypatch.setattr(
        "ghost_engine.agents.nodes.cover_letter_node.cover_letter_node",
        lambda _s: {},
    )

    async def mock_graph(_state: dict) -> dict:
        return _graph_state_high_gri()

    monkeypatch.setattr("ghost_engine.agents.graph.ainvoke_scoring_graph", mock_graph)

    adapter = UpworkAdapter(_upwork_site_yaml(tmp_path))
    await adapter.save_graphql_sniff_payload(_upwork_graphql_payload())
    await adapter.save_graphql_sniff_payload(_upwork_graphql_payload())

    assert list(adapter.pending_jobs_to_read).count("99") == 1


async def test_after_goto_second_sniff_runs_cover_and_clears_state(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: object,
    defer_on_feed_reading: None,
) -> None:
    monkeypatch.setattr(
        "ghost_engine.notify.dom_notify_policy.should_defer_upwork_notify_for_dom_url",
        lambda: False,
    )
    monkeypatch.setattr(
        "ghost_engine.adapters.base_adapter.save_graphql_payload_async",
        AsyncMock(return_value="data/upwork/jobs/x.json"),
    )
    monkeypatch.setattr(
        "ghost_engine.adapters.base_adapter._registry_record_job_event",
        AsyncMock(),
    )
    sync_payloads: list = []

    def capture_sync(_url: object, payload: object) -> None:
        sync_payloads.append(payload)

    monkeypatch.setattr(
        "ghost_engine.agents.nodes.cover_letter_node.enqueue_notify_job_sync",
        capture_sync,
    )

    async def mock_graph(_state: dict) -> dict:
        return _graph_state_high_gri()

    monkeypatch.setattr("ghost_engine.agents.graph.ainvoke_scoring_graph", mock_graph)

    adapter = UpworkAdapter(_upwork_site_yaml(tmp_path))
    await adapter.save_graphql_sniff_payload(_upwork_graphql_payload())
    assert "99" in adapter._jobs_awaiting_detail_notify

    adapter.mark_detail_notify_goto_done("99")
    await adapter.save_graphql_sniff_payload(_upwork_graphql_payload())

    assert "99" not in adapter._jobs_awaiting_detail_notify
    assert "99" not in adapter._jobs_detail_goto_done
    assert len(sync_payloads) == 1


def test_should_enqueue_pending_skips_when_goto_done() -> None:
    adapter = UpworkAdapter.__new__(UpworkAdapter)
    adapter._jobs_detail_goto_done = {"42"}
    fr = _fr_with_defer(defer=False)
    assert adapter.should_enqueue_pending_job_read("42", 0.9, fr) is False
    assert adapter.should_enqueue_pending_job_read("43", 0.9, fr) is True
