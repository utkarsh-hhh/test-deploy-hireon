"""add hr_notes to candidates

Revision ID: 003_add_hr_notes
Revises: 002_add_is_confirmed
Create Date: 2026-03-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '003_add_hr_notes'
down_revision: Union[str, None] = '002_add_is_confirmed'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('candidates', sa.Column('hr_notes', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('candidates', 'hr_notes')
