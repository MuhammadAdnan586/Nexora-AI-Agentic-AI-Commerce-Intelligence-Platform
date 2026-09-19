"""add reset password fields to users

Revision ID: a1b2c3d4e5f6
Revises: 079c652ff42c
Create Date: 2026-09-17 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '079c652ff42c'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('reset_token', sa.String(), nullable=True))
    op.create_index(op.f('ix_users_reset_token'), 'users', ['reset_token'], unique=False)
    op.add_column('users', sa.Column('reset_token_expires', sa.DateTime(timezone=True), nullable=True))


def downgrade():
    op.drop_index(op.f('ix_users_reset_token'), table_name='users')
    op.drop_column('users', 'reset_token_expires')
    op.drop_column('users', 'reset_token')