"""alter_account_balance_to_numeric

Revision ID: 0002_balance_numeric
Revises: 0001_initial
Create Date: 2026-05-18

Migra balance de VARCHAR(50) para NUMERIC(20,8).
Conversão segura: CAST preserva valores existentes como '0.00' -> 0.00000000
"""
from alembic import op
import sqlalchemy as sa


revision = "0002_balance_numeric"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Altera o tipo da coluna com conversão explícita
    op.alter_column(
        "accounts",
        "balance",
        existing_type=sa.String(50),
        type_=sa.Numeric(precision=20, scale=8),
        existing_nullable=False,
        postgresql_using="balance::numeric",   # cast seguro no PostgreSQL
    )

    # Remove índice duplicado gerado pelo index=True no Column timestamp
    op.drop_index("ix_audit_logs_timestamp", table_name="audit_logs", if_exists=True)


def downgrade() -> None:
    # Reverte para String (perde precisão — apenas para rollback de emergência)
    op.alter_column(
        "accounts",
        "balance",
        existing_type=sa.Numeric(precision=20, scale=8),
        type_=sa.String(50),
        existing_nullable=False,
        postgresql_using="balance::text",
    )
