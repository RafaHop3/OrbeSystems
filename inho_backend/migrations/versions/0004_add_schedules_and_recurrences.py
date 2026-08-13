"""add_schedules

Revision ID: 0004_add_schedules
Revises: 0003_add_transaction_model
Create Date: 2026-05-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0004_add_schedules'
down_revision: Union[str, None] = '0003_add_transaction_model'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Handle existing tables
    op.execute("DROP TABLE IF EXISTS scheduled_transactions CASCADE")
    op.execute("DROP TABLE IF EXISTS recurring_transactions CASCADE")
    
    # Handle Enums if they exist
    op.execute("DROP TYPE IF EXISTS recordtype CASCADE")
    op.execute("DROP TYPE IF EXISTS recordstatus CASCADE")
    op.execute("DROP TYPE IF EXISTS frequency CASCADE")

    # Create RecurringTransaction first because ScheduledTransaction references it
    op.create_table('recurring_transactions',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('account_id', sa.UUID(), nullable=False),
    sa.Column('record_type', sa.Enum('PAYABLE', 'RECEIVABLE', name='recordtype'), nullable=False),
    sa.Column('amount', sa.Numeric(precision=20, scale=8), nullable=False),
    sa.Column('description', sa.String(length=255), nullable=False),
    sa.Column('contact_name', sa.String(length=255), nullable=True),
    sa.Column('category', sa.String(length=100), nullable=True),
    sa.Column('frequency', sa.Enum('MONTHLY', 'WEEKLY', 'YEARLY', 'DAILY', name='frequency'), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('next_due_date', sa.DateTime(timezone=True), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['account_id'], ['accounts.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_recurring_account_active', 'recurring_transactions', ['account_id', 'is_active'], unique=False)

    op.create_table('scheduled_transactions',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('account_id', sa.UUID(), nullable=False),
    sa.Column('record_type', postgresql.ENUM('PAYABLE', 'RECEIVABLE', name='recordtype', create_type=False), nullable=False),
    sa.Column('amount', sa.Numeric(precision=20, scale=8), nullable=False),
    sa.Column('description', sa.String(length=255), nullable=False),
    sa.Column('contact_name', sa.String(length=255), nullable=True),
    sa.Column('category', sa.String(length=100), nullable=True),
    sa.Column('due_date', sa.DateTime(timezone=True), nullable=False),
    sa.Column('status', sa.Enum('OPEN', 'PAID', 'OVERDUE', 'CANCELLED', name='recordstatus'), nullable=False),
    sa.Column('recurring_id', sa.UUID(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['account_id'], ['accounts.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['recurring_id'], ['recurring_transactions.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_scheduled_account_type', 'scheduled_transactions', ['account_id', 'record_type'], unique=False)
    op.create_index('ix_scheduled_status_due', 'scheduled_transactions', ['status', 'due_date'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_scheduled_status_due', table_name='scheduled_transactions')
    op.drop_index('ix_scheduled_account_type', table_name='scheduled_transactions')
    op.drop_table('scheduled_transactions')
    
    op.drop_index('ix_recurring_account_active', table_name='recurring_transactions')
    op.drop_table('recurring_transactions')
    
    op.execute("DROP TYPE IF EXISTS recordtype CASCADE")
    op.execute("DROP TYPE IF EXISTS recordstatus CASCADE")
    op.execute("DROP TYPE IF EXISTS frequency CASCADE")
