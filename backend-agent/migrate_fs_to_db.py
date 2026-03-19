"""
Migra conversas do filesystem (data/users/<uid>/sessions/*.json) para MySQL.
Execute com o venv/requirements instalados e DATABASE_URL configurada no .env.

python migrate_fs_to_db.py
"""
from pathlib import Path
from datetime import datetime
import json

from sqlalchemy.orm import Session
from db import SessionLocal
from models import ChatSession, Message

ROOT = Path("data/users")  # estrutura: data/users/<uid>/sessions/*.json

def iso2dt(x):
    try:
        return datetime.fromisoformat(x.replace("Z",""))
    except Exception:
        return None

def main():
    db: Session = SessionLocal()
    count = 0
    for user_dir in ROOT.glob("*"):
        uid = user_dir.name
        sess_dir = user_dir / "sessions"
        if not sess_dir.exists():
            continue
        for fp in sess_dir.glob("*.json"):
            js = json.loads(fp.read_text(encoding="utf-8"))
            cid = js.get("id")
            if not cid:
                continue
            s = db.query(ChatSession).filter(ChatSession.id==cid).first()
            if not s:
                s = ChatSession(
                    id=cid,
                    user_id=int(uid),
                    title=js.get("title") or "Conversa",
                    created_at=iso2dt(js.get("created_at")) or datetime.utcnow(),
                    updated_at=iso2dt(js.get("updated_at")) or datetime.utcnow(),
                )
                db.add(s)
                db.commit()
            for m in (js.get("messages") or []):
                db.add(Message(
                    session_id=cid,
                    role=m.get("role","user"),
                    content=m.get("content",""),
                    ts=iso2dt(m.get("ts")) or datetime.utcnow(),
                ))
            db.commit()
            count += 1
    print("Importadas sessões:", count)

if __name__ == "__main__":
    main()
