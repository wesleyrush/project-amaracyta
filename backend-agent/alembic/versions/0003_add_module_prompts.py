"""add opening_prompt, few_shot, welcome_message, use_opening_prompt to modules; add is_admin to users

Revision ID: 0003_add_module_prompts
Revises: 0002_add_user_fields
Create Date: 2026-03-07 00:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = '0003_add_module_prompts'
down_revision = '0002_add_user_fields'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('modules', sa.Column('opening_prompt', sa.Text(), nullable=True))
    op.add_column('modules', sa.Column('few_shot', sa.Text(), nullable=True))
    op.add_column('modules', sa.Column('welcome_message', sa.Text(), nullable=True))
    op.add_column('modules', sa.Column('use_opening_prompt', sa.Boolean(), nullable=False, server_default='0'))
    op.add_column('users', sa.Column('is_admin', sa.Boolean(), nullable=False, server_default='0'))


def downgrade():
    op.drop_column('modules', 'use_opening_prompt')
    op.drop_column('modules', 'welcome_message')
    op.drop_column('modules', 'few_shot')
    op.drop_column('modules', 'opening_prompt')
    op.drop_column('users', 'is_admin')
