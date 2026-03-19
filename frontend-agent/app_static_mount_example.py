
# Exemplo de montagem do build do React no FastAPI (mesma origem)
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse

app = FastAPI()

# ... (REGISTRE AQUI SEUS ROUTERS DE API: app.include_router(auth_router) etc.)

FRONTEND_DIST = Path(__file__).resolve().parent / 'frontend' / 'dist'

if FRONTEND_DIST.exists():
    # Sirva os assets diretamente (CSS/JS) para melhor performance
    app.mount('/assets', StaticFiles(directory=str(FRONTEND_DIST / 'assets'), html=False), name='assets')

    @app.get('/')
    async def index_root():
        return FileResponse(FRONTEND_DIST / 'index.html')

    @app.get('/{full_path:path}')
    async def spa_fallback(full_path: str):
        if full_path.startswith(('auth/', 'sessions', 'messages', 'stream', 'healthz')):
            raise HTTPException(status_code=404, detail='Not Found')
        return FileResponse(FRONTEND_DIST / 'index.html')
else:
    @app.get('/')
    async def missing_build():
        return {"hint": "Faça npm run build em frontend/ para gerar /frontend/dist"}
