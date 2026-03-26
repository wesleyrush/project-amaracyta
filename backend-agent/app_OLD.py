
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
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List, AsyncIterator

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
    User, ChatSession, Message, Module, CoinProportion, CoinTransaction,
    CoinChest, CoinOrder, ModulePackage, UserModule, ModuleOrder, Child, SiteSettings,
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
# Modules
# ---------------------------------------------------------------------------

def _module_dict(m: Module) -> Dict[str, Any]:
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
        "price_brl": float(m.price_brl) if m.price_brl is not None else None,
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
    price_brl: Optional[float] = None


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
    is_active: Optional[bool] = None
    module_type: Optional[str] = None
    price_brl: Optional[float] = None


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
        price_brl=Decimal(str(payload.price_brl)) if payload.price_brl is not None else None,
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
    if payload.is_active is not None:
        m.is_active = payload.is_active
    if payload.module_type is not None:
        m.module_type = payload.module_type
    if payload.price_brl is not None:
        m.price_brl = Decimal(str(payload.price_brl))
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
        "quantity": p.quantity,
        "price_brl": float(p.price_brl),
        "description": p.description,
        "is_active": p.is_active,
    }


class PackageCreate(BaseModel):
    quantity: int
    price_brl: float
    description: Optional[str] = None
    is_active: bool = True


class PackageUpdate(BaseModel):
    quantity: Optional[int] = None
    price_brl: Optional[float] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


@app.get("/module-packages")
def list_module_packages(db: Session = Depends(get_db)):
    rows = db.query(ModulePackage).filter(ModulePackage.is_active == True).order_by(ModulePackage.quantity).all()
    return {"items": [_pkg_dict(p) for p in rows]}


@app.get("/admin/module-packages")
def admin_list_module_packages(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.query(ModulePackage).order_by(ModulePackage.quantity).all()
    return {"items": [_pkg_dict(p) for p in rows]}


@app.post("/admin/module-packages", status_code=201)
def admin_create_module_package(
    payload: PackageCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    _csrf: None = Depends(require_csrf_header),
):
    existing = db.query(ModulePackage).filter(ModulePackage.quantity == payload.quantity).first()
    if existing:
        raise HTTPException(status_code=409, detail="Já existe pacote para essa quantidade")
    p = ModulePackage(
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
    if payload.quantity is not None:
        conflict = db.query(ModulePackage).filter(
            ModulePackage.quantity == payload.quantity, ModulePackage.id != pid
        ).first()
        if conflict:
            raise HTTPException(status_code=409, detail="Já existe pacote para essa quantidade")
        p.quantity = payload.quantity
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
    if not rows:
        return {"items": []}
    module_ids = [r.module_id for r in rows]
    # Count active sessions per module for this user
    counts = dict(
        db.query(ChatSession.module_id, sa_func.count(ChatSession.id))
        .filter(ChatSession.user_id == user.id, ChatSession.module_id.in_(module_ids))
        .group_by(ChatSession.module_id)
        .all()
    )
    return {"items": [{
        "module_id": r.module_id,
        "quantity": r.quantity,
        "available_qty": max(0, r.quantity - counts.get(r.module_id, 0)),
        "purchased_at": r.purchased_at.isoformat(),
    } for r in rows]}


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

    # Find best package price based on total units
    pkg = db.query(ModulePackage).filter(
        ModulePackage.quantity == total_qty, ModulePackage.is_active == True
    ).first()

    if pkg:
        price = Decimal(str(pkg.price_brl))
    else:
        # Sum individual prices × quantity
        mod_map = {m.id: m for m in modules}
        price = sum(
            (mod_map[mid].price_brl or Decimal("0")) * qty
            for mid, qty in payload.module_quantities.items()
        )

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

def session_to_dict(s: ChatSession) -> Dict[str, Any]:
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
        "created_at": s.created_at.isoformat() if s.created_at else None,
        "updated_at": s.updated_at.isoformat() if s.updated_at else None,
        "messages": [
            {
                "role": m.role,
                "content": m.content,
                "ts": m.ts.isoformat() if m.ts else None
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
            ChatSession.user_id == user.id, ChatSession.module_id == module.id
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
    s.updated_at = datetime.now(timezone.utc)
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
        s.updated_at = datetime.now(timezone.utc)
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
    db.delete(s)
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
    s.updated_at = datetime.now(timezone.utc)
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

    # Resolve system prompt pelo módulo da sessão; fallback para DEFAULT_SYSTEM
    if s.module and s.module.system_prompt:
        system_prompt = s.module.system_prompt
    else:
        system_prompt = DEFAULT_SYSTEM

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
        chat = ChatXAI(model=DEFAULT_MODEL, temperature=0.2)
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
                            s2.updated_at = datetime.now(timezone.utc)
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
