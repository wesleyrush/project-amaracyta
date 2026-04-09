"""
Aplica manualmente as migrations 0006 e 0007 sem depender do Alembic.
  0006 – Cria tabela user_lives
  0007 – Adiciona coluna life_category em modules
"""
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

from db import engine
from sqlalchemy import text

def table_exists(conn, table_name: str) -> bool:
    result = conn.execute(text(
        "SELECT COUNT(*) FROM information_schema.TABLES "
        "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :tbl"
    ), {"tbl": table_name})
    return bool(result.scalar())


def column_exists(conn, table_name: str, column_name: str) -> bool:
    result = conn.execute(text(
        "SELECT COUNT(*) FROM information_schema.COLUMNS "
        "WHERE TABLE_SCHEMA = DATABASE() "
        "  AND TABLE_NAME = :tbl AND COLUMN_NAME = :col"
    ), {"tbl": table_name, "col": column_name})
    return bool(result.scalar())


with engine.connect() as conn:
    # ── 0006: criar user_lives ──────────────────────────────────────────────
    if table_exists(conn, "user_lives"):
        print("[skip] tabela user_lives já existe")
    else:
        conn.execute(text("""
            CREATE TABLE user_lives (
                id            INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
                user_id       INT          NOT NULL,
                child_id      INT          NULL,
                life_category VARCHAR(20)  NOT NULL,
                life_order    INT          NOT NULL,
                life_name     VARCHAR(300) NOT NULL,
                life_era      VARCHAR(300) NULL,
                life_location VARCHAR(300) NULL,
                life_brief    VARCHAR(500) NULL,
                life_detail   TEXT         NULL,
                created_at    DATETIME     NOT NULL,
                CONSTRAINT uq_user_life_order
                    UNIQUE (user_id, child_id, life_category, life_order),
                CONSTRAINT fk_ul_user
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                CONSTRAINT fk_ul_child
                    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """))
        conn.execute(text(
            "CREATE INDEX idx_user_lives_user ON user_lives (user_id)"
        ))
        conn.commit()
        print("[ok]   tabela user_lives criada")

    # ── 0007: adicionar life_category em modules ────────────────────────────
    if column_exists(conn, "modules", "life_category"):
        print("[skip] modules.life_category já existe")
    else:
        conn.execute(text(
            "ALTER TABLE `modules` ADD COLUMN `life_category` VARCHAR(20) NULL"
        ))
        conn.commit()
        print("[ok]   modules.life_category adicionado")

print("\nMigrações 0006 e 0007 concluídas.")
