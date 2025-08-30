"""notify-ping CLI."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

from ghost_engine.notify import notify_ping as np


def test_run_notify_queue_ping_success(monkeypatch) -> None:
    monkeypatch.setattr(np, "get_settings", lambda: MagicMock(redis_url="redis://localhost:6379/0", log_level="WARNING"))
    with patch.object(np, "enqueue_notify_job_sync", return_value=True) as enq:
        code = np.run_notify_queue_ping()
    assert code == 0
    assert enq.call_count == 1


def test_run_notify_queue_ping_enqueue_fail(monkeypatch) -> None:
    monkeypatch.setattr(np, "get_settings", lambda: MagicMock(redis_url="redis://localhost:6379/0", log_level="WARNING"))
    with patch.object(np, "enqueue_notify_job_sync", return_value=False):
        assert np.run_notify_queue_ping() == 1
