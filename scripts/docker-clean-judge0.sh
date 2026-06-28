#!/usr/bin/env bash
set -euo pipefail

services=(
  judge0-server
  judge0-worker
  judge0-db
  judge0-redis
)

docker compose stop "${services[@]}" >/dev/null 2>&1 || true
docker compose rm -fsv "${services[@]}" >/dev/null 2>&1 || true
docker volume rm codeverdict_judge0-db-data >/dev/null 2>&1 || true

echo "CodeVerdict Judge0 profile resources cleaned."
