"""
Aplica manualmente a migration 0005 sem depender do Alembic.
Adiciona step_system_prompt em module_flow_steps caso não exista.
"""
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

from db import engine
from sqlalchemy import text

COLUMNS = [
    ("module_flow_steps", "step_system_prompt", "TEXT NULL"),
]

with engine.connect() as conn:
    for table, col, definition in COLUMNS:
        result = conn.execute(text(
            "SELECT COUNT(*) FROM information_schema.COLUMNS "
            "WHERE TABLE_SCHEMA = DATABASE() "
            "  AND TABLE_NAME = :tbl "
            "  AND COLUMN_NAME = :col"
        ), {"tbl": table, "col": col})
        exists = result.scalar()
        if exists:
            print(f"  [skip] {table}.{col} já existe")
        else:
            conn.execute(text(f"ALTER TABLE `{table}` ADD COLUMN `{col}` {definition}"))
            conn.commit()
            print(f"  [ok]   {table}.{col} adicionado")

print("\nMigração concluída.")
