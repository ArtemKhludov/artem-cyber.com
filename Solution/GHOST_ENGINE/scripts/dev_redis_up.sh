#!/usr/bin/env sh
# Start Redis for local host processes (telegram-bot, dev_session notify).
set -e
cd "$(dirname "$0")/.."
docker compose up -d redis
docker compose ps redis
