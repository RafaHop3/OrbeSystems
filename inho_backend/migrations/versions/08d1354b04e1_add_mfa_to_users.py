"""add_mfa_to_users

Revision ID: 08d1354b04e1
Revises: 07c1354b04e0
Create Date: 2026-08-29 11:58:31.582068

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '08d1354b04e1'
down_revision: Union[str, None] = '07c1354b04e0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add MFA and backup_codes columns to the users table
    op.add_column('users', sa.Column('otp_secret', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('is_mfa_enabled', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('users', sa.Column('backup_codes', sa.Text(), nullable=True))


def downgrade() -> None:
    # Drop the columns
    op.drop_column('users', 'backup_codes')
    op.drop_column('users', 'is_mfa_enabled')
    op.drop_column('users', 'otp_secret')
