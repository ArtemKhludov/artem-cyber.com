from __future__ import annotations

from typing import Any


def escalation_node(state: dict[str, Any]) -> dict[str, Any]:
    """Node 3+: human escalation; no-op until graph is wired."""
    return {}
