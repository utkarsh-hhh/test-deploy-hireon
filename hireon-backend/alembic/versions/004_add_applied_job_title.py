"""add applied_job_title to candidates

Revision ID: 004_add_applied_job_title
Revises: 003_add_hr_notes
Create Date: 2026-03-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '004_add_applied_job_title'
down_revision: Union[str, None] = '003_add_hr_notes'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('candidates', sa.Column('applied_job_title', sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column('candidates', 'applied_job_title')
