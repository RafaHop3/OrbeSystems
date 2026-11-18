"""add_orbejobs_tables

Revision ID: 09e2465c15f2
Revises: 08d1354b04e1
Create Date: 2026-11-18 16:25:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = '09e2465c15f2'
down_revision: Union[str, None] = '08d1354b04e1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    is_pg = bind.dialect.name == 'postgresql'
    uuid_type = postgresql.UUID(as_uuid=False) if is_pg else sa.String(length=36)
    schema = 'inho' if is_pg else None
    biz_fk = 'inho.businesses.id' if is_pg else 'businesses.id'
    user_fk = 'public.users.id' if is_pg else 'users.id'

    op.create_table(
        'orbejobs_living_cvs',
        sa.Column('id', uuid_type, primary_key=True),
        sa.Column('business_id', uuid_type, sa.ForeignKey(biz_fk, ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', uuid_type, sa.ForeignKey(user_fk, ondelete='CASCADE'), nullable=False),
        sa.Column('full_name', sa.String(200), nullable=False, server_default=''),
        sa.Column('headline', sa.String(255), nullable=True),
        sa.Column('target_roles', sa.Text(), nullable=True),
        sa.Column('json_resume', sa.Text(), nullable=False, server_default='{}'),
        sa.Column('embedding_json', sa.Text(), nullable=True),
        sa.Column('human_in_the_loop', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('daily_send_limit', sa.Integer(), nullable=False, server_default='12'),
        sa.Column('kill_switch_active', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('whatsapp_source_phone', sa.String(40), nullable=True),
        sa.Column('last_pdf_sha256', sa.String(64), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('business_id', 'user_id', name='uq_orbejobs_living_cv_biz_user'),
        schema=schema,
    )
    op.create_index('ix_orbejobs_living_cvs_business_id', 'orbejobs_living_cvs', ['business_id'], schema=schema)
    op.create_index('ix_orbejobs_living_cvs_user_id', 'orbejobs_living_cvs', ['user_id'], schema=schema)

    op.create_table(
        'orbejobs_listings',
        sa.Column('id', uuid_type, primary_key=True),
        sa.Column('business_id', uuid_type, sa.ForeignKey(biz_fk, ondelete='CASCADE'), nullable=False),
        sa.Column('source_ats', sa.String(40), nullable=False, server_default='rss'),
        sa.Column('company_name', sa.String(200), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('location', sa.String(200), nullable=True),
        sa.Column('remote_type', sa.String(60), nullable=True),
        sa.Column('job_url', sa.String(1000), nullable=False),
        sa.Column('job_url_hash', sa.String(64), nullable=False),
        sa.Column('recipient_email', sa.String(255), nullable=True),
        sa.Column('description_text', sa.Text(), nullable=False, server_default=''),
        sa.Column('skills_tags', sa.Text(), nullable=True),
        sa.Column('embedding_json', sa.Text(), nullable=True),
        sa.Column('published_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('business_id', 'job_url_hash', name='uq_orbejobs_listing_biz_hash'),
        schema=schema,
    )
    op.create_index('ix_orbejobs_listings_business_id', 'orbejobs_listings', ['business_id'], schema=schema)
    op.create_index('ix_orbejobs_listings_hash', 'orbejobs_listings', ['job_url_hash'], schema=schema)
    op.create_index('ix_orbejobs_listings_ats', 'orbejobs_listings', ['source_ats'], schema=schema)

    op.create_table(
        'orbejobs_applications',
        sa.Column('id', uuid_type, primary_key=True),
        sa.Column('business_id', uuid_type, sa.ForeignKey(biz_fk, ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', uuid_type, sa.ForeignKey(user_fk, ondelete='CASCADE'), nullable=False),
        sa.Column('job_id', uuid_type, sa.ForeignKey(('inho.orbejobs_listings.id' if is_pg else 'orbejobs_listings.id'), ondelete='SET NULL'), nullable=True),
        sa.Column('job_url_hash', sa.String(64), nullable=False),
        sa.Column('company_name', sa.String(200), nullable=False),
        sa.Column('job_title', sa.String(255), nullable=False),
        sa.Column('job_url', sa.String(1000), nullable=False),
        sa.Column('recipient_email', sa.String(255), nullable=True),
        sa.Column('stage', sa.String(40), nullable=False, server_default='DISCOVERED'),
        sa.Column('match_score', sa.Numeric(5, 4), nullable=False, server_default='0'),
        sa.Column('tailored_cover_letter', sa.Text(), nullable=True),
        sa.Column('tailored_resume_json', sa.Text(), nullable=True),
        sa.Column('ai_provider_used', sa.String(80), nullable=True),
        sa.Column('requires_approval', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('approved_by_human', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('applied_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('user_id', 'job_url_hash', name='uq_orbejobs_app_user_job_hash'),
        schema=schema,
    )
    op.create_index('ix_orbejobs_apps_business_id', 'orbejobs_applications', ['business_id'], schema=schema)
    op.create_index('ix_orbejobs_apps_user_id', 'orbejobs_applications', ['user_id'], schema=schema)
    op.create_index('ix_orbejobs_apps_job_id', 'orbejobs_applications', ['job_id'], schema=schema)
    op.create_index('ix_orbejobs_apps_stage', 'orbejobs_applications', ['business_id', 'stage'], schema=schema)

    op.create_table(
        'orbejobs_send_queue',
        sa.Column('id', uuid_type, primary_key=True),
        sa.Column('business_id', uuid_type, sa.ForeignKey(biz_fk, ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', uuid_type, sa.ForeignKey(user_fk, ondelete='CASCADE'), nullable=False),
        sa.Column('application_id', uuid_type, sa.ForeignKey(('inho.orbejobs_applications.id' if is_pg else 'orbejobs_applications.id'), ondelete='CASCADE'), nullable=False),
        sa.Column('recipient_email', sa.String(255), nullable=False),
        sa.Column('subject', sa.String(300), nullable=False),
        sa.Column('body_text', sa.Text(), nullable=False),
        sa.Column('mx_valid', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('mx_records_json', sa.Text(), nullable=True),
        sa.Column('status', sa.String(40), nullable=False, server_default='PENDING_APPROVAL'),
        sa.Column('jitter_seconds', sa.Numeric(8, 2), nullable=False, server_default='0'),
        sa.Column('scheduled_for', sa.DateTime(timezone=True), nullable=True),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        schema=schema,
    )
    op.create_index('ix_orbejobs_queue_business_id', 'orbejobs_send_queue', ['business_id'], schema=schema)
    op.create_index('ix_orbejobs_queue_user_id', 'orbejobs_send_queue', ['user_id'], schema=schema)
    op.create_index('ix_orbejobs_queue_app_id', 'orbejobs_send_queue', ['application_id'], schema=schema)
    op.create_index('ix_orbejobs_queue_status', 'orbejobs_send_queue', ['business_id', 'status'], schema=schema)

    op.create_table(
        'orbejobs_send_logs',
        sa.Column('id', uuid_type, primary_key=True),
        sa.Column('business_id', uuid_type, sa.ForeignKey(biz_fk, ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', uuid_type, sa.ForeignKey(user_fk, ondelete='CASCADE'), nullable=False),
        sa.Column('queue_id', uuid_type, sa.ForeignKey(('inho.orbejobs_send_queue.id' if is_pg else 'orbejobs_send_queue.id'), ondelete='SET NULL'), nullable=True),
        sa.Column('application_id', uuid_type, sa.ForeignKey(('inho.orbejobs_applications.id' if is_pg else 'orbejobs_applications.id'), ondelete='SET NULL'), nullable=True),
        sa.Column('recipient_email', sa.String(255), nullable=False),
        sa.Column('gmail_message_id', sa.String(200), nullable=True),
        sa.Column('mx_host', sa.String(255), nullable=True),
        sa.Column('status', sa.String(40), nullable=False),
        sa.Column('latency_ms', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('lgpd_audit_hash', sa.String(64), nullable=False),
        sa.Column('detail', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        schema=schema,
    )
    op.create_index('ix_orbejobs_logs_business_id', 'orbejobs_send_logs', ['business_id'], schema=schema)
    op.create_index('ix_orbejobs_logs_user_id', 'orbejobs_send_logs', ['user_id'], schema=schema)
    op.create_index('ix_orbejobs_logs_queue_id', 'orbejobs_send_logs', ['queue_id'], schema=schema)
    op.create_index('ix_orbejobs_logs_app_id', 'orbejobs_send_logs', ['application_id'], schema=schema)
    op.create_index('ix_orbejobs_logs_created_at', 'orbejobs_send_logs', ['created_at'], schema=schema)

    op.create_table(
        'orbejobs_oauth_vault',
        sa.Column('id', uuid_type, primary_key=True),
        sa.Column('business_id', uuid_type, sa.ForeignKey(biz_fk, ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', uuid_type, sa.ForeignKey(user_fk, ondelete='CASCADE'), nullable=False),
        sa.Column('provider', sa.String(40), nullable=False, server_default='gmail'),
        sa.Column('account_email', sa.String(255), nullable=False),
        sa.Column('encrypted_access_token', sa.Text(), nullable=False),
        sa.Column('encrypted_refresh_token', sa.Text(), nullable=True),
        sa.Column('scopes', sa.String(500), nullable=False, server_default='https://www.googleapis.com/auth/gmail.send'),
        sa.Column('token_expiry', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('business_id', 'user_id', 'provider', name='uq_orbejobs_oauth_biz_user_prov'),
        schema=schema,
    )
    op.create_index('ix_orbejobs_oauth_business_id', 'orbejobs_oauth_vault', ['business_id'], schema=schema)
    op.create_index('ix_orbejobs_oauth_user_id', 'orbejobs_oauth_vault', ['user_id'], schema=schema)


def downgrade() -> None:
    bind = op.get_bind()
    schema = 'inho' if bind.dialect.name == 'postgresql' else None
    for tbl in (
        'orbejobs_oauth_vault',
        'orbejobs_send_logs',
        'orbejobs_send_queue',
        'orbejobs_applications',
        'orbejobs_listings',
        'orbejobs_living_cvs',
    ):
        op.drop_table(tbl, schema=schema)
