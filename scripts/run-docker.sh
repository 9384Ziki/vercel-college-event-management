#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f .env ] || cp .env.example .env
docker compose up -d --build
echo "Open: http://localhost:8080"
echo "API health: http://localhost:5000/api/health"
