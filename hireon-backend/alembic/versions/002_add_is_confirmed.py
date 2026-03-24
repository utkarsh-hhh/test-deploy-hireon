"""add is_confirmed to interview

Revision ID: 002_add_is_confirmed
Revises: 001_initial
Create Date: 2026-03-17

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '002_add_is_confirmed'
down_revision: Union[str, None] = '001_initial'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add is_confirmed column with a default value of False
    op.add_column('interviews', sa.Column('is_confirmed', sa.Boolean(), server_default='false', nullable=False))


def downgrade() -> None:
    op.drop_column('interviews', 'is_confirmed')
