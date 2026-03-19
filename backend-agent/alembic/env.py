from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
import os, sys
from pathlib import Path
from dotenv import load_dotenv

# this is the Alembic Config object, which provides access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Add project path
BASE_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(BASE_DIR))

# Carrega o .env antes de importar db (que exige DATABASE_URL)
# Suporta .env.dev para desenvolvimento local
env_file = BASE_DIR / ".env.dev"
if not env_file.exists():
    env_file = BASE_DIR / ".env"
load_dotenv(dotenv_path=env_file, override=False)

from db import Base
from models import User, Module, ChatSession, Message  # todos os modelos para metadata completa

target_metadata = Base.metadata

# take DATABASE_URL from env
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL:
    config.set_main_option("sqlalchemy.url", DATABASE_URL)


def run_migrations_offline():
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix='sqlalchemy.',
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
