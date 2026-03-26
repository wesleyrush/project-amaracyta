#!/bin/bash
set -e

SERVICE="backend-agent"
WORKDIR="/var/www/amaracyta/backend-agent"
PYTHON="/usr/bin/python3"

echo ">>> Parando serviço..."
systemctl stop $SERVICE

echo ">>> Fazendo backup do venv quebrado..."
mv $WORKDIR/venv $WORKDIR/venv.broken.$(date +%Y%m%d_%H%M%S)

echo ">>> Criando novo venv..."
$PYTHON -m venv $WORKDIR/venv

PIP="$WORKDIR/venv/bin/pip"

echo ">>> Atualizando pip..."
$PIP install --upgrade pip

echo ">>> Instalando dependências base (auth/db)..."
$PIP install \
  fastapi uvicorn[standard] \
  sqlalchemy pymysql \
  python-jose[cryptography] \
  sse-starlette \
  "pydantic==2.7.4" "pydantic[email]" \
  "passlib[bcrypt]==1.7.4" "bcrypt==4.3.0" \
  python-dotenv pytz \
  jinja2 pypdf beautifulsoup4 \
  "langchain==0.3.7" "langchain-core==0.3.19"

echo ">>> Instalando langchain-xai sem resolver deps em cascata..."
$PIP install "langchain-xai==0.1.0" --no-deps

echo ">>> Instalando openai pinado..."
$PIP install "openai==1.55.3"

echo ">>> Ajustando dono dos arquivos..."
chown -R www-data:www-data $WORKDIR/venv

echo ">>> Iniciando serviço..."
systemctl start $SERVICE

sleep 3
systemctl status $SERVICE --no-pager
echo ">>> Concluído!"