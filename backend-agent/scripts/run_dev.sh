#!/usr/bin/env bash
set -euo pipefail
BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$BASE_DIR"
source ../venv/bin/activate
export PYTHONUNBUFFERED=1
uvicorn main:app --reload --host 0.0.0.0 --port 8000
