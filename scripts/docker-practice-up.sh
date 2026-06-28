#!/usr/bin/env bash
set -euo pipefail

bash scripts/docker-clean-judge0.sh
docker compose up -d --build app app-db
docker compose ps
