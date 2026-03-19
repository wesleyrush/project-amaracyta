"""
Aplica manualmente a migration 0003 sem depender do Alembic.
Adiciona colunas novas em modules e users caso ainda não existam.
"""
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

from db import engine
from sqlalchemy import text

COLUMNS = [
    ("modules", "opening_prompt",     "TEXT NULL"),
    ("modules", "few_shot",           "TEXT NULL"),
    ("modules", "welcome_message",    "TEXT NULL"),
    ("modules", "use_opening_prompt", "TINYINT(1) NOT NULL DEFAULT 0"),
    ("users",   "is_admin",           "TINYINT(1) NOT NULL DEFAULT 0"),
]

with engine.connect() as conn:
    for table, col, definition in COLUMNS:
        # Verifica se a coluna já existe (information_schema)
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
