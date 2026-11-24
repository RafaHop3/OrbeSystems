"""add_registration_fields_and_multiplicity

Revision ID: 0b2c4d8e3f1a
Revises: 0a1f3b7c2d9e
Create Date: 2026-11-24 07:05:00.000000
"""
from typing import Sequence, Union
from alembic import op


revision: str = "0b2c4d8e3f1a"
down_revision: Union[str, Sequence[str], None] = "0a1f3b7c2d9e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_DDL_UPGRADE = [
    "ALTER TABLE inho.crm_contacts ADD COLUMN IF NOT EXISTS birth_date VARCHAR(20)",
    "ALTER TABLE inho.crm_contacts ADD COLUMN IF NOT EXISTS filiation VARCHAR(255)",
    "ALTER TABLE inho.crm_contacts ADD COLUMN IF NOT EXISTS mother_name VARCHAR(255)",
    "ALTER TABLE inho.crm_contacts ADD COLUMN IF NOT EXISTS father_name VARCHAR(255)",
    "ALTER TABLE inho.crm_contacts ADD COLUMN IF NOT EXISTS bank_code VARCHAR(20)",
    "ALTER TABLE inho.crm_contacts ADD COLUMN IF NOT EXISTS bank_name VARCHAR(120)",
    "ALTER TABLE inho.crm_contacts ADD COLUMN IF NOT EXISTS bank_agency VARCHAR(20)",
    "ALTER TABLE inho.crm_contacts ADD COLUMN IF NOT EXISTS bank_account VARCHAR(30)",
    "ALTER TABLE inho.crm_contacts ADD COLUMN IF NOT EXISTS bank_account_type VARCHAR(40)",
    "ALTER TABLE inho.crm_contacts ADD COLUMN IF NOT EXISTS pix_key_type VARCHAR(20)",
    "ALTER TABLE inho.crm_contacts ADD COLUMN IF NOT EXISTS pix_key VARCHAR(150)",
    "ALTER TABLE inho.crm_contacts ADD COLUMN IF NOT EXISTS phones_json TEXT DEFAULT '[]'",
    "ALTER TABLE inho.crm_contacts ADD COLUMN IF NOT EXISTS emails_json TEXT DEFAULT '[]'",
    "ALTER TABLE inho.crm_contacts ADD COLUMN IF NOT EXISTS bank_accounts_json TEXT DEFAULT '[]'",
    "ALTER TABLE inho.cooperados ADD COLUMN IF NOT EXISTS birth_date VARCHAR(20)",
    "ALTER TABLE inho.cooperados ADD COLUMN IF NOT EXISTS filiation VARCHAR(255)",
    "ALTER TABLE inho.cooperados ADD COLUMN IF NOT EXISTS mother_name VARCHAR(255)",
    "ALTER TABLE inho.cooperados ADD COLUMN IF NOT EXISTS father_name VARCHAR(255)",
    "ALTER TABLE inho.cooperados ADD COLUMN IF NOT EXISTS bank_code VARCHAR(20)",
    "ALTER TABLE inho.cooperados ADD COLUMN IF NOT EXISTS bank_name VARCHAR(120)",
    "ALTER TABLE inho.cooperados ADD COLUMN IF NOT EXISTS bank_agency VARCHAR(20)",
    "ALTER TABLE inho.cooperados ADD COLUMN IF NOT EXISTS bank_account VARCHAR(30)",
    "ALTER TABLE inho.cooperados ADD COLUMN IF NOT EXISTS bank_account_type VARCHAR(40)",
    "ALTER TABLE inho.cooperados ADD COLUMN IF NOT EXISTS pix_key_type VARCHAR(20)",
    "ALTER TABLE inho.cooperados ADD COLUMN IF NOT EXISTS pix_key VARCHAR(150)",
    "ALTER TABLE inho.cooperados ADD COLUMN IF NOT EXISTS phones_json TEXT DEFAULT '[]'",
    "ALTER TABLE inho.cooperados ADD COLUMN IF NOT EXISTS emails_json TEXT DEFAULT '[]'",
    "ALTER TABLE inho.cooperados ADD COLUMN IF NOT EXISTS bank_accounts_json TEXT DEFAULT '[]'",
]


def upgrade() -> None:
    for stmt in _DDL_UPGRADE:
        op.execute(stmt)


def downgrade() -> None:
    for tbl in ("crm_contacts", "cooperados"):
        for col in (
            "birth_date",
            "filiation",
            "mother_name",
            "father_name",
            "bank_name",
            "bank_account_type",
            "phones_json",
            "emails_json",
            "bank_accounts_json",
        ):
            op.execute(f"ALTER TABLE inho.{tbl} DROP COLUMN IF EXISTS {col}")
