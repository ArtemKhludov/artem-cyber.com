# GHOST_ENGINE — sequential local stack: Postgres → Redis → Ollama (probe :11434, else compose up) → Python engines.
# Run from repo root. Requires Docker and `uv`.
#
# Typical full dev (infra + Telegram bot in background + browser foreground):
#   make dev-full
#   (not `uv make` — uv has no make subcommand; GNU make drives docker + `uv run` inside recipes)
# Stop background bot + optional compose stop:
#   make stop-engines
#   make infra-down   # optional: tear down containers

SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c

UV ?= uv run
COMPOSE ?= docker compose
ROOT := $(CURDIR)

SITE ?= upwork
PROFILE ?= default
# Extra args to dev_session, e.g. DEV_SESSION_EXTRA="--idle-seconds 0"
DEV_SESSION_EXTRA ?=

POSTGRES_WAIT_MAX ?= 60
REDIS_WAIT_MAX ?= 60
OLLAMA_WAIT_MAX ?= 45
# Host probe for local Ollama (Docker publishes 11434; native ollama serve uses the same).
OLLAMA_LOCAL_URL ?= http://127.0.0.1:11434
# Remote-only Ollama or no Docker: SKIP_OLLAMA_ENSURE=1 make infra-up

PID_FILE := $(ROOT)/.ghost-telegram.pid
EMERGENCY_PID_FILE := $(ROOT)/.ghost-emergency.pid
LOG_DIR := $(ROOT)/logs

.PHONY: help
help:
	@echo "GHOST_ENGINE — sequential stack"
	@echo ""
	@echo "Infra (order: Postgres → wait → Redis → wait → Ollama ensure):"
	@echo "  make infra-up          # postgres + redis; Ollama if :11434 down → compose up ollama + wait"
	@echo "  SKIP_OLLAMA_ENSURE=1   # skip probe/docker ollama (remote OLLAMA_HOST or no container)"
	@echo "  make postgres-up / postgres-wait / redis-up / redis-wait / ollama-up / ollama-ensure"
	@echo "  make infra-down        # docker compose down"
	@echo "  make health-local      # uv: Redis + Ollama reachability (needs .env REDIS_URL)"
	@echo ""
	@echo "Engines (after infra; .env must match compose: REDIS_PASSWORD + REDIS_URL with :password@):"
	@echo "  make run-telegram-bot  # foreground Command Center"
	@echo "  make run-emergency     # foreground Emergency/Self-healing agent"
	@echo "  make run-dev-session   # foreground browser; ends with Enter to close (GHOST_DEV_NO_KEEP_ALIVE=1 to skip)"
	@echo "  make dev-full          # infra-up → health → tg-bot bg → emergency bg → dev_session"
	@echo "  make dev-full-analytics # dev-full with GHOST_GRAPHQL_ANALYTICS=1 (GraphQL INFO + logs/graphql_analytics.jsonl)"
	@echo "  make stop-engines      # kill background engines (tg-bot + emergency)"
	@echo "  (one telegram-bot per TELEGRAM_BOT_TOKEN — see docs/ops_telegram_single_instance.md)"
	@echo ""
	@echo "Other:"
	@echo "  make test              # pytest"
	@echo "  make lint              # ruff check"
	@echo "  make db-migrate        # alembic upgrade head (needs DATABASE_URL, sync via psycopg)"
	@echo "  make db-cleanup        # retention: job_scoring_events + optional data/*/jobs + graphql_raw (env TTL)"

# --- Infra (strictly sequential) ---

.PHONY: postgres-up postgres-wait redis-up redis-wait ollama-up ollama-wait ollama-ensure infra-up infra-down db-migrate db-cleanup

postgres-up:
	cd "$(ROOT)" && $(COMPOSE) up -d postgres

postgres-wait:
	@echo "Waiting for Postgres (max $(POSTGRES_WAIT_MAX)s)..."
	@for i in $$(seq 1 $(POSTGRES_WAIT_MAX)); do \
		if $(COMPOSE) exec -T postgres pg_isready -U ghost -d ghost_engine >/dev/null 2>&1; then \
			echo "Postgres ready."; exit 0; \
		fi; \
		sleep 1; \
	done; \
	echo "Postgres wait timeout." >&2; exit 1

redis-up:
	cd "$(ROOT)" && $(COMPOSE) up -d redis

redis-wait:
	@echo "Waiting for Redis (max $(REDIS_WAIT_MAX)s)..."
	@for i in $$(seq 1 $(REDIS_WAIT_MAX)); do \
		if $(COMPOSE) exec -T redis sh -c 'redis-cli -a "$$REDIS_PASSWORD" ping' 2>/dev/null | grep -q PONG; then \
			echo "Redis ready."; exit 0; \
		fi; \
		sleep 1; \
	done; \
	echo "Redis wait timeout." >&2; exit 1

ollama-up:
	cd "$(ROOT)" && $(COMPOSE) up -d ollama

ollama-wait:
	@echo "Waiting for Ollama HTTP at $(OLLAMA_LOCAL_URL) (max $(OLLAMA_WAIT_MAX)s)..."
	@for i in $$(seq 1 $(OLLAMA_WAIT_MAX)); do \
		if curl -sf "$(OLLAMA_LOCAL_URL)/api/tags" >/dev/null 2>&1; then \
			echo "Ollama reachable."; exit 0; \
		fi; \
		sleep 1; \
	done; \
	echo "Ollama wait timeout." >&2; exit 1

# If nothing answers on OLLAMA_LOCAL_URL, start docker service ollama (same port on host).
# Fails soft: Postgres/Redis stay usable; LLM judges fail-open without Ollama.
ollama-ensure:
	@if [ "$${SKIP_OLLAMA_ENSURE:-0}" = "1" ]; then \
		echo "SKIP_OLLAMA_ENSURE=1: skipping local Ollama probe and compose ollama."; \
	elif curl -sf "$(OLLAMA_LOCAL_URL)/api/tags" >/dev/null 2>&1; then \
		echo "Ollama already reachable at $(OLLAMA_LOCAL_URL) (native app or existing container)."; \
	else \
		echo "Ollama not reachable at $(OLLAMA_LOCAL_URL); starting compose service ollama..."; \
		cd "$(ROOT)" && ($(COMPOSE) up -d ollama || echo "Warning: docker compose up ollama failed (Docker running?)." >&2); \
		$(MAKE) ollama-wait || echo "Warning: Ollama still not ready — local judges will fail-open until it is up." >&2; \
	fi

infra-up: postgres-up postgres-wait redis-up redis-wait ollama-ensure
	@echo "Infra up: postgres + redis (Ollama status: see ollama-ensure lines above)."

infra-down:
	cd "$(ROOT)" && $(COMPOSE) down

# --- Health / engines ---

.PHONY: health-local run-telegram-bot run-emergency run-dev-session dev-full stop-engines test lint

health-local:
	cd "$(ROOT)" && $(UV) python -m ghost_engine.main health

run-telegram-bot:
	cd "$(ROOT)" && $(UV) python -m ghost_engine.main telegram-bot

run-emergency:
	cd "$(ROOT)" && $(UV) python -m ghost_engine.main emergency-agent

run-dev-session:
	cd "$(ROOT)" && $(UV) python -m ghost_engine.browser.dev_session \
		--site "$(SITE)" --profile "$(PROFILE)" $(DEV_SESSION_EXTRA)

# Sequential: infrastructure → deps check → Engines in background → browser (foreground).
.PHONY: dev-full-analytics
dev-full-analytics:
	cd "$(ROOT)" && GHOST_GRAPHQL_ANALYTICS=1 $(MAKE) dev-full

dev-full: infra-up health-local stop-engines
	@mkdir -p "$(LOG_DIR)"
	@# Start Telegram Bot
	@if [ -f "$(PID_FILE)" ] && kill -0 "$$(cat "$(PID_FILE)" 2>/dev/null)" 2>/dev/null; then \
		echo "Background telegram-bot already running (PID $$(cat "$(PID_FILE)")). Skip start."; \
	else \
		rm -f "$(PID_FILE)"; \
		echo "Starting telegram-bot in background → $(LOG_DIR)/telegram-bot.log"; \
		( cd "$(ROOT)" && nohup $(UV) python -m ghost_engine.main telegram-bot >> "$(LOG_DIR)/telegram-bot.log" 2>&1 & echo $$! > "$(PID_FILE)" ); \
	fi
	@# Start Emergency Agent
	@if [ -f "$(EMERGENCY_PID_FILE)" ] && kill -0 "$$(cat "$(EMERGENCY_PID_FILE)" 2>/dev/null)" 2>/dev/null; then \
		echo "Background emergency-agent already running (PID $$(cat "$(EMERGENCY_PID_FILE)")). Skip start."; \
	else \
		rm -f "$(EMERGENCY_PID_FILE)"; \
		echo "Starting emergency-agent in background → $(LOG_DIR)/emergency-agent.log"; \
		( cd "$(ROOT)" && nohup $(UV) python -m ghost_engine.main emergency-agent >> "$(LOG_DIR)/emergency-agent.log" 2>&1 & echo $$! > "$(EMERGENCY_PID_FILE)" ); \
	fi
	@sleep 2
	@echo "Starting dev_session (SITE=$(SITE) PROFILE=$(PROFILE)); Ctrl+C ends browser only."
	cd "$(ROOT)" && $(UV) python -m ghost_engine.browser.dev_session \
		--site "$(SITE)" --profile "$(PROFILE)" $(DEV_SESSION_EXTRA)

stop-engines:
	@# Stop Telegram Bot
	@if [ -f "$(PID_FILE)" ]; then \
		pid=$$(cat "$(PID_FILE)"); \
		if kill -0 "$$pid" 2>/dev/null; then \
			echo "Stopping telegram-bot PID $$pid"; \
			kill "$$pid" || true; \
			sleep 1; \
			kill -9 "$$pid" 2>/dev/null || true; \
		fi; \
		rm -f "$(PID_FILE)"; \
	else \
		echo "No $(PID_FILE); nothing to stop."; \
	fi
	@# Stop Emergency Agent
	@if [ -f "$(EMERGENCY_PID_FILE)" ]; then \
		pid=$$(cat "$(EMERGENCY_PID_FILE)"); \
		if kill -0 "$$pid" 2>/dev/null; then \
			echo "Stopping emergency-agent PID $$pid"; \
			kill "$$pid" || true; \
			sleep 1; \
			kill -9 "$$pid" 2>/dev/null || true; \
		fi; \
		rm -f "$(EMERGENCY_PID_FILE)"; \
	fi

db-migrate:
	cd "$(ROOT)" && $(UV) alembic upgrade head

db-cleanup:
	cd "$(ROOT)" && $(UV) python -m ghost_engine.cli.db_cleanup

test:
	cd "$(ROOT)" && $(UV) pytest tests/ -q

lint:
	cd "$(ROOT)" && $(UV) ruff check src/ghost_engine tests
