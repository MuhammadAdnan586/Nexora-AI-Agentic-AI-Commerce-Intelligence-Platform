"""add warehouse_id to order_messages

Revision ID: b99994732d80
Revises: c50d20f2653f
Create Date: 2026-08-19 12:56:14.839990

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b99994732d80'
down_revision: Union[str, Sequence[str], None] = 'c50d20f2653f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('order_messages', sa.Column('warehouse_id', sa.Integer(), nullable=True))
    op.create_foreign_key(None, 'order_messages', 'warehouses', ['warehouse_id'], ['id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(None, 'order_messages', type_='foreignkey')
    op.drop_column('order_messages', 'warehouse_id')