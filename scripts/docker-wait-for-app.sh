#!/usr/bin/env bash
set -euo pipefail

port="${PORT:-3000}"
health_url="http://127.0.0.1:${port}/api/health"
max_attempts="${CODEVERDICT_DOCKER_WAIT_ATTEMPTS:-60}"
sleep_seconds="${CODEVERDICT_DOCKER_WAIT_SECONDS:-2}"

echo "Waiting for CodeVerdict healthcheck at ${health_url} ..."

for ((attempt = 1; attempt <= max_attempts; attempt++)); do
  if curl -fsS "${health_url}" >/dev/null 2>&1; then
    echo "CodeVerdict is healthy."
    exit 0
  fi

  sleep "${sleep_seconds}"
done

echo "CodeVerdict did not become healthy in time." >&2
docker compose ps >&2 || true
docker compose logs --tail=100 app >&2 || true
exit 1
