"""Orchestrator timing constants (prefer YAML for site selectors; avoid env sprawl)."""

from __future__ import annotations

# Operator command: single dispatch Playwright operations
OPERATOR_COMMAND_NAV_TIMEOUT_MS: int = 45_000

# Saved jobs: UI path attempts before direct URL fallback
SAVED_JOBS_HEADER_MAX_ATTEMPTS: int = 3
