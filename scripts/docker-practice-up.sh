#!/usr/bin/env bash
set -euo pipefail

bash scripts/docker-clean-judge0.sh
docker compose up -d --build --pull never --remove-orphans app app-db
bash scripts/docker-wait-for-app.sh
docker compose ps
