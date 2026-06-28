#!/usr/bin/env bash
set -euo pipefail

docker compose --profile judge0-local up -d --build \
  app \
  app-db \
  judge0-server \
  judge0-worker \
  judge0-db \
  judge0-redis
docker compose ps
