"""Feed sortie ledger: per-iteration counters and summary text."""

from __future__ import annotations

import ghost_engine.scoring.feed_scoring_run_ledger as ledger


def test_sortie_summary_aggregates_and_clears_state(monkeypatch) -> None:
    monkeypatch.setenv("GHOST_TELEGRAM_FEED_SORTIE_SUMMARY", "0")
    ledger.begin_feed_sortie("upwork")
    ledger.record_feed_sortie_outcome(
        site_id="upwork",
        job_id="a",
        title_preview="T1",
        outcome_kind="l0_drop",
        reason_code="BUDGET_TOO_LOW",
        gri=None,
    )
    ledger.record_feed_sortie_outcome(
        site_id="upwork",
        job_id="b",
        title_preview="T2",
        outcome_kind="notify_gate",
        reason_code="NOTIFY_below_adapter_min_gri",
        gri=0.5,
    )
    txt = ledger.format_feed_sortie_summary_text(site_id="upwork", end_reason="test")
    assert txt is not None
    assert "Scored (GraphQL→graph): 2" in txt
    assert "l0_drop|BUDGET_TOO_LOW" in txt
    assert "notify_gate|NOTIFY_below_adapter_min_gri" in txt
    assert "Cut / skipped" in txt
    ledger._state = None  # manual clear after format (finalize would too)


def test_matrix_blocks_count_each_reason(monkeypatch) -> None:
    monkeypatch.setenv("GHOST_TELEGRAM_FEED_SORTIE_SUMMARY", "0")
    ledger.begin_feed_sortie("upwork")
    ledger.record_feed_sortie_matrix_blocks(
        site_id="upwork",
        job_id="j1",
        title_preview="T",
        blocking_reasons=["MATRIX_A", "MATRIX_B"],
        gri=0.4,
    )
    txt = ledger.format_feed_sortie_summary_text(site_id="upwork", end_reason="test")
    assert txt is not None
    assert "Scored (GraphQL→graph): 1" in txt
    assert "matrix_drop|MATRIX_A" in txt
    assert "matrix_drop|MATRIX_B" in txt
    assert "Quality matrix: jobs=1 · reason-hits=2" in txt
    assert "Cut / skipped" in txt
    ledger._state = None


def test_begin_resets_counters() -> None:
    ledger.begin_feed_sortie("upwork")
    ledger.record_feed_sortie_outcome(
        site_id="upwork",
        job_id="x",
        title_preview=None,
        outcome_kind="insufficient",
        reason_code="INSUFFICIENT_SIGNAL",
    )
    ledger.begin_feed_sortie("upwork")
    assert ledger._state is not None
    assert ledger._state.graph_invocations == 0
