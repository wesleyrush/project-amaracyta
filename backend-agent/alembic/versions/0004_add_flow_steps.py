"""Add module_flow_steps, flow_step on sessions, hidden on messages

Revision ID: 0004_add_flow_steps
Revises: 0003_add_module_prompts
Create Date: 2026-03-21
"""
from alembic import op
import sqlalchemy as sa

revision = '0004_add_flow_steps'
down_revision = '0003_add_module_prompts'
branch_labels = None
depends_on = None


def upgrade():
    # 1. module_flow_steps
    op.create_table(
        'module_flow_steps',
        sa.Column('id',          sa.Integer(),    primary_key=True, autoincrement=True),
        sa.Column('module_id',   sa.Integer(),    sa.ForeignKey('modules.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('step_order',  sa.Integer(),    nullable=False),
        sa.Column('label',       sa.String(200),  nullable=True),
        sa.Column('button_label',sa.String(200),  nullable=True),
        sa.Column('prompt_template',    sa.Text(), nullable=True),
        sa.Column('include_user_profile', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('is_hidden',   sa.Boolean(),    nullable=False, server_default=sa.true()),
        sa.Column('created_at',  sa.DateTime(),   nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at',  sa.DateTime(),   nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('module_id', 'step_order', name='uq_module_flow_step'),
    )

    # 2. sessions.flow_step
    op.add_column('sessions', sa.Column('flow_step', sa.Integer(), nullable=False, server_default='0'))

    # 3. messages.hidden
    op.add_column('messages', sa.Column('hidden', sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade():
    op.drop_column('messages', 'hidden')
    op.drop_column('sessions', 'flow_step')
    op.drop_table('module_flow_steps')
