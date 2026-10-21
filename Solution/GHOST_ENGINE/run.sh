#!/usr/bin/env bash
# GHOST_ENGINE — uv-first runner
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

MODE="${1:-help}"

case "$MODE" in
  local)
    exec uv run python -m ghost_engine.main
    ;;
  test)
    exec uv run pytest tests/ -q
    ;;
  compose)
    docker compose up --build -d
    ;;
  compose-logs)
    docker compose logs -f ghost-engine
    ;;
  compose-down)
    docker compose down
    ;;
  *)
    echo "Usage: $0 {local|test|compose|compose-logs|compose-down}"
    exit 1
    ;;
esac
