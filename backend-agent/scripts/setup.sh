#!/usr/bin/env bash
set -euo pipefail

# Diretório deste script
BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$BASE_DIR"

# 1) venv
if [ ! -d "../venv" ]; then
  python3 -m venv ../venv
fi
source ../venv/bin/activate

# 2) deps
pip install --upgrade pip
pip install -r requirements.txt

# 3) dados
mkdir -p data/sessions

# 4) DB: criar tabela users (se necessário)
if [ -f "sql/001_create_users.sql" ]; then
  echo "Lembrete: execute o SQL em seu MySQL (ou use create_all via app)."
fi

echo "Setup concluído. Configure o .env e rode scripts/run_dev.sh ou systemd."
