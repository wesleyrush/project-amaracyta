# Amaracyta — Contexto do Projeto

## Visão geral

Plataforma web chamada **Amaracyta** (marca visual: **Mahamatrix**). Oferece módulos de conteúdo com chat via IA, sistema de moedas, loja, perfil e área infantil. Possui dois sistemas separados: um para o usuário final e um painel administrativo.

---

## Arquitetura

```
project-amaracyta/
├── backend-agent/      Python/FastAPI — API principal dos usuários (porta 8000)
├── backend-admin/      Node.js/Express — API do painel administrativo (porta 3000)
├── frontend-agent/     React/TypeScript/Vite — App do usuário final
├── frontend-admin/     React/TypeScript — Painel administrativo
├── Data-Base-Full.sql  Schema completo do MySQL
├── Data-Base-Update.sql Migrações incrementais
└── *.pem               Certificados SSL (admin, portal, adminshantalle)
```

**Banco de dados:** MySQL externo (não containerizado). Fuso horário: `America/Sao_Paulo`.

---

## backend-agent (Python/FastAPI)

- **Entrypoint:** `app.py`
- **IA:** LangChain + xAI (Grok), modelo padrão `grok-4-1-fast-reasoning`
- **Auth:** JWT + CSRF (`auth.py`, `security.py`)
- **ORM:** SQLAlchemy + PyMySQL (`db.py`, `models.py`)
- **Streaming:** SSE via `sse-starlette`
- **ROOT_PATH:** `/api` (configurável por env)
- **Modelos principais:** `User`, `ChatSession`, `Message`, `Module`, `ModuleLevel`, `CoinTransaction`, `CoinOrder`, `ModuleOrder`, `Child`, `SiteSettings`, `ModuleFlowStep`, `UserLife`
- **Env:** `backend-agent/.env` (nunca commitar)
- **Migrations:** scripts em `alembic/` e arquivos `apply_migration_*.py`

### Rodar localmente
```bash
# Windows (PowerShell)
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
.\.venv\Scripts\Activate.ps1
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

---

## backend-admin (Node.js/Express)

- **Entrypoint:** `src/server.js`
- **DB:** mysql2
- **Auth:** JWT (jsonwebtoken) + bcryptjs
- **Upload:** multer
- **Env:** `backend-admin/.env` (nunca commitar)

### Rodar localmente
```bash
node src/server.js
# ou
npm run dev   # usa --watch
```

---

## frontend-agent (React/TypeScript/Vite)

- **Páginas:** Login, Register, Chat, Loja (Store), Checkout, ModuleCheckout, PurchaseSuccess, Perfil, ProfileData, ProfilePassword, Histórico, Crianças, History
- **Componentes-chave:** Chat, Sidebar, SidebarController, Topbar, ModulePicker, InternalLayout
- **API client:** `src/api/client.ts`
- **Settings dinâmicos:** `src/api/settings.ts` (busca configs do backend — nome do site, logo, etc.)
- **Build:** `npm run build` → gera `dist/` (servido pelo backend-agent em produção)
- **Logo/marca:** componente `AkashaLogo.tsx`, texto visual "Mahamatrix"

### Rodar localmente
```bash
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
npm run dev
```

---

## Produção

- Backend-agent roda via **systemctl**: `systemctl restart backend-agent.service`
- Frontend é **build estático** servido pelo backend-agent (`/frontend/dist`)
- SSL com certificados `.pem` já na raiz do projeto

---

## Migração Docker (planejada)

Plano completo documentado em memória (`memory/project_docker_migration.md`). Arquitetura alvo:

```
docker-compose.yml
├── backend-agent   (porta interna 8000)
├── backend-admin   (porta interna 3000)
├── nginx           (frontends estáticos + reverse proxy + SSL)
└── db              MySQL externo (fase 1)
```

**Status:** Aguardando confirmação do usuário para iniciar. Não alterar infraestrutura sem confirmação explícita.

---

## Convenções importantes

- Nunca commitar arquivos `.env`
- Fuso horário de todos os `datetime`: Brasília (`America/Sao_Paulo`), naive para MySQL
- Em produção, CORS desabilitado (controlado pela variável `ENVIRONMENT=production`)
- O `ROOT_PATH=/api` é injetado via env no backend-agent em produção
