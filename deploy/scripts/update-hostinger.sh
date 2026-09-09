#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/segetmissoes}"

cd "$APP_DIR"

git pull --ff-only
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
docker image prune -f

docker compose -f docker-compose.prod.yml ps
