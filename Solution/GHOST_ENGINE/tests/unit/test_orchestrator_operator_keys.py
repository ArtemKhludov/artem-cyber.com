"""Operator / message task Redis key ordering."""

from __future__ import annotations

import pytest

from ghost_engine.notify.message_tasks import (
    message_tasks_blpop_keys,
    message_tasks_high_priority_key,
    message_tasks_redis_key,
)
from ghost_engine.notify.operator_commands import (
    operator_commands_drain_keys_ordered,
    operator_commands_high_priority_key,
    operator_commands_legacy_high_priority_key,
    operator_commands_legacy_redis_key,
    operator_commands_redis_key,
)


def test_operator_keys_new_defaults() -> None:
    assert operator_commands_redis_key() == "ghost:op:commands"
    assert operator_commands_high_priority_key() == "ghost:op:commands:high"


def test_operator_drain_order_new_before_legacy() -> None:
    keys = operator_commands_drain_keys_ordered()
    assert keys[0] == "ghost:op:commands:high"
    assert keys[1] == "ghost:op:commands"
    assert operator_commands_legacy_high_priority_key() in keys
    assert operator_commands_legacy_redis_key() in keys
    assert keys.index("ghost:op:commands:high") < keys.index("ghost:operator:commands:high")


def test_operator_custom_key_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GHOST_OPERATOR_COMMANDS_KEY", "custom:op")
    assert operator_commands_redis_key() == "custom:op"
    assert operator_commands_high_priority_key() == "custom:op:high"
    keys = operator_commands_drain_keys_ordered()
    assert "custom:op:high" in keys
    assert "ghost:operator:commands" in keys


def test_message_task_keys_default() -> None:
    assert message_tasks_redis_key() == "ghost:msg:tasks"
    assert message_tasks_high_priority_key() == "ghost:msg:tasks:high"
    assert message_tasks_blpop_keys() == ["ghost:msg:tasks:high", "ghost:msg:tasks"]
