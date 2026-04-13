#!/usr/bin/env bash
# load-tests/run-load.sh
# Runs k6 via Docker - no local k6 install needed.
# Usage: ./load-tests/run-load.sh
# Reads from load-tests/.env.local - copy .env.example to .env.local and fill in values first.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env.local"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found. Copy .env.example to .env.local and fill in values."
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

# Docker containers cannot reach the host via 'localhost' - replace it automatically.
# On Windows/Mac Docker Desktop this resolves via host.docker.internal.
# On Linux, --add-host=host.docker.internal:host-gateway achieves the same.
DOCKER_BASE_URL="${BASE_URL/localhost/host.docker.internal}"

echo "==> Running k6 load test (Docker) against: ${DOCKER_BASE_URL}"
echo "==> VUs: ${VUS:-120}"

# MSYS_NO_PATHCONV=1 prevents Git Bash on Windows from converting /home/k6 into a Windows path
MSYS_NO_PATHCONV=1 docker run --rm \
  -v "${SCRIPT_DIR}:/home/k6" \
  --add-host=host.docker.internal:host-gateway \
  grafana/k6 run \
  --env BASE_URL="${DOCKER_BASE_URL}" \
  --env ADMIN_EMAIL="${ADMIN_EMAIL}" \
  --env ADMIN_PASSWORD="${ADMIN_PASSWORD}" \
  --env VUS="${VUS:-120}" \
  --env THINK_TIME="${THINK_TIME:-15}" \
  /home/k6/k6/main.js
