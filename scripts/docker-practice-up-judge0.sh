#!/usr/bin/env bash
set -euo pipefail

arch="$(uname -m)"
if [[ "${arch}" == "arm64" && "${CODEVERDICT_ALLOW_UNSUPPORTED_JUDGE0_LOCAL:-0}" != "1" ]]; then
  cat >&2 <<'EOF'
Refusing to start bundled Judge0 on arm64 by default.

This repository already records that judge0/judge0:1.13.1 is incompatible on
Apple Silicon Docker Desktop and can trigger restart loops and large image
downloads. Use the default `npm run docker:up` path with an external Judge0
endpoint instead.

If you intentionally want to retry the unsupported local Judge0 profile anyway,
rerun with:

CODEVERDICT_ALLOW_UNSUPPORTED_JUDGE0_LOCAL=1 npm run docker:up:judge0
EOF
  exit 1
fi

docker compose --profile judge0-local up -d --build \
  app \
  app-db \
  judge0-server \
  judge0-worker \
  judge0-db \
  judge0-redis
bash scripts/docker-wait-for-app.sh
docker compose ps
