"""Add user_lives table for persisting Gaia and Future lives per user/child

Revision ID: 0006_add_user_lives
Revises: 0005_add_step_system_prompt
Create Date: 2026-04-07
"""
from alembic import op
import sqlalchemy as sa

revision = '0006_add_user_lives'
down_revision = '0005_add_step_system_prompt'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'user_lives',
        sa.Column('id',            sa.Integer(),    primary_key=True, autoincrement=True),
        sa.Column('user_id',       sa.Integer(),    sa.ForeignKey('users.id',    ondelete='CASCADE'), nullable=False),
        sa.Column('child_id',      sa.Integer(),    sa.ForeignKey('children.id', ondelete='CASCADE'), nullable=True),
        sa.Column('life_category', sa.String(20),   nullable=False),
        sa.Column('life_order',    sa.Integer(),    nullable=False),
        sa.Column('life_name',     sa.String(300),  nullable=False),
        sa.Column('life_era',      sa.String(300),  nullable=True),
        sa.Column('life_location', sa.String(300),  nullable=True),
        sa.Column('life_brief',    sa.String(500),  nullable=True),
        sa.Column('life_detail',   sa.Text(),       nullable=True),
        sa.Column('created_at',    sa.DateTime(),   nullable=False),
        sa.UniqueConstraint('user_id', 'child_id', 'life_category', 'life_order',
                            name='uq_user_life_order'),
    )
    op.create_index('idx_user_lives_user', 'user_lives', ['user_id'])


def downgrade():
    op.drop_index('idx_user_lives_user', table_name='user_lives')
    op.drop_table('user_lives')
