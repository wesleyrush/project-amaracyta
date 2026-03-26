"""Add step_system_prompt to module_flow_steps

Revision ID: 0005_add_step_system_prompt
Revises: 0004_add_flow_steps
Create Date: 2026-03-23
"""
from alembic import op
import sqlalchemy as sa

revision = '0005_add_step_system_prompt'
down_revision = '0004_add_flow_steps'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'module_flow_steps',
        sa.Column('step_system_prompt', sa.Text(), nullable=True),
    )


def downgrade():
    op.drop_column('module_flow_steps', 'step_system_prompt')
