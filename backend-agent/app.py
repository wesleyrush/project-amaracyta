
import os
from dotenv import load_dotenv
from pathlib import Path as _Path
from pathlib import Path
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse

ENV_PATH = _Path(__file__).resolve().parent / ".env"
FRONTEND_DIST = Path(__file__).resolve().parent / "frontend" / "dist"
ROOT_PATH = os.getenv("ROOT_PATH", "/api")

load_dotenv(dotenv_path=ENV_PATH)

import json
import uuid
import asyncio
from decimal import Decimal
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, AsyncIterator
import pytz

_BRASILIA = pytz.timezone('America/Sao_Paulo')

def _now() -> datetime:
    """Data/hora atual no fuso horário de Brasília (naive, para MySQL)."""
    return datetime.now(_BRASILIA).replace(tzinfo=None)

from fastapi import FastAPI, Depends, HTTPException, Query, Path as FPath, Request
from sqlalchemy import text as sa_text
from fastapi.middleware.cors import CORSMiddleware
try:
    from starlette.middleware.proxy_headers import ProxyHeadersMiddleware
except ImportError:
    from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from sse_starlette import EventSourceResponse
from sqlalchemy.orm import Session

from db import Base, engine, get_db
from models import (
    User, ChatSession, Message, Module, ModuleLevel, CoinProportion, CoinTransaction,
    CoinChest, CoinOrder, ModulePackage, UserModule, ModuleOrder, Child, SiteSettings,
    ModuleFlowStep, UserLife,
)
from auth import router as auth_router
from security import decode_token
from security import require_csrf_header

from langchain_xai import ChatXAI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from pydantic import BaseModel

app = FastAPI(
    title="Grok (xAI) • SSE + Sessions (MySQL) + Auth + CSRF",
    root_path=ROOT_PATH,
)

app.add_middleware(ProxyHeadersMiddleware)
ENV = os.getenv("ENVIRONMENT", "development").lower()
if ENV != "production":
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

DEFAULT_MODEL = os.getenv("XAI_MODEL", "grok-4-1-fast-reasoning")

# Fallback de system prompt caso a sessão não tenha módulo associado
DEFAULT_SYSTEM = os.getenv("SYSTEM_PROMPT", "Você é um assistente útil.")

# NOTE: keep create_all only for development environments
if os.getenv("ENVIRONMENT", "development").lower() != "production":
    Base.metadata.create_all(bind=engine)


class SessionCreate(BaseModel):
    module_id: int
    child_id: Optional[int] = None


class SessionUpdate(BaseModel):
    title: Optional[str] = None


class MessageIn(BaseModel):
    cid: str
    q: str


def require_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Não autenticado")
    data = decode_token(token)
    if data.typ != "access":
        raise HTTPException(status_code=401, detail="Tipo de token inválido")
    u = db.get(User, int(data.sub))
    if not u:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")
    return u


app.include_router(auth_router)


def require_admin(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Não autenticado")
    data = decode_token(token)
    if data.typ != "access":
        raise HTTPException(status_code=401, detail="Tipo de token inválido")
    u = db.get(User, int(data.sub))
    if not u:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")
    if not u.is_admin:
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores")
    return u


# ---------------------------------------------------------------------------
# Children
# ---------------------------------------------------------------------------

def _child_dict(c: "Child") -> Dict[str, Any]:
    return {
        "id":             c.id,
        "user_id":        c.user_id,
        "full_name":      c.full_name,
        "initiatic_name": c.initiatic_name,
        "birth_date":     c.birth_date.isoformat() if c.birth_date else None,
        "birth_time":     c.birth_time,
        "birth_country":  c.birth_country,
        "birth_state":    c.birth_state,
        "birth_city":     c.birth_city,
        "created_at":     c.created_at.isoformat() if c.created_at else None,
        "updated_at":     c.updated_at.isoformat() if c.updated_at else None,
    }


class ChildCreate(BaseModel):
    full_name:      str
    initiatic_name: Optional[str] = None
    birth_date:     Optional[str] = None   # YYYY-MM-DD
    birth_time:     Optional[str] = None   # HH:MM
    birth_country:  Optional[str] = None
    birth_state:    Optional[str] = None
    birth_city:     Optional[str] = None


class ChildUpdate(BaseModel):
    full_name:      Optional[str] = None
    initiatic_name: Optional[str] = None
    birth_date:     Optional[str] = None
    birth_time:     Optional[str] = None
    birth_country:  Optional[str] = None
    birth_state:    Optional[str] = None
    birth_city:     Optional[str] = None


@app.get("/children")
def list_children(user: User = Depends(require_user), db: Session = Depends(get_db)):
    rows = db.query(Child).filter(Child.user_id == user.id).order_by(Child.full_name).all()
    return {"items": [_child_dict(c) for c in rows]}


@app.post("/children", status_code=201)
def create_child(
    payload: ChildCreate,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
    _csrf: None = Depends(require_csrf_header),
):
    from datetime import date as _date
    birth_date = None
    if payload.birth_date:
        try:
            birth_date = _date.fromisoformat(payload.birth_date)
        except ValueError:
            pass
    c = Child(
        user_id=user.id,
        full_name=payload.full_name.strip(),
        initiatic_name=payload.initiatic_name.strip() if payload.initiatic_name else None,
        birth_date=birth_date,
        birth_time=payload.birth_time or None,
        birth_country=payload.birth_country or None,
        birth_state=payload.birth_state or None,
        birth_city=payload.birth_city or None,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return _child_dict(c)


@app.get("/children/{cid}")
def get_child(
    cid: int,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    c = db.query(Child).filter(Child.id == cid, Child.user_id == user.id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Filho não encontrado.")
    return _child_dict(c)


@app.put("/children/{cid}")
def update_child(
    cid: int,
    payload: ChildUpdate,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
    _csrf: None = Depends(require_csrf_header),
):
    from datetime import date as _date
    c = db.query(Child).filter(Child.id == cid, Child.user_id == user.id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Filho não encontrado.")
    if payload.full_name is not None:
        c.full_name = payload.full_name.strip()
    if payload.initiatic_name is not None:
        c.initiatic_name = payload.initiatic_name.strip() or None
    if payload.birth_date is not None:
        try:
            c.birth_date = _date.fromisoformat(payload.birth_date) if payload.birth_date else None
        except ValueError:
            pass
    if payload.birth_time is not None:
        c.birth_time = payload.birth_time or None
    if payload.birth_country is not None:
        c.birth_country = payload.birth_country or None
    if payload.birth_state is not None:
        c.birth_state = payload.birth_state or None
    if payload.birth_city is not None:
        c.birth_city = payload.birth_city or None
    db.commit()
    db.refresh(c)
    return _child_dict(c)


@app.delete("/children/{cid}", status_code=204)
def delete_child(
    cid: int,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
    _csrf: None = Depends(require_csrf_header),
):
    c = db.query(Child).filter(Child.id == cid, Child.user_id == user.id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Filho não encontrado.")
    db.delete(c)
    db.commit()


# ---------------------------------------------------------------------------
# Admin — Children CRUD (by client)
# ---------------------------------------------------------------------------

@app.get("/admin/clients/{uid}/children")
def admin_list_children(
    uid: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    rows = db.query(Child).filter(Child.user_id == uid).order_by(Child.full_name).all()
    return {"items": [_child_dict(c) for c in rows]}


@app.post("/admin/clients/{uid}/children", status_code=201)
def admin_create_child(
    uid: int,
    payload: ChildCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    _csrf: None = Depends(require_csrf_header),
):
    from datetime import date as _date
    birth_date = None
    if payload.birth_date:
        try:
            birth_date = _date.fromisoformat(payload.birth_date)
        except ValueError:
            pass
    c = Child(
        user_id=uid,
        full_name=payload.full_name.strip(),
        initiatic_name=payload.initiatic_name.strip() if payload.initiatic_name else None,
        birth_date=birth_date,
        birth_time=payload.birth_time or None,
        birth_country=payload.birth_country or None,
        birth_state=payload.birth_state or None,
        birth_city=payload.birth_city or None,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return _child_dict(c)


@app.put("/admin/clients/{uid}/children/{cid}")
def admin_update_child(
    uid: int,
    cid: int,
    payload: ChildUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    _csrf: None = Depends(require_csrf_header),
):
    from datetime import date as _date
    c = db.query(Child).filter(Child.id == cid, Child.user_id == uid).first()
    if not c:
        raise HTTPException(status_code=404, detail="Filho não encontrado.")
    if payload.full_name is not None:
        c.full_name = payload.full_name.strip()
    if payload.initiatic_name is not None:
        c.initiatic_name = payload.initiatic_name.strip() or None
    if payload.birth_date is not None:
        try:
            c.birth_date = _date.fromisoformat(payload.birth_date) if payload.birth_date else None
        except ValueError:
            pass
    if payload.birth_time is not None:
        c.birth_time = payload.birth_time or None
    if payload.birth_country is not None:
        c.birth_country = payload.birth_country or None
    if payload.birth_state is not None:
        c.birth_state = payload.birth_state or None
    if payload.birth_city is not None:
        c.birth_city = payload.birth_city or None
    db.commit()
    db.refresh(c)
    return _child_dict(c)


@app.delete("/admin/clients/{uid}/children/{cid}", status_code=204)
def admin_delete_child(
    uid: int,
    cid: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    _csrf: None = Depends(require_csrf_header),
):
    c = db.query(Child).filter(Child.id == cid, Child.user_id == uid).first()
    if not c:
        raise HTTPException(status_code=404, detail="Filho não encontrado.")
    db.delete(c)
    db.commit()


# ---------------------------------------------------------------------------
# Module Levels
# ---------------------------------------------------------------------------

class LevelCreate(BaseModel):
    slug: str
    name: str
    description: Optional[str] = None
    price_brl: float
    is_active: bool = True


class LevelUpdate(BaseModel):
    slug: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    price_brl: Optional[float] = None
    is_active: Optional[bool] = None


@app.get("/module-levels")
def list_module_levels(db: Session = Depends(get_db)):
    rows = db.query(ModuleLevel).filter(ModuleLevel.is_active == True).order_by(ModuleLevel.id).all()
    return {"items": [_level_dict(l) for l in rows]}


@app.get("/admin/module-levels")
def admin_list_module_levels(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    rows = db.query(ModuleLevel).order_by(ModuleLevel.id).all()
    return {"items": [_level_dict(l) for l in rows]}


@app.post("/admin/module-levels", status_code=201)
def admin_create_module_level(
    payload: LevelCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    _csrf: None = Depends(require_csrf_header),
):
    if db.query(ModuleLevel).filter(ModuleLevel.slug == payload.slug).first():
        raise HTTPException(status_code=409, detail="Slug já cadastrado")
    l = ModuleLevel(
        slug=payload.slug,
        name=payload.name,
        description=payload.description,
        price_brl=Decimal(str(payload.price_brl)),
        is_active=payload.is_active,
    )
    db.add(l)
    db.commit()
    db.refresh(l)
    return _level_dict(l)


@app.put("/admin/module-levels/{lid}")
def admin_update_module_level(
    lid: int,
    payload: LevelUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    _csrf: None = Depends(require_csrf_header),
):
    l = db.get(ModuleLevel, lid)
    if not l:
        raise HTTPException(status_code=404, detail="Nível não encontrado")
    if payload.slug is not None:
        conflict = db.query(ModuleLevel).filter(ModuleLevel.slug == payload.slug, ModuleLevel.id != lid).first()
        if conflict:
            raise HTTPException(status_code=409, detail="Slug já cadastrado")
        l.slug = payload.slug
    if payload.name is not None:
        l.name = payload.name
    if payload.description is not None:
        l.description = payload.description
    if payload.price_brl is not None:
        l.price_brl = Decimal(str(payload.price_brl))
    if payload.is_active is not None:
        l.is_active = payload.is_active
    db.commit()
    db.refresh(l)
    return _level_dict(l)


@app.delete("/admin/module-levels/{lid}", status_code=204)
def admin_delete_module_level(
    lid: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    _csrf: None = Depends(require_csrf_header),
):
    l = db.get(ModuleLevel, lid)
    if not l:
        raise HTTPException(status_code=404, detail="Nível não encontrado")
    db.delete(l)
    db.commit()


# ---------------------------------------------------------------------------
# Modules
# ---------------------------------------------------------------------------

def _level_dict(l: ModuleLevel) -> Dict[str, Any]:
    return {
        "id": l.id,
        "slug": l.slug,
        "name": l.name,
        "description": l.description,
        "price_brl": float(l.price_brl),
        "is_active": l.is_active,
        "created_at": l.created_at.isoformat() if l.created_at else None,
    }


def _module_dict(m: Module) -> Dict[str, Any]:
    lvl = m.level if m.level else None
    return {
        "id": m.id,
        "slug": m.slug,
        "name": m.name,
        "description": m.description,
        "image_svg": m.image_svg,
        "use_opening_prompt": m.use_opening_prompt,
        "opening_prompt": m.opening_prompt,
        "few_shot": m.few_shot,
        "welcome_message": m.welcome_message,
        "system_prompt": m.system_prompt,
        "is_active": m.is_active,
        "module_type": m.module_type or "free",
        "level_id": m.level_id,
        "level_name": lvl.name if lvl else None,
        "level_slug": lvl.slug if lvl else None,
        "level_price_brl": float(lvl.price_brl) if lvl else None,
        # price_brl = preço do nível (ou legado do próprio módulo)
        "price_brl": float(lvl.price_brl) if lvl else (float(m.price_brl) if m.price_brl is not None else None),
        "life_category": m.life_category,
    }


@app.get("/modules")
def list_modules(db: Session = Depends(get_db)):
    rows = db.query(Module).filter(Module.is_active == True).order_by(Module.id).all()
    return {"items": [_module_dict(m) for m in rows]}


@app.get("/settings")
def get_site_settings(db: Session = Depends(get_db)):
    """Public endpoint — no authentication required."""
    rows = db.query(SiteSettings).all()
    return {r.key: r.value for r in rows}


# ---------------------------------------------------------------------------
# Admin – Module CRUD
# ---------------------------------------------------------------------------

class ModuleCreate(BaseModel):
    slug: str
    name: str
    description: Optional[str] = None
    image_svg: Optional[str] = None
    system_prompt: str
    opening_prompt: Optional[str] = None
    few_shot: Optional[str] = None
    welcome_message: Optional[str] = None
    use_opening_prompt: bool = False
    is_active: bool = True
    module_type: str = "free"
    level_id: Optional[int] = None
    price_brl: Optional[float] = None   # legado; ignorado se level_id fornecido
    life_category: Optional[str] = None  # 'lyra'|'pleiades'|'sirius'|'orion'|'arcturus'|'andromeda'


class ModuleUpdate(BaseModel):
    slug: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    image_svg: Optional[str] = None
    system_prompt: Optional[str] = None
    opening_prompt: Optional[str] = None
    few_shot: Optional[str] = None
    welcome_message: Optional[str] = None
    use_opening_prompt: Optional[bool] = None
    show_opening_prompt: Optional[bool] = None
    is_active: Optional[bool] = None
    module_type: Optional[str] = None
    level_id: Optional[int] = None
    price_brl: Optional[float] = None   # legado
    life_category: Optional[str] = None  # 'lyra'|'pleiades'|'sirius'|'orion'|'arcturus'|'andromeda'


@app.get("/admin/modules")
def admin_list_modules(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    rows = db.query(Module).order_by(Module.id).all()
    return {"items": [_module_dict(m) for m in rows]}


@app.post("/admin/modules", status_code=201)
def admin_create_module(
    payload: ModuleCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    _csrf: None = Depends(require_csrf_header),
):
    existing = db.query(Module).filter(Module.slug == payload.slug).first()
    if existing:
        raise HTTPException(status_code=409, detail="Slug já cadastrado")
    m = Module(
        slug=payload.slug,
        name=payload.name,
        description=payload.description,
        image_svg=payload.image_svg,
        system_prompt=payload.system_prompt,
        opening_prompt=payload.opening_prompt,
        few_shot=payload.few_shot,
        welcome_message=payload.welcome_message,
        use_opening_prompt=payload.use_opening_prompt,
        is_active=payload.is_active,
        module_type=payload.module_type or "free",
        level_id=payload.level_id,
        price_brl=Decimal(str(payload.price_brl)) if payload.price_brl is not None else None,
        life_category=payload.life_category,
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return _module_dict(m)


@app.get("/admin/modules/{mid}")
def admin_get_module(
    mid: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    m = db.get(Module, mid)
    if not m:
        raise HTTPException(status_code=404, detail="Módulo não encontrado")
    return _module_dict(m)


@app.put("/admin/modules/{mid}")
def admin_update_module(
    mid: int,
    payload: ModuleUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    _csrf: None = Depends(require_csrf_header),
):
    m = db.get(Module, mid)
    if not m:
        raise HTTPException(status_code=404, detail="Módulo não encontrado")
    if payload.slug is not None:
        conflict = db.query(Module).filter(Module.slug == payload.slug, Module.id != mid).first()
        if conflict:
            raise HTTPException(status_code=409, detail="Slug já cadastrado")
        m.slug = payload.slug
    if payload.name is not None:
        m.name = payload.name
    if payload.description is not None:
        m.description = payload.description
    if payload.image_svg is not None:
        m.image_svg = payload.image_svg
    if payload.system_prompt is not None:
        m.system_prompt = payload.system_prompt
    if payload.opening_prompt is not None:
        m.opening_prompt = payload.opening_prompt
    if payload.few_shot is not None:
        m.few_shot = payload.few_shot
    if payload.welcome_message is not None:
        m.welcome_message = payload.welcome_message
    if payload.use_opening_prompt is not None:
        m.use_opening_prompt = payload.use_opening_prompt
    if payload.show_opening_prompt is not None:
        m.show_opening_prompt = payload.show_opening_prompt
    if payload.is_active is not None:
        m.is_active = payload.is_active
    if payload.module_type is not None:
        m.module_type = payload.module_type
    if payload.level_id is not None:
        m.level_id = payload.level_id
    if payload.price_brl is not None:
        m.price_brl = Decimal(str(payload.price_brl))
    if "life_category" in payload.model_fields_set:
        m.life_category = payload.life_category
    db.commit()
    db.refresh(m)
    return _module_dict(m)


@app.delete("/admin/modules/{mid}", status_code=204)
def admin_delete_module(
    mid: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    _csrf: None = Depends(require_csrf_header),
):
    m = db.get(Module, mid)
    if not m:
        raise HTTPException(status_code=404, detail="Módulo não encontrado")
    db.delete(m)
    db.commit()


# ---------------------------------------------------------------------------
# Module Packages (pacotes de módulos fixos)
# ---------------------------------------------------------------------------

def _pkg_dict(p: ModulePackage) -> Dict[str, Any]:
    return {
        "id": p.id,
        "level_id": p.level_id,
        "level_name": p.level.name if p.level else None,
        "quantity": p.quantity,
        "price_brl": float(p.price_brl),
        "description": p.description,
        "is_active": p.is_active,
    }


class PackageCreate(BaseModel):
    level_id: Optional[int] = None
    quantity: int
    price_brl: float
    description: Optional[str] = None
    is_active: bool = True


class PackageUpdate(BaseModel):
    level_id: Optional[int] = None
    quantity: Optional[int] = None
    price_brl: Optional[float] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


@app.get("/module-packages")
def list_module_packages(db: Session = Depends(get_db)):
    rows = db.query(ModulePackage).filter(ModulePackage.is_active == True).order_by(ModulePackage.level_id, ModulePackage.quantity).all()
    return {"items": [_pkg_dict(p) for p in rows]}


@app.get("/admin/module-packages")
def admin_list_module_packages(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.query(ModulePackage).order_by(ModulePackage.level_id, ModulePackage.quantity).all()
    return {"items": [_pkg_dict(p) for p in rows]}


@app.post("/admin/module-packages", status_code=201)
def admin_create_module_package(
    payload: PackageCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    _csrf: None = Depends(require_csrf_header),
):
    existing = db.query(ModulePackage).filter(
        ModulePackage.level_id == payload.level_id,
        ModulePackage.quantity == payload.quantity,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Já existe pacote para essa quantidade neste nível")
    p = ModulePackage(
        level_id=payload.level_id,
        quantity=payload.quantity,
        price_brl=Decimal(str(payload.price_brl)),
        description=payload.description,
        is_active=payload.is_active,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return _pkg_dict(p)


@app.put("/admin/module-packages/{pid}")
def admin_update_module_package(
    pid: int,
    payload: PackageUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    _csrf: None = Depends(require_csrf_header),
):
    p = db.get(ModulePackage, pid)
    if not p:
        raise HTTPException(status_code=404, detail="Pacote não encontrado")
    new_level_id = payload.level_id if payload.level_id is not None else p.level_id
    new_quantity  = payload.quantity  if payload.quantity  is not None else p.quantity
    if payload.level_id is not None or payload.quantity is not None:
        conflict = db.query(ModulePackage).filter(
            ModulePackage.level_id == new_level_id,
            ModulePackage.quantity == new_quantity,
            ModulePackage.id != pid,
        ).first()
        if conflict:
            raise HTTPException(status_code=409, detail="Já existe pacote para essa quantidade neste nível")
        p.level_id = new_level_id
        p.quantity  = new_quantity
    if payload.price_brl is not None:
        p.price_brl = Decimal(str(payload.price_brl))
    if payload.description is not None:
        p.description = payload.description
    if payload.is_active is not None:
        p.is_active = payload.is_active
    db.commit()
    db.refresh(p)
    return _pkg_dict(p)


@app.delete("/admin/module-packages/{pid}", status_code=204)
def admin_delete_module_package(
    pid: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    _csrf: None = Depends(require_csrf_header),
):
    p = db.get(ModulePackage, pid)
    if not p:
        raise HTTPException(status_code=404, detail="Pacote não encontrado")
    db.delete(p)
    db.commit()


# ---------------------------------------------------------------------------
# Module Purchase (compra de módulos fixos)
# ---------------------------------------------------------------------------

class ModulePurchaseIn(BaseModel):
    # module_id -> quantity  (e.g. {1: 3, 2: 1} = 3 units of module 1 + 1 unit of module 2)
    module_quantities: Dict[int, int]
    payment_method: str


@app.get("/user-modules")
def list_user_modules(user: User = Depends(require_user), db: Session = Depends(get_db)):
    from sqlalchemy import func as sa_func
    rows = db.query(UserModule).filter(UserModule.user_id == user.id).all()
    total_quantity = sum(r.quantity for r in rows)
    # Conta apenas sessões onde o fluxo já foi iniciado (flow_step > 0)
    total_active = db.query(ChatSession).filter(
        ChatSession.user_id == user.id, ChatSession.flow_step > 0
    ).count()
    total_available = max(0, total_quantity - total_active)
    if not rows:
        return {"items": [], "total_quantity": 0, "total_active": 0, "total_available": 0}
    module_ids = [r.module_id for r in rows]
    # Count started sessions per module for this user
    counts = dict(
        db.query(ChatSession.module_id, sa_func.count(ChatSession.id))
        .filter(ChatSession.user_id == user.id, ChatSession.module_id.in_(module_ids), ChatSession.flow_step > 0)
        .group_by(ChatSession.module_id)
        .all()
    )
    return {
        "items": [{
            "module_id": r.module_id,
            "quantity": r.quantity,
            "available_qty": max(0, r.quantity - counts.get(r.module_id, 0)),
            "purchased_at": r.purchased_at.isoformat(),
        } for r in rows],
        "total_quantity": total_quantity,
        "total_active": total_active,
        "total_available": total_available,
    }


@app.post("/modules/purchase")
def purchase_modules(
    payload: ModulePurchaseIn,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
    _csrf: None = Depends(require_csrf_header),
):
    if not payload.module_quantities:
        raise HTTPException(status_code=400, detail="Selecione ao menos um módulo.")

    module_ids = list(payload.module_quantities.keys())

    # Validate modules: must be active and fixed
    modules = db.query(Module).filter(
        Module.id.in_(module_ids),
        Module.is_active == True,
        Module.module_type == "fixed",
    ).all()

    if len(modules) != len(module_ids):
        raise HTTPException(status_code=400, detail="Um ou mais módulos são inválidos ou não disponíveis.")

    # Total units being purchased
    total_qty = sum(payload.module_quantities.values())

    # Preço calculado por nível: agrupa qtd por level_id e busca pacote por nível
    mod_map = {m.id: m for m in modules}

    # level_id (None = sem nível) -> total de unidades selecionadas desse nível
    level_qtys: Dict[Optional[int], int] = {}
    for mid, qty in payload.module_quantities.items():
        lid = mod_map[mid].level_id
        level_qtys[lid] = level_qtys.get(lid, 0) + qty

    price = Decimal("0")
    for lid, qty in level_qtys.items():
        pkg = db.query(ModulePackage).filter(
            ModulePackage.level_id == lid,
            ModulePackage.quantity == qty,
            ModulePackage.is_active == True,
        ).first()
        if pkg:
            price += Decimal(str(pkg.price_brl))
        else:
            for mid, q in payload.module_quantities.items():
                if mod_map[mid].level_id != lid:
                    continue
                m = mod_map[mid]
                unit = Decimal(str(m.level.price_brl)) if m.level else (m.price_brl or Decimal("0"))
                price += unit * q

    # Create order
    order = ModuleOrder(
        user_id=user.id,
        module_ids=json.dumps(module_ids),
        quantity=total_qty,
        price_brl=price,
        payment_method=payload.payment_method,
        status="completed",
    )
    db.add(order)
    db.flush()  # get order.id

    # Grant access: upsert quantity
    existing = {
        r.module_id: r
        for r in db.query(UserModule).filter(
            UserModule.user_id == user.id, UserModule.module_id.in_(module_ids)
        ).all()
    }
    for m in modules:
        add_qty = payload.module_quantities[m.id]
        if m.id in existing:
            existing[m.id].quantity += add_qty
        else:
            db.add(UserModule(user_id=user.id, module_id=m.id, quantity=add_qty, order_id=order.id))

    db.commit()

    return {
        "status": "ok",
        "order_id": order.id,
        "quantity": total_qty,
        "price_brl": float(price),
        "modules": [{"id": m.id, "name": m.name} for m in modules],
    }


# ---------------------------------------------------------------------------
# Sessions
# ---------------------------------------------------------------------------

def _build_flow_prompt(step: ModuleFlowStep, subject: Any, user: User) -> str:
    """Substitui variáveis no prompt_template com dados do usuário/filho."""
    template = step.prompt_template or ""

    full_name      = getattr(subject, "full_name", "") or ""
    initiatic_name = getattr(subject, "initiatic_name", "") or ""
    birth_date_raw = getattr(subject, "birth_date", None)
    birth_time     = getattr(subject, "birth_time", "") or ""
    birth_country  = getattr(subject, "birth_country", "") or ""
    birth_state    = getattr(subject, "birth_state", "") or ""
    birth_city     = getattr(subject, "birth_city", "") or ""

    first = full_name.strip().split()[0] if full_name.strip() else "Amigo"
    birth_date_str = birth_date_raw.strftime("%d/%m/%Y") if birth_date_raw else ""
    birth_location = ", ".join(filter(None, [birth_city, birth_state, birth_country]))

    try:
        return template.format(
            first=first,
            full_name=full_name,
            initiatic_name=initiatic_name,
            birth_date=birth_date_str,
            birth_time=birth_time,
            birth_country=birth_country,
            birth_state=birth_state,
            birth_city=birth_city,
            birth_location=birth_location,
        )
    except KeyError:
        return template  # devolve sem substituição se houver variável inválida


def session_to_dict(s: ChatSession) -> Dict[str, Any]:
    flow_step = s.flow_step or 0
    flow_next_button: Optional[str] = None
    flow_next_response: Optional[str] = None
    if s.module:
        next_order = flow_step + 1
        for fs in (s.module.flow_steps or []):
            if fs.step_order == next_order:
                flow_next_button = fs.button_label
                flow_next_response = fs.button_response
                break

    return {
        "id": s.id,
        "title": s.title or "Conversa",
        "child_id": s.child_id,
        "child_name": s.child.full_name if s.child else None,
        "module_id": s.module_id,
        "module_name": s.module.name if s.module else None,
        "module_slug": s.module.slug if s.module else None,
        "module_use_opening_prompt": s.module.use_opening_prompt if s.module else False,
        "module_opening_prompt": s.module.opening_prompt if s.module else None,
        "module_welcome_message": s.module.welcome_message if s.module else None,
        "module_type": s.module.module_type if s.module else "free",
        "flow_step": flow_step,
        "flow_next_button": flow_next_button,
        "flow_next_response": flow_next_response,
        "created_at": s.created_at.isoformat() if s.created_at else None,
        "updated_at": s.updated_at.isoformat() if s.updated_at else None,
        "messages": [
            {
                "role": m.role,
                "content": m.content,
                "ts": m.ts.isoformat() if m.ts else None,
                "hidden": bool(m.hidden),
            }
            for m in s.messages
        ],
    }


def list_item_from_session(s: ChatSession) -> Dict[str, Any]:
    preview = ""
    for m in s.messages:
        if m.role == "assistant" and (m.content or ""):
            t = (m.content or "").strip()
            preview = (t[:60] + "…") if len(t) > 60 else t
            break
    if not preview:
        for m in s.messages:
            if m.role == "user" and (m.content or ""):
                t = (m.content or "").strip()
                preview = (t[:60] + "…") if len(t) > 60 else t
                break
    coins_consumed: Dict[str, float] = {"gold": 0.0, "silver": 0.0, "bronze": 0.0}
    for m in s.messages:
        if m.coin_value is not None and m.coin_type in coins_consumed:
            coins_consumed[m.coin_type] += float(m.coin_value)
    return {
        "id": s.id,
        "title": s.title or "Conversa",
        "child_id": s.child_id,
        "child_name": s.child.full_name if s.child else None,
        "module_id": s.module_id,
        "module_name": s.module.name if s.module else None,
        "module_slug": s.module.slug if s.module else None,
        "created_at": s.created_at.isoformat() if s.created_at else None,
        "updated_at": s.updated_at.isoformat() if s.updated_at else None,
        "preview": preview,
        "coins_consumed": coins_consumed,
        "flow_step": s.flow_step or 0,
    }


@app.post("/sessions")
def create_session(
    payload: SessionCreate,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
    _csrf: None = Depends(require_csrf_header),
):
    module = db.get(Module, payload.module_id)
    if not module or not module.is_active:
        raise HTTPException(status_code=404, detail="Módulo não encontrado.")

    # Módulo fixo: verificar se o usuário adquiriu e tem unidades disponíveis
    if module.module_type == "fixed":
        owned = db.query(UserModule).filter(
            UserModule.user_id == user.id, UserModule.module_id == module.id
        ).first()
        if not owned:
            raise HTTPException(
                status_code=402,
                detail="Você não adquiriu este módulo. Compre-o na loja para ter acesso.",
            )
        used_count = db.query(ChatSession).filter(
            ChatSession.user_id == user.id, ChatSession.module_id == module.id, ChatSession.flow_step > 0
        ).count()
        if used_count >= owned.quantity:
            raise HTTPException(
                status_code=402,
                detail="Você atingiu o limite de conexões para este módulo. Adquira mais unidades na loja.",
            )

    # Validate child belongs to this user (if provided)
    child = None
    if payload.child_id is not None:
        child = db.query(Child).filter(Child.id == payload.child_id, Child.user_id == user.id).first()
        if not child:
            raise HTTPException(status_code=404, detail="Filho não encontrado.")

    cid = uuid.uuid4().hex
    s = ChatSession(id=cid, user_id=user.id, module_id=module.id, child_id=payload.child_id, title="Nova conversa")
    db.add(s)
    db.commit()
    s.updated_at = _now()
    db.commit()
    return {
        "id": cid,
        "module_id": module.id,
        "module_slug": module.slug,
        "module_name": module.name,
        "child_id": payload.child_id,
        "child_name": child.full_name if child else None,
    }


@app.get("/sessions")
def list_sessions(user: User = Depends(require_user), db: Session = Depends(get_db)):
    rows = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == user.id)
        .order_by(ChatSession.updated_at.desc())
        .all()
    )
    for r in rows:
        _ = r.messages
        _ = r.module
        _ = r.child
    return {"items": [list_item_from_session(s) for s in rows]}


@app.get("/sessions/{cid}")
def get_session(
    cid: str = FPath(..., description="ID da conversa"),
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    s = (
        db.query(ChatSession)
        .filter(ChatSession.id == cid, ChatSession.user_id == user.id)
        .first()
    )
    if not s:
        raise HTTPException(status_code=404, detail="Sessão não encontrada.")
    _ = s.messages
    _ = s.module
    if s.module:
        _ = s.module.flow_steps  # eager-load para session_to_dict
    _ = s.child
    return session_to_dict(s)


@app.patch("/sessions/{cid}")
def update_session(
    cid: str,
    payload: SessionUpdate,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
    _csrf: None = Depends(require_csrf_header),
):
    s = (
        db.query(ChatSession)
        .filter(ChatSession.id == cid, ChatSession.user_id == user.id)
        .first()
    )
    if not s:
        raise HTTPException(status_code=404, detail="Sessão não encontrada.")
    if payload.title is not None:
        s.title = (payload.title or "").strip() or "Conversa"
        s.updated_at = _now()
    db.commit()
    return {"status": "ok", "id": cid, "title": s.title}


@app.delete("/sessions/{cid}")
def delete_session(
    cid: str,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
    _csrf: None = Depends(require_csrf_header),
):
    s = (
        db.query(ChatSession)
        .filter(ChatSession.id == cid, ChatSession.user_id == user.id)
        .first()
    )
    if not s:
        raise HTTPException(status_code=404, detail="Sessão não encontrada.")
    if s.flow_step and s.flow_step > 0:
        raise HTTPException(status_code=403, detail="Não é possível excluir uma conexão que já foi iniciada.")
    db.delete(s)
    db.commit()
    return {"status": "ok"}


@app.post("/sessions/{cid}/flow-advance")
def flow_advance(
    cid: str,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
    _csrf: None = Depends(require_csrf_header),
):
    """Executa o próximo passo do fluxo do módulo na sessão.

    Salva o prompt (com variáveis resolvidas) como mensagem de usuário,
    incrementa flow_step e retorna o botão do passo seguinte (se houver).
    O cliente deve então abrir o SSE para receber a resposta do agente.
    """
    s = (
        db.query(ChatSession)
        .filter(ChatSession.id == cid, ChatSession.user_id == user.id)
        .first()
    )
    if not s:
        raise HTTPException(status_code=404, detail="Sessão não encontrada.")

    next_order = (s.flow_step or 0) + 1
    step = (
        db.query(ModuleFlowStep)
        .filter(
            ModuleFlowStep.module_id == s.module_id,
            ModuleFlowStep.step_order == next_order,
        )
        .first()
    )
    if not step:
        raise HTTPException(status_code=404, detail="Nenhum próximo passo de fluxo definido.")

    subject = s.child if s.child_id and s.child else user
    prompt = _build_flow_prompt(step, subject, user)

    now = _now()
    # 1. Bubble visível do assistente (label do botão que o usuário viu)
    if step.button_label:
        db.add(Message(
            session_id=s.id, role="assistant",
            content=step.button_label, hidden=False,
            ts=now,
        ))
    # 2. Bubble visível do usuário (resposta configurada ou o próprio label)
    visible_response = (step.button_response or step.button_label or "").strip()
    if visible_response:
        db.add(Message(
            session_id=s.id, role="user",
            content=visible_response, hidden=False,
            ts=now + timedelta(milliseconds=1),
        ))
    # 3. Prompt real enviado ao agente (sempre oculto da UI)
    db.add(Message(
        session_id=s.id, role="user",
        content=prompt, hidden=True,
        ts=now + timedelta(milliseconds=2),
    ))
    s.flow_step = next_order
    s.updated_at = _now()
    db.commit()

    next_next = (
        db.query(ModuleFlowStep)
        .filter(
            ModuleFlowStep.module_id == s.module_id,
            ModuleFlowStep.step_order == next_order + 1,
        )
        .first()
    )

    return {
        "status": "ok",
        "flow_step": s.flow_step,
        "flow_next_button": next_next.button_label if next_next else None,
        "flow_next_response": next_next.user_response if next_next else None,
    }


# ---------------------------------------------------------------------------
# Lives — geração e persistência de todas as vidas akáshicas
# ---------------------------------------------------------------------------

# Mapeamento de life_category → nome legível usado nos prompts
_LIFE_CATEGORY_LABELS: Dict[str, str] = {
    "gaia":      "Gaia (vidas passadas em Terra)",
    "future":    "Futuro Probabilístico",
    "lyra":      "Lyra (civilização lírica/felina)",
    "pleiades":  "Plêiades (civilização pleiadiana)",
    "sirius":    "Sírius (civilização síria)",
    "orion":     "Órion (civilização orionita)",
    "arcturus":  "Arcturus (civilização arcturiana)",
    "andromeda": "Andrômeda (civilização andromedana)",
    "eu_sou":    "EU SOU (escolha livre entre locais fora de Gaia já persistidos)",
}

# Categorias que representam locais fora de Gaia (geradas por módulos específicos)
_OUTSIDE_GAIA_CATEGORIES = {"lyra", "pleiades", "sirius", "orion", "arcturus", "andromeda"}

# Módulos especiais que usam vidas fora de Gaia já existentes sem gerar novas
_USES_ANY_OUTSIDE_GAIA = {"eu_sou"}

_GAIA_FUTURE_PROMPT = """\
Você é um canal de Registros Akáshicos. Gere EXATAMENTE 3 vidas passadas em Gaia \
e 3 vidas futuras probabilísticas para a pessoa abaixo.

Dados da pessoa:
- Nome completo: {full_name}
- Nome iniciático: {initiatic_name}
- Data de nascimento: {birth_date}
- Local de nascimento: {birth_location}

Retorne APENAS JSON válido, sem nenhum texto fora do JSON, no seguinte formato:
{{
  "gaia": [
    {{
      "order": 1,
      "name": "Nome místico da vida (Ex: Lunara de Lemúria)",
      "era": "Período e data aproximada (Ex: 50 mil a.C., Pacífico Perdido)",
      "location": "Local específico em Gaia (Ex: Lemúria)",
      "brief": "Frase breve e poética de identificação (Ex: Sacerdotisa das águas cristalinas)",
      "detail": "Dois ou três parágrafos detalhados sobre esta vida"
    }},
    {{"order": 2, "name": "...", "era": "...", "location": "...", "brief": "...", "detail": "..."}},
    {{"order": 3, "name": "...", "era": "...", "location": "...", "brief": "...", "detail": "..."}}
  ],
  "future": [
    {{
      "order": 1,
      "name": "Nome místico (Ex: Nova de 2047)",
      "era": "Ano e contexto (Ex: 2047, Nova Terra Regenerada)",
      "location": "Local futuro (Ex: Ecovilas Brasileiras)",
      "brief": "Frase breve e poética de identificação",
      "detail": "Dois ou três parágrafos detalhados sobre esta vida futura"
    }},
    {{"order": 2, "name": "...", "era": "...", "location": "...", "brief": "...", "detail": "..."}},
    {{"order": 3, "name": "...", "era": "...", "location": "...", "brief": "...", "detail": "..."}}
  ]
}}"""

def _build_outside_gaia_prompt(location_label: str, info: dict, count: int, start_order: int) -> str:
    """Monta o prompt para gerar `count` vidas fora de Gaia a partir de `start_order`."""
    orders = list(range(start_order, start_order + count))
    first_order = orders[0]
    extra_lines = "\n    ".join(
        f'{{"order": {o}, "name": "...", "era": "...", "location": "...", "brief": "...", "detail": "..."}}'
        for o in orders[1:]
    )
    lives_schema = (
        f'{{\n'
        f'      "order": {first_order},\n'
        f'      "name": "Nome místico da entidade nessa vida (Ex: Lirael de Lyra)",\n'
        f'      "era": "Período e contexto temporal (Ex: Era Primordial Lírica, há 500 mil anos terrestres)",\n'
        f'      "location": "Local específico no planeta/estrela (Ex: Campos de Cristal de Vega)",\n'
        f'      "brief": "Frase breve e poética de identificação (Ex: Barda cósmica das harmonias primordiais)",\n'
        f'      "detail": "Dois ou três parágrafos detalhados sobre esta vida"\n'
        f'    }}'
    )
    if extra_lines:
        lives_schema += f',\n    {extra_lines}'
    return (
        f'Você é um canal de Registros Akáshicos. Gere EXATAMENTE {count} vida(s) passada(s) em {location_label} '
        f'para a pessoa abaixo. As vidas devem ser ricas em detalhes sobre a civilização e cultura desse planeta/estrela.\n\n'
        f'Dados da pessoa:\n'
        f'- Nome completo: {info["full_name"]}\n'
        f'- Nome iniciático: {info["initiatic_name"]}\n'
        f'- Data de nascimento: {info["birth_date"]}\n'
        f'- Local de nascimento: {info["birth_location"]}\n\n'
        f'Retorne APENAS JSON válido, sem nenhum texto fora do JSON, no seguinte formato:\n'
        f'{{\n  "lives": [\n    {lives_schema}\n  ]\n}}'
    )


def _parse_json_response(raw: str) -> dict:
    """Remove markdown code fences e faz parse do JSON."""
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("```", 2)[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.rsplit("```", 1)[0].strip()
    return json.loads(raw)


def _subject_info(subject) -> dict:
    full_name      = getattr(subject, "full_name", "") or ""
    initiatic_name = getattr(subject, "initiatic_name", "") or ""
    birth_date_raw = getattr(subject, "birth_date", None)
    birth_date_str = birth_date_raw.strftime("%d/%m/%Y") if birth_date_raw else "não informada"
    birth_country  = getattr(subject, "birth_country", "") or ""
    birth_state    = getattr(subject, "birth_state", "") or ""
    birth_city     = getattr(subject, "birth_city", "") or ""
    birth_location = ", ".join(filter(None, [birth_city, birth_state, birth_country])) or "não informado"
    return dict(
        full_name=full_name or "não informado",
        initiatic_name=initiatic_name or "não informado",
        birth_date=birth_date_str,
        birth_location=birth_location,
    )


def _save_lives(user_id: int, child_id: Optional[int], category: str, items: list, db: Session) -> None:
    for item in items:
        order = int(item.get("order", 0))
        if order < 1 or order > 3:
            continue
        life = UserLife(
            user_id=user_id,
            child_id=child_id,
            life_category=category,
            life_order=order,
            life_name=str(item.get("name", ""))[:300],
            life_era=str(item.get("era", ""))[:300],
            life_location=str(item.get("location", ""))[:300],
            life_brief=str(item.get("brief", ""))[:500],
            life_detail=str(item.get("detail", "")),
        )
        db.merge(life)
    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        print(f"[lives] Erro ao salvar categoria={category}: {exc}")


def _generate_gaia_future(user_id: int, child_id: Optional[int], subject, db: Session) -> None:
    """Gera e persiste 3 vidas em Gaia + 3 vidas Futuras (chamado uma única vez por pessoa)."""
    info = _subject_info(subject)
    try:
        chat = ChatXAI(model=DEFAULT_MODEL, temperature=0.4)
        response = chat.invoke([
            SystemMessage(content="Você é um gerador de registros akáshicos. Responda APENAS com JSON válido."),
            HumanMessage(content=_GAIA_FUTURE_PROMPT.format(**info)),
        ])
        data = _parse_json_response(getattr(response, "content", "") or "")
    except Exception as exc:
        print(f"[lives] Falha ao gerar gaia+future user={user_id} child={child_id}: {exc}")
        return

    for category in ("gaia", "future"):
        _save_lives(user_id, child_id, category, data.get(category, []), db)
    print(f"[lives] gaia+future persistidas para user={user_id} child={child_id}")


def _generate_outside_gaia(
    user_id: int, child_id: Optional[int], subject, category: str, db: Session,
    count: int = 3, start_order: int = 1,
) -> None:
    """Gera e persiste `count` vidas para uma localização fora de Gaia, a partir de `start_order`."""
    if count < 1:
        return
    location_label = _LIFE_CATEGORY_LABELS.get(category, category)
    info = _subject_info(subject)
    try:
        chat = ChatXAI(model=DEFAULT_MODEL, temperature=0.4)
        response = chat.invoke([
            SystemMessage(content="Você é um gerador de registros akáshicos. Responda APENAS com JSON válido."),
            HumanMessage(content=_build_outside_gaia_prompt(location_label, info, count, start_order)),
        ])
        data = _parse_json_response(getattr(response, "content", "") or "")
    except Exception as exc:
        print(f"[lives] Falha ao gerar {category} user={user_id} child={child_id}: {exc}")
        return

    _save_lives(user_id, child_id, category, data.get("lives", []), db)
    print(f"[lives] {category} ({count} vida(s) a partir de order={start_order}) persistidas para user={user_id} child={child_id}")


def _generate_eu_sou_outside_gaia(
    user_id: int, child_id: Optional[int], subject, db: Session,
) -> None:
    """Quando EU SOU é o primeiro módulo, gera 1 vida seed em 3 locais aleatórios fora de Gaia."""
    import random
    existing_cats = {
        r.life_category
        for r in db.query(UserLife.life_category)
        .filter(UserLife.user_id == user_id, UserLife.child_id == child_id)
        .distinct()
        .all()
    }
    available = [c for c in _OUTSIDE_GAIA_CATEGORIES if c not in existing_cats]
    if not available:
        return
    chosen = random.sample(available, min(3, len(available)))
    for cat in chosen:
        _generate_outside_gaia(user_id, child_id, subject, cat, db, count=1, start_order=1)
    print(f"[lives] eu_sou seeds geradas em {chosen} para user={user_id} child={child_id}")


def _build_lives_context(
    user_id: int,
    child_id: Optional[int],
    db: Session,
    module_life_category: Optional[str] = None,
) -> str:
    """Retorna bloco de texto com as vidas persistidas para injetar no system prompt.

    Comportamento por module_life_category:
    - None / ausente      → injeta apenas Gaia + Futuro
    - categoria específica → injeta Gaia + Futuro + as 3 vidas daquela localização
    - 'eu_sou'            → injeta Gaia + Futuro + TODAS as vidas fora de Gaia já salvas,
                             com instrução para o agente escolher livremente 3 (uma por local)
    """
    lives = (
        db.query(UserLife)
        .filter(UserLife.user_id == user_id, UserLife.child_id == child_id)
        .order_by(UserLife.life_category, UserLife.life_order)
        .all()
    )
    if not lives:
        return ""

    # Agrupa por categoria
    by_cat: Dict[str, list] = {}
    for lv in lives:
        by_cat.setdefault(lv.life_category, []).append(lv)

    # Decide quais categorias fora de Gaia incluir
    if module_life_category in _USES_ANY_OUTSIDE_GAIA:
        # Inclui todas as categorias fora de Gaia que já foram salvas
        outside_cats = [c for c in ["lyra", "pleiades", "sirius", "orion", "arcturus", "andromeda"]
                        if c in by_cat]
    elif module_life_category in _OUTSIDE_GAIA_CATEGORIES:
        outside_cats = [module_life_category] if module_life_category in by_cat else []
    else:
        outside_cats = []

    # Se não há nada relevante a injetar além de gaia/future, e eles não existem, retorna vazio
    has_gaia   = "gaia"   in by_cat
    has_future = "future" in by_cat
    if not has_gaia and not has_future and not outside_cats:
        return ""

    lines = [
        "",
        "---",
        "VIDAS AKÁSHICAS JÁ REGISTRADAS PARA ESTA PESSOA:",
        "",
    ]

    # Vidas fora de Gaia
    if outside_cats:
        if module_life_category in _USES_ANY_OUTSIDE_GAIA:
            n_locs = len(outside_cats)
            n_choose = min(3, n_locs)
            lines.append(
                f"Vidas Fora de Gaia disponíveis — {n_locs} localização(ões) salva(s). "
                f"Escolha EXATAMENTE {n_choose} vida(s), UMA por localização (localizações diferentes). "
                "NUNCA use mais de uma vida da mesma localização. "
                "Não altere nomes, eras, locais nem personalidades das vidas escolhidas:"
            )
            # Para eu_sou: expõe apenas 1 vida por localização (a de melhor destaque = life_order=1)
            for cat in outside_cats:
                label = _LIFE_CATEGORY_LABELS.get(cat, cat)
                lv = by_cat[cat][0]  # life_order mais baixo = mais representativa
                lines.append(f"  [{label}] {lv.life_name} ({lv.life_era}, {lv.life_location}): {lv.life_brief}")
        else:
            label = _LIFE_CATEGORY_LABELS.get(outside_cats[0], outside_cats[0])
            lines.append(f"Vidas em {label} — USE EXATAMENTE ESTAS (não altere nomes, eras nem personalidades):")
            for lv in by_cat[outside_cats[0]]:
                lines.append(f"    {lv.life_order}. {lv.life_name} ({lv.life_era}, {lv.life_location}): {lv.life_brief}")
        lines.append("")

    # Gaia
    if has_gaia:
        lines.append("Vidas Passadas em Gaia — USE EXATAMENTE ESTAS (não altere nomes, eras nem personalidades):")
        for lv in by_cat["gaia"]:
            lines.append(f"  {lv.life_order}. {lv.life_name} ({lv.life_era}, {lv.life_location}): {lv.life_brief}")
        lines.append("")

    # Futuro
    if has_future:
        lines.append("Vidas Futuras — USE EXATAMENTE ESTAS (não altere nomes, eras nem personalidades):")
        for lv in by_cat["future"]:
            lines.append(f"  {lv.life_order}. {lv.life_name} ({lv.life_era}, {lv.life_location}): {lv.life_brief}")
        lines.append("")

    lines.append("---")
    return "\n".join(lines)


@app.post("/sessions/{cid}/send-opening")
def send_opening(
    cid: str,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
    _csrf: None = Depends(require_csrf_header),
):
    """Dispara o opening prompt do módulo na sessão.

    Resolve as variáveis do template com dados do usuário/filho,
    persiste como mensagem de usuário e retorna ok.
    O cliente deve então abrir o SSE para receber a resposta do agente.
    """
    s = (
        db.query(ChatSession)
        .filter(ChatSession.id == cid, ChatSession.user_id == user.id)
        .first()
    )
    if not s:
        raise HTTPException(status_code=404, detail="Sessão não encontrada.")

    if not s.module or not s.module.use_opening_prompt or not s.module.opening_prompt:
        raise HTTPException(status_code=400, detail="Módulo não possui opening prompt configurado.")

    # Não reenvia se já existe mensagem de usuário na sessão
    existing = db.query(Message).filter(
        Message.session_id == s.id, Message.role == "user"
    ).first()
    if existing:
        return {"status": "already_sent"}

    subject = s.child if s.child_id and s.child else user

    # Garante vidas em Gaia + Futuras (sempre necessárias, geradas uma única vez)
    existing_cats = {
        r.life_category
        for r in db.query(UserLife.life_category)
        .filter(UserLife.user_id == user.id, UserLife.child_id == s.child_id)
        .distinct()
        .all()
    }
    if "gaia" not in existing_cats or "future" not in existing_cats:
        _generate_gaia_future(user.id, s.child_id, subject, db)

    mod_life_cat = getattr(s.module, "life_category", None)

    if mod_life_cat in _USES_ANY_OUTSIDE_GAIA:
        # EU SOU: gera 1 vida seed em 3 locais aleatórios se nenhuma vida fora de Gaia existe ainda
        has_any_outside = existing_cats & _OUTSIDE_GAIA_CATEGORIES
        if not has_any_outside:
            _generate_eu_sou_outside_gaia(user.id, s.child_id, subject, db)

    elif mod_life_cat and mod_life_cat in _OUTSIDE_GAIA_CATEGORIES:
        # Módulo específico: verifica quantas vidas já existem nessa categoria
        existing_count = (
            db.query(UserLife)
            .filter(
                UserLife.user_id == user.id,
                UserLife.child_id == s.child_id,
                UserLife.life_category == mod_life_cat,
            )
            .count()
        )
        if existing_count < 3:
            # Gera apenas as vidas faltantes, aproveitando as já salvas (ex.: seed do EU SOU)
            _generate_outside_gaia(
                user.id, s.child_id, subject, mod_life_cat, db,
                count=3 - existing_count,
                start_order=existing_count + 1,
            )

    template = s.module.opening_prompt
    full_name      = getattr(subject, "full_name", "") or ""
    initiatic_name = getattr(subject, "initiatic_name", "") or ""
    birth_date_raw = getattr(subject, "birth_date", None)
    birth_time     = getattr(subject, "birth_time", "") or ""
    birth_country  = getattr(subject, "birth_country", "") or ""
    birth_state    = getattr(subject, "birth_state", "") or ""
    birth_city     = getattr(subject, "birth_city", "") or ""
    first = full_name.strip().split()[0] if full_name.strip() else "Amigo"
    birth_date_str = birth_date_raw.strftime("%d/%m/%Y") if birth_date_raw else ""
    birth_location = ", ".join(filter(None, [birth_city, birth_state, birth_country]))
    try:
        prompt = template.format(
            first=first, full_name=full_name, initiatic_name=initiatic_name,
            birth_date=birth_date_str, birth_time=birth_time,
            birth_country=birth_country, birth_state=birth_state,
            birth_city=birth_city, birth_location=birth_location,
        )
    except KeyError:
        prompt = template

    _ = s.module  # já carregado
    db.add(Message(session_id=s.id, role="user", content=prompt, hidden=True))
    s.updated_at = _now()
    db.commit()
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Messages
# ---------------------------------------------------------------------------

DEFAULT_COSTS = {"gold": Decimal("0.3333333"), "silver": Decimal("0.6666666"), "bronze": Decimal("0.9999999")}


def _get_costs(db: Session) -> dict:
    rows = db.query(CoinProportion).all()
    costs = dict(DEFAULT_COSTS)
    for r in rows:
        costs[r.coin_type] = Decimal(str(r.cost_per_message))
    return costs


@app.get("/auth/balance")
def get_balance(user: User = Depends(require_user), db: Session = Depends(get_db)):
    costs = _get_costs(db)
    return {
        "coins_gold":   float(user.coins_gold   or 0),
        "coins_silver": float(user.coins_silver or 0),
        "coins_bronze": float(user.coins_bronze or 0),
        "costs": {k: float(v) for k, v in costs.items()},
    }


@app.get("/auth/transactions")
def get_transactions(user: User = Depends(require_user), db: Session = Depends(get_db)):
    rows = (
        db.query(CoinTransaction)
        .filter(CoinTransaction.user_id == user.id)
        .order_by(CoinTransaction.created_at.desc())
        .limit(200)
        .all()
    )
    return {
        "items": [
            {
                "id":          r.id,
                "amount":      float(r.amount),
                "type":        r.type,
                "coin_type":   r.coin_type,
                "description": r.description,
                "created_at":  r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ]
    }


@app.get("/auth/module-orders")
def get_module_orders(user: User = Depends(require_user), db: Session = Depends(get_db)):
    PAY_LABELS = {
        "credit_card": "Cartão de crédito",
        "pix": "PIX",
        "boleto": "Boleto",
    }
    STATUS_LABELS = {
        "pending":   "Pendente",
        "completed": "Concluído",
        "cancelled": "Cancelado",
        "refunded":  "Reembolsado",
    }
    rows = (
        db.query(ModuleOrder)
        .filter(ModuleOrder.user_id == user.id)
        .order_by(ModuleOrder.created_at.desc())
        .limit(200)
        .all()
    )
    return {
        "items": [
            {
                "id":             r.id,
                "quantity":       r.quantity,
                "price_brl":      float(r.price_brl),
                "payment_method": r.payment_method,
                "payment_label":  PAY_LABELS.get(r.payment_method, r.payment_method),
                "status":         r.status,
                "status_label":   STATUS_LABELS.get(r.status, r.status),
                "created_at":     r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ]
    }


# ---------------------------------------------------------------------------
# Chests (store)
# ---------------------------------------------------------------------------

class PurchaseIn(BaseModel):
    payment_method: str  # 'credit_card' | 'pix' | 'boleto'


@app.get("/chests")
def list_chests(user: User = Depends(require_user), db: Session = Depends(get_db)):
    # Raw SQL to avoid SQLAlchemy ENUM mapping issues with pre-existing MySQL tables
    rows = db.execute(
        sa_text(
            "SELECT id, name, image_url, coin_type, coin_amount, price_brl "
            "FROM coin_chests WHERE status = 'active' ORDER BY price_brl ASC"
        )
    ).mappings().all()
    return {
        "items": [
            {
                "id":          r["id"],
                "name":        r["name"],
                "image_url":   r["image_url"],
                "coin_type":   r["coin_type"],
                "coin_amount": float(r["coin_amount"]),
                "price_brl":   float(r["price_brl"]),
            }
            for r in rows
        ]
    }


@app.post("/chests/{chest_id}/purchase")
def purchase_chest(
    chest_id: int = FPath(...),
    payload: PurchaseIn = ...,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
    _csrf: None = Depends(require_csrf_header),
):
    # Raw SQL to avoid SQLAlchemy ENUM mapping issues with pre-existing MySQL tables
    chest = db.execute(
        sa_text(
            "SELECT id, name, coin_type, coin_amount, price_brl "
            "FROM coin_chests WHERE id = :id AND status = 'active'"
        ),
        {"id": chest_id},
    ).mappings().first()

    if not chest:
        raise HTTPException(status_code=404, detail="Baú não encontrado.")

    coin_type = chest["coin_type"]
    amount = Decimal(str(chest["coin_amount"]))
    field_map = {"gold": "coins_gold", "silver": "coins_silver", "bronze": "coins_bronze"}
    field = field_map.get(coin_type)
    if not field:
        raise HTTPException(status_code=400, detail=f"Tipo de moeda inválido: {coin_type!r}")

    current = Decimal(str(getattr(user, field) or 0))

    db.query(User).filter(User.id == user.id).update({field: current + amount})
    db.add(CoinTransaction(
        user_id=user.id,
        amount=amount,
        type="chest_purchase",
        coin_type=coin_type,
        description=f"Compra de baú: {chest['name']}",
    ))
    db.add(CoinOrder(
        user_id=user.id,
        chest_id=chest["id"],
        chest_name=chest["name"],
        coin_type=coin_type,
        coin_amount=amount,
        price_brl=Decimal(str(chest["price_brl"])),
        payment_method=payload.payment_method,
        status="completed",
    ))
    db.commit()

    new_balance = current + amount
    new_gold   = float(new_balance) if coin_type == "gold"   else float(user.coins_gold   or 0)
    new_silver = float(new_balance) if coin_type == "silver" else float(user.coins_silver or 0)
    new_bronze = float(new_balance) if coin_type == "bronze" else float(user.coins_bronze or 0)

    return {
        "status":       "ok",
        "chest_name":   chest["name"],
        "coin_type":    coin_type,
        "coin_amount":  float(amount),
        "price_brl":    float(chest["price_brl"]),
        "coins_gold":   new_gold,
        "coins_silver": new_silver,
        "coins_bronze": new_bronze,
    }


@app.post("/messages")
def create_message(
    payload: MessageIn,
    request: Request,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
    _csrf: None = Depends(require_csrf_header),
):
    costs = _get_costs(db)
    gold   = Decimal(str(user.coins_gold   or 0))
    silver = Decimal(str(user.coins_silver or 0))
    bronze = Decimal(str(user.coins_bronze or 0))

    # Prioridade: gold (mais barato) → silver → bronze
    if gold >= costs["gold"]:
        coin_type_used = "gold"
        updates = {"coins_gold": gold - costs["gold"]}
        cost_used = costs["gold"]
    elif silver >= costs["silver"]:
        coin_type_used = "silver"
        updates = {"coins_silver": silver - costs["silver"]}
        cost_used = costs["silver"]
    elif bronze >= costs["bronze"]:
        coin_type_used = "bronze"
        updates = {"coins_bronze": bronze - costs["bronze"]}
        cost_used = costs["bronze"]
    else:
        raise HTTPException(status_code=402, detail="Saldo insuficiente de moedas.")

    s = (
        db.query(ChatSession)
        .filter(ChatSession.id == payload.cid, ChatSession.user_id == user.id)
        .first()
    )
    if not s:
        raise HTTPException(status_code=404, detail="Sessão não encontrada.")

    # Bloqueia mensagens de usuário em módulos fixos
    if s.module and s.module.module_type == "fixed":
        raise HTTPException(
            status_code=403,
            detail="Este módulo não permite envio de mensagens pelo usuário.",
        )

    db.query(User).filter(User.id == user.id).update(updates)
    db.add(Message(session_id=s.id, role="user", content=payload.q or "",
                   coin_value=cost_used, coin_type=coin_type_used))
    db.add(CoinTransaction(
        user_id=user.id,
        amount=cost_used,
        type="message_debit",
        coin_type=coin_type_used,
        description=f"Débito por mensagem — sessão {s.id[:8]}",
    ))
    s.updated_at = _now()
    db.commit()

    return {
        "status": "ok", "cid": s.id,
        "coin_type_used": coin_type_used,
        "coins_gold":   float(gold   - costs["gold"]   if coin_type_used == "gold"   else gold),
        "coins_silver": float(silver - costs["silver"] if coin_type_used == "silver" else silver),
        "coins_bronze": float(bronze - costs["bronze"] if coin_type_used == "bronze" else bronze),
    }


# ---------------------------------------------------------------------------
# Stream (SSE)
# ---------------------------------------------------------------------------

@app.get("/stream")
async def stream(
    request: Request,
    cid: str = Query(..., description="ID da conversa"),
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    s = (
        db.query(ChatSession)
        .filter(ChatSession.id == cid, ChatSession.user_id == user.id)
        .first()
    )
    if not s:
        raise HTTPException(status_code=404, detail="Sessão não encontrada.")

    # Resolve system prompt: step_system_prompt do passo ativo > módulo > default
    system_prompt = DEFAULT_SYSTEM
    if s.module and s.module.system_prompt:
        system_prompt = s.module.system_prompt
    if s.flow_step and s.flow_step > 0 and s.module_id:
        active_step = (
            db.query(ModuleFlowStep)
            .filter(
                ModuleFlowStep.module_id == s.module_id,
                ModuleFlowStep.step_order == s.flow_step,
            )
            .first()
        )
        if active_step and active_step.step_system_prompt:
            system_prompt = active_step.step_system_prompt

    # Injeta vidas persistidas no system prompt conforme o tipo do módulo
    mod_life_cat = s.module.life_category if s.module else None
    lives_ctx = _build_lives_context(user.id, s.child_id, db, module_life_category=mod_life_cat)
    if lives_ctx:
        system_prompt = system_prompt + lives_ctx

    # Regras de formatação obrigatórias — aplicadas a todos os módulos
    system_prompt += (
        "\n\n---\nREGRAS DE FORMATAÇÃO (invioláveis):\n"
        "- NUNCA inclua colchetes, notas internas, comentários de planejamento, "
        "marcações de rascunho ou instruções meta na resposta. "
        "Sua resposta é exibida diretamente ao usuário final.\n"
        "- NUNCA mencione contagem de palavras, caracteres ou parágrafos "
        "(ex.: '(204 palavras)', '[expandir depois]', '[~200 words]'). "
        "Escreva o conteúdo completo e final sem nenhuma anotação desse tipo."
    )

    msgs: List[Any] = [SystemMessage(content=system_prompt)]

    s = (
        db.query(ChatSession)
        .filter(ChatSession.id == cid, ChatSession.user_id == user.id)
        .first()
    )
    for m in s.messages:
        if m.role == "user":
            msgs.append(HumanMessage(content=m.content))
        elif m.role == "assistant":
            msgs.append(AIMessage(content=m.content))

    try:
        chat = ChatXAI(model=DEFAULT_MODEL, temperature=0.4)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    from typing import Optional as _Optional
    queue: asyncio.Queue[_Optional[str]] = asyncio.Queue()
    loop = asyncio.get_running_loop()

    def producer():
        try:
            for chunk in chat.stream(msgs):
                text = getattr(chunk, "content", "") or ""
                if text:
                    asyncio.run_coroutine_threadsafe(queue.put(text), loop)
        except Exception as exc:
            asyncio.run_coroutine_threadsafe(queue.put(f"__ERR__:{exc}"), loop)
        finally:
            asyncio.run_coroutine_threadsafe(queue.put(None), loop)

    loop.run_in_executor(None, producer)
    assistant_acc: List[str] = []

    async def event_generator() -> AsyncIterator[str]:
        nonlocal assistant_acc
        try:
            while True:
                if await request.is_disconnected():
                    break
                item = await queue.get()
                if item is None:
                    final_text = "".join(assistant_acc).strip()
                    if final_text:
                        db.add(Message(session_id=cid, role="assistant", content=final_text))
                        s2 = (
                            db.query(ChatSession)
                            .filter(ChatSession.id == cid, ChatSession.user_id == user.id)
                            .first()
                        )
                        if s2:
                            if not s2.title or s2.title in ("Nova conversa", "Conversa"):
                                first_line = final_text.strip().split("\n", 1)[0]
                                s2.title = (first_line[:48] + "…") if len(first_line) > 48 else (first_line or "Conversa")
                            s2.updated_at = _now()
                            db.commit()

                    yield {"event": "done", "data": '{"finish_reason":"stop"}'}
                    break
                if item.startswith("__ERR__:"):
                    yield {"event": "error", "data": '{"error":"stream error"}'}
                    continue
                assistant_acc.append(item)
                yield {"event": "token", "data": item}
        except Exception as e:
            yield {"event": "error", "data": json.dumps({"error": str(e)})}

    return EventSourceResponse(event_generator(), ping=15)


@app.get("/healthz")
async def healthz():
    return {"status": "ok", "model": DEFAULT_MODEL}


if os.getenv("SERVE_FRONTEND", "false").lower() == "true" and FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets"), html=False), name="assets")

    @app.get("/")
    async def index_root():
        return FileResponse(FRONTEND_DIST / "index.html")

    @app.get("/{full_path:path}")
    async def spa_catch_all(full_path: str):
        if full_path.startswith(("auth/", "sessions", "messages", "stream", "healthz", "modules")):
            raise HTTPException(status_code=404, detail="Not Found")
        return FileResponse(FRONTEND_DIST / "index.html")
