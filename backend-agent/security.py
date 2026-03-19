
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Tuple

from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import HTTPException, status, Request, Response
from pydantic import BaseModel

pwd_ctx = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__truncate_error=False,  # evita ValueError, mas prefira validar no input
)

JWT_SECRET = os.getenv("JWT_SECRET")
ENV = os.getenv("ENVIRONMENT", "development")
if ENV.lower() == "production" and not JWT_SECRET:
    raise RuntimeError("JWT_SECRET não configurado em produção")
if not JWT_SECRET:
    # fallback apenas para dev
    JWT_SECRET = "change_me"

JWT_ALG = os.getenv("JWT_ALG", "HS256")
ACCESS_MIN = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

COOKIE_DOMAIN = os.getenv("COOKIE_DOMAIN", None)
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "False").lower() == "true"
COOKIE_SAMESITE = (os.getenv("COOKIE_SAMESITE", "Lax") or "Lax").strip()
COOKIE_PATH = os.getenv("COOKIE_PATH", "/api")

CSRF_COOKIE_NAME = "csrf_token"
CSRF_HEADER_NAME = "X-CSRF-Token"
COOKIE_PATH = os.getenv("COOKIE_PATH", "/")

_valid = {"lax":"lax", "strict":"strict", "none":"none"}
_samesite = _valid.get(COOKIE_SAMESITE.lower(), "lax")

if not COOKIE_DOMAIN and ENV.lower() == "production":
    raise RuntimeError("COOKIE_DOMAIN nao configurado em producao")

class TokenData(BaseModel):
    sub: str
    typ: str


def hash_password(p: str) -> str:
    return pwd_ctx.hash(p)


def verify_password(p: str, hashed: str) -> bool:
    return pwd_ctx.verify(p, hashed)


def _exp(minutes: int = 0, days: int = 0):
    return datetime.now(timezone.utc) + timedelta(minutes=minutes, days=days)


def create_tokens(sub: str) -> Tuple[str, str]:
    now = datetime.now(timezone.utc)
    access = jwt.encode(
        {"sub": sub, "typ": "access", "iat": int(now.timestamp()), "exp": int(_exp(minutes=ACCESS_MIN).timestamp())},
        JWT_SECRET, algorithm=JWT_ALG
    )
    refresh = jwt.encode(
        {"sub": sub, "typ": "refresh", "iat": int(now.timestamp()), "exp": int(_exp(days=REFRESH_DAYS).timestamp())},
        JWT_SECRET, algorithm=JWT_ALG
    )
    return access, refresh


def decode_token(token: str) -> TokenData:
    try:
        data = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        return TokenData(sub=data.get("sub"), typ=data.get("typ"))
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido ou expirado")



def cookie_params():
    return dict(
        # domain=None,  # <--- removido temporariamente
        path=COOKIE_PATH or "/",
        secure=bool(COOKIE_SECURE),
        samesite=_samesite,
        httponly=True,
    )


def generate_csrf_token() -> str:
    return secrets.token_urlsafe(32)


def verify_csrf_header(request: Request) -> None:
    """Double-submit cookie: header must equal cookie value for state-changing requests."""
    cookie_val = request.cookies.get(CSRF_COOKIE_NAME)
    header_val = request.headers.get(CSRF_HEADER_NAME)
    if not cookie_val or not header_val or cookie_val != header_val:
        raise HTTPException(status_code=403, detail="CSRF token inválido")

# Dependency alias (for readability in endpoints)
require_csrf_header = verify_csrf_header


def delete_cookies(response: Response):
    params = cookie_params()
    if params.get("domain"):
        response.delete_cookie("access_token", domain=params["domain"], path="/")
        response.delete_cookie("refresh_token", domain=params["domain"], path="/")
        response.delete_cookie(CSRF_COOKIE_NAME, domain=params["domain"], path="/")
    else:
        response.delete_cookie("access_token", path="/")
        response.delete_cookie("refresh_token", path="/")
        response.delete_cookie(CSRF_COOKIE_NAME, path="/")
