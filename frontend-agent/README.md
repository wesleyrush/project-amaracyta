
# Akasha • Frontend (React + TypeScript)

## Como rodar em desenvolvimento
```bash
cd frontend
npm i
npm run dev
# abre em http://localhost:5173
```

## Build de produção
```bash
npm run build
# gera frontend/dist
```

---

## Montando no FastAPI (mesma origem)
No backend, após o **build**, copie a pasta `frontend/dist` para ficar ao lado do seu `app.py` ou deixe como está (este repositório já posiciona `frontend/` ao lado do backend se você extrair no mesmo nível).

Edite seu `app.py` e **adicione**:

```python
from pathlib import Path
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse

FRONTEND_DIST = Path(__file__).resolve().parent / 'frontend' / 'dist'

# Monte as rotas **depois** de registrar os routers de API
if FRONTEND_DIST.exists():
    app.mount('/assets', StaticFiles(directory=FRONTEND_DIST / 'assets', html=False), name='assets')

    @app.get('/')
    async def index_root():
        return FileResponse(FRONTEND_DIST / 'index.html')

    # SPA fallback: qualquer rota não-API devolve o index.html
    @app.get('/{full_path:path}')
    async def spa_catch_all(full_path: str):
        # Protege suas rotas de API atuais
        if full_path.startswith(('auth/', 'sessions', 'messages', 'stream', 'healthz')):
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail='Not Found')
        return FileResponse(FRONTEND_DIST / 'index.html')
```

> Observação: manter os endpoints de API **definidos antes** do catch-all garante que `/auth/*`, `/sessions*`, `/messages*`, `/stream`, `/healthz` funcionem normalmente.

## .env de DEV (mesma origem)
```
ENVIRONMENT=development
COOKIE_DOMAIN=
COOKIE_SAMESITE=Lax
COOKIE_SECURE=False
ALLOWED_ORIGINS=http://localhost:8000
```

Depois do build, suba a API:
```bash
uvicorn app:app --reload --port 8000
# abra http://localhost:8000
```
