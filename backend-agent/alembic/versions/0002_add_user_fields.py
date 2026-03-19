"""add full_name, birth_date to users

Revision ID: 0002_add_user_fields
Revises: 0001_init_chat
Create Date: 2026-02-13 10:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = '0002_add_user_fields'
down_revision = '0001_init_chat'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('users', sa.Column('full_name', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('birth_date', sa.Date(), nullable=True))

def downgrade():
    op.drop_column('users', 'birth_date')
    op.drop_column('users', 'full_name')
