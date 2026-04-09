"""Add life_category to modules table

Revision ID: 0007_add_module_life_category
Revises: 0006_add_user_lives
Create Date: 2026-04-07
"""
from alembic import op
import sqlalchemy as sa

revision = '0007_add_module_life_category'
down_revision = '0006_add_user_lives'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'modules',
        sa.Column('life_category', sa.String(20), nullable=True),
    )


def downgrade():
    op.drop_column('modules', 'life_category')
