"""init sessions/messages tables

Revision ID: 0001_init_chat
Revises: 
Create Date: 2026-02-12 23:59:00
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0001_init_chat'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'sessions',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('user_id', sa.Integer(), nullable=False, index=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )
    op.create_index('idx_sessions_user_updated', 'sessions', ['user_id', 'updated_at'])

    op.create_table(
        'messages',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('session_id', sa.String(length=64), nullable=False, index=True),
        sa.Column('role', sa.Enum('user','assistant','system', name='message_role'), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('ts', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['session_id'], ['sessions.id'], ondelete='CASCADE'),
    )
    op.create_index('idx_messages_session_ts', 'messages', ['session_id', 'ts'])


def downgrade():
    op.drop_index('idx_messages_session_ts', table_name='messages')
    op.drop_table('messages')
    op.drop_index('idx_sessions_user_updated', table_name='sessions')
    op.drop_table('sessions')
    op.execute('DROP TYPE IF EXISTS message_role')
