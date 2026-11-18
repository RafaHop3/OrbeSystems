"""add_ai_policy_and_turismo_tables

Revision ID: 0a1f3b7c2d9e
Revises: 09e2465c15f2
Create Date: 2026-11-18 20:00:00.000000
"""
from typing import Sequence, Union
from alembic import op


revision: str = "0a1f3b7c2d9e"
down_revision: Union[str, Sequence[str], None] = "09e2465c15f2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_enum e
                JOIN pg_type t ON e.enumtypid = t.oid
                WHERE t.typname = 'businesscategory' AND e.enumlabel = 'TURISMO'
            ) THEN
                ALTER TYPE public.businesscategory ADD VALUE 'TURISMO';
            END IF;
        EXCEPTION WHEN undefined_object THEN
            NULL;
        END $$;
        """
    )
    op.execute(
        "CREATE TABLE IF NOT EXISTS inho.tenant_ai_policies ("
        "id UUID PRIMARY KEY, business_id UUID NOT NULL UNIQUE REFERENCES inho.businesses(id) ON DELETE CASCADE, "
        "status VARCHAR(40) NOT NULL DEFAULT 'DRAFT', draft_rules_json TEXT NOT NULL DEFAULT '{}', "
        "approved_rules_json TEXT NOT NULL DEFAULT '{}', source_excerpts_json TEXT NOT NULL DEFAULT '[]', "
        "has_conflict BOOLEAN NOT NULL DEFAULT FALSE, conflict_notes TEXT, "
        "approved_by_id VARCHAR(36) REFERENCES public.users(id) ON DELETE SET NULL, "
        "approved_by_name VARCHAR(255), approved_at TIMESTAMPTZ, "
        "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())"
    )
    op.execute(
        "CREATE TABLE IF NOT EXISTS inho.turismo_quotes ("
        "id UUID PRIMARY KEY, business_id UUID NOT NULL REFERENCES inho.businesses(id) ON DELETE CASCADE, "
        "contact_id UUID REFERENCES inho.crm_contacts(id) ON DELETE SET NULL, "
        "proposal_slug VARCHAR(80) NOT NULL UNIQUE, client_name VARCHAR(200) NOT NULL, "
        "origin VARCHAR(20) NOT NULL, destination VARCHAR(20) NOT NULL, "
        "departure_date VARCHAR(30), return_date VARCHAR(30), passengers INTEGER NOT NULL DEFAULT 1, "
        "airline_program VARCHAR(60) NOT NULL DEFAULT 'SMILES', "
        "cash_price_brl NUMERIC(15,2) NOT NULL DEFAULT 0, miles_required INTEGER NOT NULL DEFAULT 0, "
        "mile_cost_per_k_brl NUMERIC(10,2) NOT NULL DEFAULT 17.5, tax_fees_brl NUMERIC(15,2) NOT NULL DEFAULT 0, "
        "total_miles_cost_brl NUMERIC(15,2) NOT NULL DEFAULT 0, recommended_mode VARCHAR(20) NOT NULL DEFAULT 'MILES', "
        "savings_brl NUMERIC(15,2) NOT NULL DEFAULT 0, options_json TEXT NOT NULL DEFAULT '[]', "
        "selected_option VARCHAR(10), pnr_locator VARCHAR(30), pnr_raw_text TEXT, "
        "is_public_offer BOOLEAN NOT NULL DEFAULT FALSE, status VARCHAR(30) NOT NULL DEFAULT 'DRAFT', "
        "approved_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())"
    )
    op.execute(
        "CREATE TABLE IF NOT EXISTS inho.turismo_miles_accounts ("
        "id UUID PRIMARY KEY, business_id UUID NOT NULL REFERENCES inho.businesses(id) ON DELETE CASCADE, "
        "program_name VARCHAR(60) NOT NULL, holder_name VARCHAR(200) NOT NULL, "
        "holder_document_masked VARCHAR(40) NOT NULL, miles_balance INTEGER NOT NULL DEFAULT 0, "
        "cpfs_used_year INTEGER NOT NULL DEFAULT 0, cpfs_limit_year INTEGER NOT NULL DEFAULT 25, "
        "semaphore_status VARCHAR(20) NOT NULL DEFAULT 'GREEN', notes TEXT, "
        "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())"
    )
    op.execute(
        "CREATE TABLE IF NOT EXISTS inho.turismo_bookings ("
        "id UUID PRIMARY KEY, business_id UUID NOT NULL REFERENCES inho.businesses(id) ON DELETE CASCADE, "
        "quote_id UUID REFERENCES inho.turismo_quotes(id) ON DELETE SET NULL, "
        "contact_id UUID REFERENCES inho.crm_contacts(id) ON DELETE SET NULL, "
        "pnr_locator VARCHAR(30) NOT NULL, passenger_name VARCHAR(200) NOT NULL, "
        "origin VARCHAR(20) NOT NULL, destination VARCHAR(20) NOT NULL, "
        "departure_at TIMESTAMPTZ NOT NULL, return_at TIMESTAMPTZ, "
        "sale_amount_brl NUMERIC(15,2) NOT NULL DEFAULT 0, supplier_cost_brl NUMERIC(15,2) NOT NULL DEFAULT 0, "
        "agency_fee_brl NUMERIC(15,2) NOT NULL DEFAULT 0, iss_rate_pct NUMERIC(5,2) NOT NULL DEFAULT 5.0, "
        "iss_tax_brl NUMERIC(15,2) NOT NULL DEFAULT 0, net_profit_brl NUMERIC(15,2) NOT NULL DEFAULT 0, "
        "status VARCHAR(30) NOT NULL DEFAULT 'CONFIRMED', "
        "boarding_d7_sent BOOLEAN NOT NULL DEFAULT FALSE, boarding_d2_sent BOOLEAN NOT NULL DEFAULT FALSE, "
        "boarding_d0_sent BOOLEAN NOT NULL DEFAULT FALSE, boarding_d2_post_sent BOOLEAN NOT NULL DEFAULT FALSE, "
        "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())"
    )
    op.execute(
        "CREATE TABLE IF NOT EXISTS inho.turismo_groups ("
        "id UUID PRIMARY KEY, business_id UUID NOT NULL REFERENCES inho.businesses(id) ON DELETE CASCADE, "
        "group_name VARCHAR(200) NOT NULL, destination VARCHAR(120) NOT NULL, "
        "departure_date VARCHAR(30), return_date VARCHAR(30), max_members INTEGER NOT NULL DEFAULT 30, "
        "price_per_person_brl NUMERIC(15,2) NOT NULL DEFAULT 0, status VARCHAR(30) NOT NULL DEFAULT 'OPEN', "
        "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())"
    )
    op.execute(
        "CREATE TABLE IF NOT EXISTS inho.turismo_group_members ("
        "id UUID PRIMARY KEY, business_id UUID NOT NULL REFERENCES inho.businesses(id) ON DELETE CASCADE, "
        "group_id UUID NOT NULL REFERENCES inho.turismo_groups(id) ON DELETE CASCADE, "
        "member_name VARCHAR(200) NOT NULL, document_masked VARCHAR(40), room_number VARCHAR(20), "
        "room_type VARCHAR(40) NOT NULL DEFAULT 'DUPLO', amount_paid_brl NUMERIC(15,2) NOT NULL DEFAULT 0, "
        "amount_due_brl NUMERIC(15,2) NOT NULL DEFAULT 0, payment_status VARCHAR(30) NOT NULL DEFAULT 'PENDING', "
        "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())"
    )
    op.execute(
        "CREATE TABLE IF NOT EXISTS inho.turismo_channel_configs ("
        "id UUID PRIMARY KEY, business_id UUID NOT NULL UNIQUE REFERENCES inho.businesses(id) ON DELETE CASCADE, "
        "whatsapp_enabled BOOLEAN NOT NULL DEFAULT TRUE, instagram_enabled BOOLEAN NOT NULL DEFAULT FALSE, "
        "instagram_page_id VARCHAR(100), encrypted_instagram_token TEXT, "
        "telegram_enabled BOOLEAN NOT NULL DEFAULT FALSE, encrypted_telegram_bot_token TEXT, "
        "telegram_vip_channel_id VARCHAR(100), ai_first_enabled BOOLEAN NOT NULL DEFAULT TRUE, "
        "updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())"
    )
    op.execute(
        "CREATE TABLE IF NOT EXISTS inho.turismo_channel_messages ("
        "id UUID PRIMARY KEY, business_id UUID NOT NULL REFERENCES inho.businesses(id) ON DELETE CASCADE, "
        "channel VARCHAR(20) NOT NULL, sender_ref VARCHAR(120) NOT NULL, direction VARCHAR(15) NOT NULL, "
        "message_text TEXT NOT NULL, handled_by VARCHAR(20) NOT NULL DEFAULT 'AI_FIRST', "
        "escalation_trigger VARCHAR(60), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())"
    )
    op.execute(
        "CREATE TABLE IF NOT EXISTS inho.turismo_club_subscriptions ("
        "id UUID PRIMARY KEY, business_id UUID NOT NULL REFERENCES inho.businesses(id) ON DELETE CASCADE, "
        "member_name VARCHAR(200) NOT NULL, member_email VARCHAR(255) NOT NULL, "
        "telegram_chat_id VARCHAR(100), stripe_subscription_id VARCHAR(120), "
        "plan_price_brl NUMERIC(10,2) NOT NULL DEFAULT 49.90, discount_pct NUMERIC(5,2) NOT NULL DEFAULT 50.0, "
        "status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())"
    )


def downgrade() -> None:
    for tbl in (
        "turismo_club_subscriptions",
        "turismo_channel_messages",
        "turismo_channel_configs",
        "turismo_group_members",
        "turismo_groups",
        "turismo_bookings",
        "turismo_miles_accounts",
        "turismo_quotes",
        "tenant_ai_policies",
    ):
        op.execute(f"DROP TABLE IF EXISTS inho.{tbl} CASCADE")
