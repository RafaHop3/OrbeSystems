"""initial_schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-05-18

Schema inicial criado automaticamente via create_all na Fase 1.
Esta revision marca o estado base para o Alembic rastrear a partir daqui.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Tabelas já existem no banco (criadas via create_all na startup da Fase 1).
    # Esta migration é um marcador de baseline — não executa DDL.
    pass


def downgrade() -> None:
    # Para voltar ao estado zero seria necessário dropar tudo —
    # operação destrutiva que deve ser feita manualmente em produção.
    pass
