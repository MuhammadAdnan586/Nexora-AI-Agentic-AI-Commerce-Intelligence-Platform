"""add compare_at_price to products

Revision ID: 079c652ff42c
Revises: 01465de5f121
Create Date: 2026-09-13 09:28:53.451087

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "079c652ff42c"
down_revision: Union[str, Sequence[str], None] = "01465de5f121"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("products", sa.Column("compare_at_price", sa.Float(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("products", "compare_at_price")