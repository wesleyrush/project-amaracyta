# auth.py
import os
from dotenv import load_dotenv
from pathlib import Path as _Path
from pathlib import Path
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from pydantic import BaseModel, EmailStr, Field, constr
from sqlalchemy.orm import Session
from datetime import datetime, date
from db import get_db
from models import User
from security import hash_password, verify_password, create_tokens, decode_token, cookie_params,generate_csrf_token, CSRF_COOKIE_NAME
import logging


logger = logging.getLogger("auth.login")
ENV_PATH = _Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)
ROOT_PATH = os.getenv("ROOT_PATH", "/api")
COOKIE_SECURE = (os.getenv('COOKIE_SECURE','False').lower() == 'true')
COOKIE_PATH = os.getenv('COOKIE_PATH','/api')  # seu caso usa /api

router = APIRouter(prefix="/auth", tags=["auth"])

class RegisterIn(BaseModel):
    email:          EmailStr
    password:       str  = Field(min_length=8, max_length=128)
    full_name:      str  = Field(min_length=3, max_length=255)
    initiatic_name: str | None = Field(default=None, max_length=255)
    birth_date:     date | None = None
    birth_time:     str  | None = Field(default=None, max_length=5)   # HH:MM
    birth_country:  str  | None = Field(default=None, max_length=100)
    birth_state:    str  | None = Field(default=None, max_length=100)
    birth_city:     str  | None = Field(default=None, max_length=100)

class LoginIn(BaseModel):
    email: EmailStr
    password: constr(min_length=8, max_length=72)

class UserOut(BaseModel):
    id:             int
    email:          EmailStr
    full_name:      str  | None = None
    initiatic_name: str  | None = None
    birth_date:     date | None = None
    birth_time:     str  | None = None
    birth_country:  str  | None = None
    birth_state:    str  | None = None
    birth_city:     str  | None = None
    is_admin:       bool = False
    class Config:
        from_attributes = True

class ProfileUpdate(BaseModel):
    full_name:      str  | None = Field(default=None, min_length=3, max_length=255)
    initiatic_name: str  | None = Field(default=None, max_length=255)
    birth_date:     date | None = None
    birth_time:     str  | None = Field(default=None, max_length=5)
    birth_country:  str  | None = Field(default=None, max_length=100)
    birth_state:    str  | None = Field(default=None, max_length=100)
    birth_city:     str  | None = Field(default=None, max_length=100)

class ChangePasswordIn(BaseModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)

@router.post("/register", response_model=UserOut, status_code=201)
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    exists = db.query(User).filter(User.email == payload.email.lower()).first()
    if exists:
        raise HTTPException(status_code=409, detail="E-mail já cadastrado")
    u = User(
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        full_name=(payload.full_name or "").strip() or None,
        initiatic_name=(payload.initiatic_name or "").strip() or None,
        birth_date=payload.birth_date,
        birth_time=(payload.birth_time or "").strip() or None,
        birth_country=(payload.birth_country or "").strip() or None,
        birth_state=(payload.birth_state or "").strip() or None,
        birth_city=(payload.birth_city or "").strip() or None,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


@router.post("/login")
def login(payload: LoginIn, response: Response, db: Session = Depends(get_db)):
    try:
        u = db.query(User).filter(User.email == payload.email.lower()).first()
        if not u:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais inválidas")

        try:
            if not verify_password(payload.password, u.password_hash):
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais inválidas")
        except Exception as e:
            # Captura qualquer erro interno do verificador e padroniza como 401
            logger.exception("verify_password falhou para email=%s", payload.email)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais inválidas") from e

        # Atualiza last_login_at (se existir no modelo)
        try:
            u.last_login_at = datetime.utcnow()
            db.commit()
        except Exception:
            logger.exception("Falha ao atualizar last_login_at para user_id=%s", getattr(u,'id',None))
            db.rollback()  # segue sem bloquear login

        access, refresh = create_tokens(str(u.id))
        params = cookie_params()
        try:
            response.set_cookie("access_token", access, **params)
            response.set_cookie("refresh_token", refresh, **params)
        except Exception:
            logger.exception("Falha ao setar cookies de sessão para user_id=%s", getattr(u,'id',None))
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Login indisponível")

        return {"status": "ok"}

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Erro inesperado em /auth/login para email=%s", payload.email)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Login indisponível") from e


@router.post("/refresh")
def refresh_token(request: Request, response: Response):
    refresh = request.cookies.get("refresh_token")
    if not refresh:
        raise HTTPException(status_code=401, detail="Sem refresh token")
    data = decode_token(refresh)
    if data.typ != "refresh":
        raise HTTPException(status_code=401, detail="Tipo de token inválido")
    access, new_refresh = create_tokens(data.sub)
    params = cookie_params()
    response.set_cookie("access_token", access, **params)
    response.set_cookie("refresh_token", new_refresh, **params)
    return {"status": "ok"}

@router.post("/logout")
def logout(request: Request, response: Response):
    from security import verify_csrf_header
    verify_csrf_header(request)

    params = cookie_params()
    domain = params.get("domain", None)

    def drop(name: str, path: str):
        if domain:
            response.delete_cookie(name, path=path, domain=domain)
        else:
            response.delete_cookie(name, path=path)

    for p in ("/api", "/"):   # cubra ambas as origens, se houver
        drop("access_token",  p)
        drop("refresh_token", p)

    # se você emite cookie público de CSRF, pode limpar também:
    # drop("csrf_token", "/api"); drop("csrf_token", "/")

    return {"status": "ok"}

@router.get("/me", response_model=UserOut)
def me(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Não autenticado")
    data = decode_token(token)
    if data.typ != "access":
        raise HTTPException(status_code=401, detail="Tipo de token inválido")
    u = db.query(User).get(int(data.sub))
    if not u:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")
    return u

@router.get("/profile", response_model=UserOut)
def get_profile(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("access_token")
    if not token: raise HTTPException(status_code=401, detail="Não autenticado")
    data = decode_token(token)
    u = db.query(User).get(int(data.sub)); 
    if not u: raise HTTPException(status_code=401, detail="Usuário não encontrado")
    return u

@router.put("/profile", response_model=UserOut)
def update_profile(payload: ProfileUpdate, request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("access_token")
    if not token: raise HTTPException(status_code=401, detail="Não autenticado")
    data = decode_token(token)
    u = db.query(User).get(int(data.sub))
    if not u: raise HTTPException(status_code=401, detail="Usuário não encontrado")

    if payload.full_name is not None:
        u.full_name = payload.full_name.strip() or None
    u.initiatic_name = (payload.initiatic_name or "").strip() or None
    u.birth_date     = payload.birth_date
    u.birth_time     = (payload.birth_time or "").strip() or None
    u.birth_country  = (payload.birth_country or "").strip() or None
    u.birth_state    = (payload.birth_state or "").strip() or None
    u.birth_city     = (payload.birth_city or "").strip() or None

    u.updated_at = datetime.utcnow()
    db.commit(); db.refresh(u)
    return u

@router.post("/change-password")
def change_password(payload: ChangePasswordIn, request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("access_token")
    if not token: raise HTTPException(status_code=401, detail="Não autenticado")
    data = decode_token(token)
    u = db.query(User).get(int(data.sub))
    if not u: raise HTTPException(status_code=401, detail="Usuário não encontrado")
    if not verify_password(payload.current_password, u.password_hash):
        raise HTTPException(status_code=401, detail="Senha atual incorreta")
    u.password_hash = hash_password(payload.new_password)
    u.updated_at = datetime.utcnow()
    db.commit()
    return {"status": "ok"}

@router.get("/csrf")
def issue_csrf(response: Response):
    csrf = generate_csrf_token()
    # Cookie NÃO-HttpOnly (double-submit), escopo apenas do path /api
    response.set_cookie(
        CSRF_COOKIE_NAME,
        csrf,
        path=COOKIE_PATH,
        secure=COOKIE_SECURE,
        samesite='lax',   # valores válidos: 'lax'|'strict'|'none'
        httponly=False,
    )
    return {"status": "ok", "csrf": csrf}

# auth.py (apenas o handler do logout)

