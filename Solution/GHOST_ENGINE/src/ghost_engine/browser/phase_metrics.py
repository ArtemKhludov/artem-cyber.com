"""Structured logs for orchestrator phases (operator → Messages → feed)."""

from __future__ import annotations

from typing import Any

from ghost_engine.utils.logger import get_logger

log = get_logger(__name__)


def log_phase_start(phase: str, **extra: Any) -> None:
    log.info("orchestrator.phase_start", phase=phase, **extra)


def log_phase_end(phase: str, **extra: Any) -> None:
    log.info("orchestrator.phase_end", phase=phase, **extra)


def log_drain_count(phase: str, count: int, **extra: Any) -> None:
    log.info("orchestrator.drain_count", phase=phase, count=count, **extra)
