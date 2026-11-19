"""
INHO – Database Models
Business (Tenant) | User (RBAC) | Account | Transaction | AuditLog (immutable)
"""
import enum
import os
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean, Column, DateTime, Enum, ForeignKey,
    String, Text, Index, Numeric, Integer, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from db.session import Base

# ── Schema detection (SQLite compat for tests) ───────────────────
_IS_SQLITE = os.environ.get("DATABASE_URL", "").startswith("sqlite")
_PUBLIC_SCHEMA = None if _IS_SQLITE else "public"
_PUBLIC_USERS_FK = "users.id" if _IS_SQLITE else "public.users.id"


from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy import String
DB_UUID = String(36) if _IS_SQLITE else PG_UUID(as_uuid=False)



class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN       = "admin"
    OPERATOR    = "operator"
    VIEWER      = "viewer"
    CLIENT      = "client"

class BusinessCategory(str, enum.Enum):
    COOPERATIVA = "COOPERATIVA"
    MERCADOS_E_AFINS  = "MERCADOS_E_AFINS"
    VAREJO      = "VAREJO"
    SERVICOS    = "SERVICOS"
    TURISMO     = "TURISMO"
    OUTROS      = "OUTROS"



class AuditAction(str, enum.Enum):
    CREATE       = "CREATE"
    READ         = "READ"
    UPDATE       = "UPDATE"
    DELETE       = "DELETE"
    LOGIN        = "LOGIN"
    LOGOUT       = "LOGOUT"
    FAILED_LOGIN = "FAILED_LOGIN"


# ── User ──────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id              = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email           = Column(String(255), unique=True, nullable=False, index=True)
    full_name_db    = Column("full_name", String(255), nullable=True)
    password_hash   = Column(String(255), nullable=False)
    role            = Column(String(50), nullable=True, default="user")
    is_email_verified = Column(Boolean, default=False, nullable=False)
    subscription_status = Column(String(50), nullable=False, default="active")
    otp_secret          = Column(String(255), nullable=True)
    is_mfa_enabled      = Column(Boolean, nullable=False, default=False, server_default=("0" if _IS_SQLITE else "false"))
    backup_codes        = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        {"schema": _PUBLIC_SCHEMA}
    )



    def __repr__(self) -> str:
        return f"<User {self.email}>"

    @property
    def role_label(self) -> str:
        labels = {
            UserRole.SUPER_ADMIN: "Super Administrador",
            UserRole.ADMIN: "Usuário Mestre (Administrador)",
            UserRole.OPERATOR: "Operador",
            UserRole.VIEWER: "Visualizador",
            UserRole.CLIENT: "Cliente",
        }
        return labels.get(self.role, "Usuário")

    @property
    def full_name(self) -> str:
        if getattr(self, "full_name_db", None):
            return self.full_name_db
        if getattr(self, "email", None):
            return self.email.split("@")[0].replace(".", " ").title()
        return "Administrador INHO"

    @property
    def is_active(self) -> bool:
        return (getattr(self, "subscription_status", "active") or "active").lower() != "suspended"

    @is_active.setter
    def is_active(self, value: bool) -> None:
        self.subscription_status = "active" if bool(value) else "suspended"

    @property
    def is_verified(self) -> bool:
        return self.is_email_verified

    @property
    def updated_at(self) -> datetime:
        return self.created_at



# ── Business (Tenant) ─────────────────────────────────────────────
class Business(Base):
    """
    Representação de uma empresa/diretório de negócios.
    Usuários Premium podem ter no máximo 3 negócios.
    """
    __tablename__ = "businesses"

    id         = Column(DB_UUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id    = Column(DB_UUID, ForeignKey(_PUBLIC_USERS_FK, ondelete="CASCADE"), nullable=False)
    name       = Column(String(255), nullable=False)
    cnpj       = Column(String(20), nullable=True)
    category   = Column(Enum(BusinessCategory, schema=_PUBLIC_SCHEMA), nullable=False, default=BusinessCategory.OUTROS)
    municipal_registration = Column(String(50), nullable=True) # Inscrição Municipal
    state_registration = Column(String(50), nullable=True)     # Inscrição Estadual
    logo_url = Column(String(500), nullable=True)
    cashflow_horizon_months = Column(Integer, nullable=False, default=6)

    # Controle de Plano & Franquias (Novos Planos 05/11/2026)
    plan_tier = Column(String(40), nullable=False, default="INHO_ESSENCIAL", server_default="INHO_ESSENCIAL")
    billing_cycle = Column(String(20), nullable=False, default="MONTHLY", server_default="MONTHLY")
    monthly_price_cents = Column(Integer, nullable=False, default=29000, server_default="29000")
    max_operators = Column(Integer, nullable=False, default=3, server_default="3")
    ai_rag_enabled = Column(Boolean, nullable=False, default=False, server_default="false")
    cbm_predictive_enabled = Column(Boolean, nullable=False, default=False, server_default="false")
    cooperativa_module_enabled = Column(Boolean, nullable=False, default=False, server_default="false")
    monthly_ai_quota = Column(Integer, nullable=False, default=500, server_default="500")

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_businesses_user", "user_id"),
    )

    def __repr__(self) -> str:
        return f"<Business {self.name}>"


class BusinessOperator(Base):
    __tablename__ = "business_operators"

    id          = Column(DB_UUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id = Column(DB_UUID, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    user_id     = Column(DB_UUID, ForeignKey(_PUBLIC_USERS_FK, ondelete="CASCADE"), nullable=False)
    role        = Column(String(50), nullable=False, default="operator", server_default="operator")
    
    created_at  = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_business_operators_keys", "business_id", "user_id", unique=True),
        Index("ix_business_operators_user_id", "user_id"),
    )

    def __repr__(self) -> str:
        return f"<BusinessOperator biz={self.business_id} user={self.user_id}>"

# ── Configuracoes e Open Banking (Money Layer) ──────────────────────
class ApiToken(Base):
    __tablename__ = "api_tokens"

    id          = Column(DB_UUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id = Column(DB_UUID, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    name        = Column(String(100), nullable=False)
    token_hash  = Column(String(100), nullable=False)
    created_by_id = Column(DB_UUID, ForeignKey(_PUBLIC_USERS_FK, ondelete="SET NULL"), nullable=True)
    expires_at  = Column(DateTime(timezone=True), nullable=True)
    created_at  = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_api_tokens_biz", "business_id"),
        Index("ix_api_tokens_created_by_id", "created_by_id"),
    )

class BankIntegration(Base):
    __tablename__ = "bank_integrations"

    id                = Column(DB_UUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id       = Column(DB_UUID, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    bank_name         = Column(String(50), nullable=False) # INTER, CORA, PJBANK, ITAU
    api_key_encrypted = Column(Text, nullable=False)
    webhook_url       = Column(String(500), nullable=True)
    is_active         = Column(Boolean, nullable=False, default=True)
    created_at        = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at        = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), 
                             onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_bank_integrations_biz", "business_id"),
    )

# ── AuditLog (IMMUTABLE) ──────────────────────────────────────────
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id         = Column(DB_UUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id= Column(DB_UUID, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=True)
    user_id    = Column(DB_UUID, nullable=True)
    user_name  = Column(String(255), nullable=True)
    user_role  = Column(String(100), nullable=True)
    action     = Column(Enum(AuditAction), nullable=False)
    entity     = Column(String(100), nullable=False)
    entity_id  = Column(DB_UUID, nullable=True)
    detail     = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(512), nullable=True)
    timestamp  = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_audit_user_action", "user_id", "action"),
        Index("ix_audit_entity",      "entity",  "entity_id"),
        Index("ix_audit_timestamp",   "timestamp"),
        Index("ix_audit_logs_business_id", "business_id"),
    )


# ── ContractStatus / Contract ────────────────────────────────────
class ContractStatus(str, enum.Enum):
    ACTIVE    = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    EXPIRED   = "EXPIRED"
    CANCELLED = "CANCELLED"


class Contract(Base):
    __tablename__ = "contracts"

    id           = Column(DB_UUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id  = Column(DB_UUID, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    title        = Column(String(255), nullable=False)
    contact_name = Column(String(255), nullable=False)
    contact_doc  = Column(String(20), nullable=True)
    record_type  = Column(String(20), nullable=False)  
    total_value  = Column(Numeric(precision=20, scale=8), nullable=False)
    installments = Column(Integer, nullable=False, default=1)
    frequency    = Column(String(20), nullable=True)
    start_date   = Column(DateTime(timezone=True), nullable=False)
    end_date     = Column(DateTime(timezone=True), nullable=True)
    status       = Column(Enum(ContractStatus), nullable=False, default=ContractStatus.ACTIVE)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_contracts_status", "status"),
        Index("ix_contracts_business", "business_id"),
    )


# ── SalesOrderStatus / SalesOrder ─────────────────────────────────
class SalesOrderStatus(str, enum.Enum):
    DRAFT     = "DRAFT"
    CONFIRMED = "CONFIRMED"
    INVOICED  = "INVOICED"
    CANCELLED = "CANCELLED"


class SalesOrder(Base):
    __tablename__ = "sales_orders"

    id             = Column(DB_UUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id    = Column(DB_UUID, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    customer_name  = Column(String(255), nullable=False)
    customer_doc   = Column(String(20), nullable=True)
    description    = Column(Text, nullable=True)
    amount         = Column(Numeric(precision=20, scale=8), nullable=False)
    status         = Column(Enum(SalesOrderStatus), nullable=False, default=SalesOrderStatus.DRAFT)
    invoice_number = Column(String(100), nullable=True)
    nfe_key        = Column(String(50), nullable=True)
    nfe_status     = Column(String(50), nullable=True)
    issue_date     = Column(DateTime(timezone=True), nullable=False)
    due_date       = Column(DateTime(timezone=True), nullable=False)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_sales_orders_status", "status"),
        Index("ix_sales_orders_business", "business_id"),
    )


# ── PaymentMethod / CashRegister / PDVSale ────────────────────────
class PaymentMethod(str, enum.Enum):
    CASH        = "CASH"
    PIX         = "PIX"
    DEBIT_CARD  = "DEBIT_CARD"
    CREDIT_CARD = "CREDIT_CARD"
    CHECK       = "CHECK"
    OTHER       = "OTHER"


class CashRegisterStatus(str, enum.Enum):
    OPEN   = "OPEN"
    CLOSED = "CLOSED"


class CashRegister(Base):
    __tablename__ = "cash_registers"

    id              = Column(DB_UUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id     = Column(DB_UUID, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    operator_id     = Column(DB_UUID, ForeignKey(_PUBLIC_USERS_FK, ondelete="SET NULL"), nullable=True)
    opening_balance = Column(Numeric(precision=20, scale=8), nullable=False, default=0)
    closing_balance = Column(Numeric(precision=20, scale=8), nullable=True)
    status          = Column(Enum(CashRegisterStatus), nullable=False, default=CashRegisterStatus.OPEN)
    opened_at       = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    closed_at       = Column(DateTime(timezone=True), nullable=True)

    sales = relationship("PDVSale", back_populates="cash_register", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_cash_registers_status", "status"),
        Index("ix_cash_registers_business", "business_id"),
        Index("ix_cash_registers_operator_id", "operator_id"),
    )


class TerminalReaderStatus(str, enum.Enum):
    ONLINE  = "ONLINE"
    OFFLINE = "OFFLINE"
    BUSY    = "BUSY"


class StripeTerminalReader(Base):
    __tablename__ = "stripe_terminal_readers"

    id               = Column(DB_UUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id      = Column(DB_UUID, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    stripe_reader_id = Column(String(100), unique=True, nullable=False, index=True)
    label            = Column(String(100), nullable=False)
    device_type      = Column(String(50), nullable=False, default="bbpos_wisepos_e")
    serial_number    = Column(String(100), nullable=True)
    status           = Column(Enum(TerminalReaderStatus), default=TerminalReaderStatus.ONLINE, nullable=False)
    location_id      = Column(String(100), nullable=True)
    ip_address       = Column(String(50), nullable=True)
    created_at       = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    business = relationship("Business")

    __table_args__ = (
        Index("ix_terminal_readers_business", "business_id"),
        Index("ix_terminal_readers_status", "status"),
    )


class PDVSale(Base):
    __tablename__ = "pdv_sales"

    id               = Column(DB_UUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    cash_register_id = Column(DB_UUID, ForeignKey("cash_registers.id", ondelete="CASCADE"), nullable=False)
    customer_name    = Column(String(255), nullable=True)
    total_amount     = Column(Numeric(precision=20, scale=8), nullable=False)
    payment_method   = Column(Enum(PaymentMethod), nullable=False)
    description      = Column(Text, nullable=True)
    barcode          = Column(String(100), nullable=True)
    is_weighable     = Column(Boolean, default=False, nullable=False, server_default='0')
    weight_kg        = Column(Numeric(precision=10, scale=3), nullable=True)
    stripe_payment_intent_id = Column(String(100), nullable=True)
    terminal_reader_id = Column(String(100), nullable=True)
    card_brand       = Column(String(50), nullable=True)
    card_entry_method = Column(String(50), nullable=True)
    created_at       = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    cash_register = relationship("CashRegister", back_populates="sales")

    __table_args__ = (
        Index("ix_pdv_sales_register", "cash_register_id"),
        Index("ix_pdv_sales_created", "created_at"),
        Index("ix_pdv_sales_barcode", "barcode"),
    )


class BillingStatus(str, enum.Enum):
    PENDING   = "PENDING"
    PAID      = "PAID"
    OVERDUE   = "OVERDUE"
    CANCELLED = "CANCELLED"
    LOSS      = "LOSS"  # Crédito irrecuperável (spec §3.9)

class InvoiceType(str, enum.Enum):
    INTEGRALIZACAO_INICIAL = "INTEGRALIZACAO_INICIAL"
    MENSALIDADE            = "MENSALIDADE"
    TAXA_MANUTENCAO        = "TAXA_MANUTENCAO"
    OUTROS                 = "OUTROS"

# ── ORBE INHO: CRM Contacts (Emp/Sup/Cust) ─────────────────────────
class ContactCategory(str, enum.Enum):
    EMPLOYEE = "EMPLOYEE"
    SUPPLIER = "SUPPLIER"
    CUSTOMER = "CUSTOMER"
    PARTNER  = "PARTNER"  # Sócio / Cooperado

class PersonType(str, enum.Enum):
    INDIVIDUAL = "PESSOA_FISICA"
    LEGAL_ENTITY = "PESSOA_JURIDICA"
    FOREIGN = "EXTERIOR"

class CRMContact(Base):
    __tablename__ = "crm_contacts"

    id           = Column(DB_UUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id  = Column(DB_UUID, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    category     = Column(Enum(ContactCategory), nullable=False)
    name         = Column(String(255), nullable=False)
    document     = Column(String(50), nullable=True)   # CPF / CNPJ
    email        = Column(String(255), nullable=True)
    phone        = Column(String(50), nullable=True)
    bank_details = Column(Text, nullable=True)
    notes        = Column(Text, nullable=True)
    is_active    = Column(Boolean, default=True, nullable=False)

    # ── New Expansion Fields (B2B2C CRM) ── 
    person_type = Column(Enum(PersonType), default=PersonType.INDIVIDUAL, nullable=True)
    municipal_registration = Column(String(50), nullable=True)
    state_registration = Column(String(50), nullable=True)
    website = Column(String(255), nullable=True)
    contact_person = Column(String(150), nullable=True)
    nis = Column(String(30), nullable=True)                   # Número de Identificação Social
    correios_matricula = Column(String(50), nullable=True)    # Matrícula de logística Correios

    # Address fields (spec §2.2) + Expansions
    address      = Column(String(500), nullable=True)
    street       = Column(String(255), nullable=True)
    number       = Column(String(20), nullable=True)
    complement   = Column(String(150), nullable=True)
    neighborhood = Column(String(100), nullable=True)
    city         = Column(String(100), nullable=True)
    state        = Column(String(50), nullable=True)
    zip_code     = Column(String(20), nullable=True)

    # Banking properties for payouts / distribution
    bank_code    = Column(String(10), nullable=True)
    bank_agency  = Column(String(20), nullable=True)
    bank_account = Column(String(30), nullable=True)
    pix_key_type = Column(String(20), nullable=True)
    pix_key      = Column(String(150), nullable=True)

    # HR fields — only meaningful for EMPLOYEE category (spec §2.3)
    role_title          = Column(String(100), nullable=True)
    admission_date      = Column(DateTime(timezone=True), nullable=True)
    vacation_start_date = Column(DateTime(timezone=True), nullable=True)

    # ── OrBrick AI Attendance & LGPD Consent Flags ──
    ai_attendance_enabled = Column(Boolean, default=True, nullable=False)
    ai_handoff_until      = Column(DateTime(timezone=True), nullable=True)
    opt_in_marketing      = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_crm_contacts_business", "business_id"),
        Index("ix_crm_contacts_category", "category"),
        Index("ix_crm_contacts_active", "is_active"),
    )

# ── B2B2C Domain: Cooperado Pipeline ──────────────────────────────
class CooperadoStatus(str, enum.Enum):
    PROPOSTA_CADASTRADA       = "PROPOSTA_CADASTRADA"
    AGUARDANDO_INTEGRALIZACAO = "AGUARDANDO_INTEGRALIZACAO"
    ATIVO                     = "ATIVO"
    INADIMPLENTE              = "INADIMPLENTE"
    SUSPENSO                  = "SUSPENSO"
    DESLIGADO                 = "DESLIGADO"
    EM_REGULARIZACAO          = "EM_REGULARIZACAO"

class Cooperado(Base):
    __tablename__ = "cooperados"

    id           = Column(DB_UUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id  = Column(DB_UUID, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    name         = Column(String(255), nullable=False)
    document     = Column(String(50), nullable=False) # CPF or CNPJ
    email        = Column(String(255), nullable=True)
    phone        = Column(String(50), nullable=True)
    bank_details = Column(Text, nullable=True)
    notes        = Column(Text, nullable=True)
    status       = Column(Enum(CooperadoStatus), nullable=False, default=CooperadoStatus.PROPOSTA_CADASTRADA)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_cooperados_business", "business_id"),
        Index("ix_cooperados_status", "status"),
        Index("ix_cooperados_document", "document"),
    )



class BillingInvoice(Base):
    __tablename__ = "billing_invoices"

    id                       = Column(DB_UUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id              = Column(DB_UUID, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    cooperado_id             = Column(DB_UUID, ForeignKey("cooperados.id", ondelete="CASCADE"), nullable=True)
    crm_contact_id           = Column(DB_UUID, ForeignKey("crm_contacts.id", ondelete="CASCADE"), nullable=True)
    category_id              = Column(DB_UUID, ForeignKey("account_categories.id", ondelete="SET NULL"), nullable=True)
    invoice_type             = Column(Enum(InvoiceType), nullable=False, default=InvoiceType.OUTROS)
    customer_name            = Column(String(255), nullable=False)
    customer_phone           = Column(String(50), nullable=True)
    customer_email           = Column(String(255), nullable=True)
    customer_doc             = Column(String(20), nullable=True)
    amount                   = Column(Numeric(precision=20, scale=8), nullable=False)
    due_date                 = Column(DateTime(timezone=True), nullable=False)
    # Dupla datação obrigatória (spec §8)
    data_competencia         = Column(DateTime(timezone=True), nullable=True)  # data do fato gerador
    status                   = Column(Enum(BillingStatus), nullable=False, default=BillingStatus.PENDING)
    pix_code                 = Column(Text, nullable=True)
    pix_qr_url               = Column(Text, nullable=True)
    payment_method           = Column(Enum(PaymentMethod), nullable=False, default=PaymentMethod.PIX)
    description              = Column(Text, nullable=True)
    project_id               = Column(String(100), nullable=True)  # Centro de custo / projeto
    notification_count       = Column(Integer, nullable=False, default=0)
    last_notification_sent_at= Column(DateTime(timezone=True), nullable=True)
    viewed_at                = Column(DateTime(timezone=True), nullable=True)  # leitura pelo sacado
    remaining_balance        = Column(Numeric(precision=20, scale=8), nullable=True)  # baixa parcial

    # Disparos de WhatsApp Anti-Duplicidade (Régua de Cobrança)
    reminder_before_sent_at = Column(DateTime(timezone=True), nullable=True) # Ex: D-3
    reminder_due_sent_at    = Column(DateTime(timezone=True), nullable=True) # Ex: D0
    reminder_after_sent_at  = Column(DateTime(timezone=True), nullable=True) # Ex: D+3

    # Audit fields: quem e quando criou / editou
    created_by_id   = Column(DB_UUID, ForeignKey(_PUBLIC_USERS_FK, ondelete="SET NULL"), nullable=True)
    created_by_name = Column(String(255), nullable=True)
    updated_by_id   = Column(DB_UUID, ForeignKey(_PUBLIC_USERS_FK, ondelete="SET NULL"), nullable=True)
    updated_by_name = Column(String(255), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_billing_invoices_status", "status"),
        Index("ix_billing_invoices_business", "business_id"),
        # Índice composto de alta performance para BI (spec §8)
        Index("ix_billing_invoices_bi", "due_date", "status", "category_id"),
        Index("ix_billing_invoices_cooperado_id", "cooperado_id"),
        Index("ix_billing_invoices_crm_contact_id", "crm_contact_id"),
        Index("ix_billing_invoices_category_id", "category_id"),
        Index("ix_billing_invoices_created_by_id", "created_by_id"),
        Index("ix_billing_invoices_updated_by_id", "updated_by_id"),
    )


class PayableStatus(str, enum.Enum):
    PENDING          = "PENDING"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED         = "APPROVED"
    PAID             = "PAID"
    CANCELLED        = "CANCELLED"

class AccountPayable(Base):
    __tablename__ = "accounts_payable"

    id                       = Column(DB_UUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id              = Column(DB_UUID, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    supplier_id              = Column(DB_UUID, ForeignKey("crm_contacts.id", ondelete="CASCADE"), nullable=True)
    category_id              = Column(DB_UUID, ForeignKey("account_categories.id", ondelete="SET NULL"), nullable=True)
    description              = Column(Text, nullable=False)
    amount                   = Column(Numeric(precision=20, scale=8), nullable=False)
    due_date                 = Column(DateTime(timezone=True), nullable=False)
    # Dupla datação obrigatória (spec §8)
    data_competencia         = Column(DateTime(timezone=True), nullable=True)  # data do fato gerador
    paid_date                = Column(DateTime(timezone=True), nullable=True)
    status                   = Column(Enum(PayableStatus), nullable=False, default=PayableStatus.PENDING)
    is_reimbursable          = Column(Boolean, default=False, nullable=False)  # spec §3.7
    payment_account          = Column(String(255), nullable=True)  # conta bancária de débito
    project_id               = Column(String(100), nullable=True)  # Centro de custo / projeto

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_accounts_payable_status", "status"),
        Index("ix_accounts_payable_business", "business_id"),
        # Índice composto de alta performance para BI (spec §8)
        Index("ix_accounts_payable_bi", "due_date", "status", "category_id"),
        Index("ix_accounts_payable_supplier_id", "supplier_id"),
        Index("ix_accounts_payable_category_id", "category_id"),
    )


# ── Ghost Engine: Data Broker & Privacy Models ────────────────────
class DataBrokerMethod(str, enum.Enum):
    EMAIL = "EMAIL"
    FORM  = "FORM"
    AUTO  = "AUTO"


class PrivacyRequestStatus(str, enum.Enum):
    PENDING         = "PENDING"
    EMAIL_SENT      = "EMAIL_SENT"
    PENDING_DOCS    = "PENDING_DOCS"
    DELETED         = "DELETED"
    MANUAL_REQUIRED = "MANUAL_REQUIRED"
    REJECTED        = "REJECTED"


class DataBroker(Base):
    __tablename__ = "data_brokers"

    id          = Column(DB_UUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    name        = Column(String(255), nullable=False, unique=True)
    dpo_email   = Column(String(255), nullable=True)
    delete_url  = Column(Text, nullable=True)
    method      = Column(Enum(DataBrokerMethod), nullable=False, default=DataBrokerMethod.EMAIL)
    category    = Column(String(100), nullable=False, default="Geral") # Crédito, Marketing, CNPJ/CPF
    is_active   = Column(Boolean, default=True, nullable=False)

    created_at  = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class PrivacyRequest(Base):
    __tablename__ = "privacy_requests"

    id              = Column(DB_UUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id         = Column(DB_UUID, ForeignKey(_PUBLIC_USERS_FK, ondelete="CASCADE"), nullable=False)
    broker_id       = Column(DB_UUID, ForeignKey("data_brokers.id", ondelete="CASCADE"), nullable=False)
    status          = Column(Enum(PrivacyRequestStatus), nullable=False, default=PrivacyRequestStatus.PENDING)
    sent_at         = Column(DateTime(timezone=True), nullable=True)
    last_checked_at = Column(DateTime(timezone=True), nullable=True)
    notes           = Column(Text, nullable=True)

    created_at  = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at  = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                         onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_privacy_requests_user", "user_id"),
        Index("ix_privacy_requests_broker", "broker_id"),
        Index("ix_privacy_requests_status", "status"),
    )


# ── Webhook Logging ───────────────────────────────────────────────
class WebhookProcessingStatus(str, enum.Enum):
    RECEIVED = "RECEIVED"
    PROCESSED = "PROCESSED"
    IGNORED = "IGNORED"
    FAILED = "FAILED"

class WebhookLog(Base):
    __tablename__ = "webhook_logs"

    id             = Column(DB_UUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id       = Column(String(255), nullable=False, unique=True, index=True)
    provider       = Column(String(50), nullable=False) # e.g., 'ASAAS', 'STRIPE'
    payload        = Column(Text, nullable=False)
    status         = Column(Enum(WebhookProcessingStatus), nullable=False, default=WebhookProcessingStatus.RECEIVED)
    error_message  = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc), nullable=False)



# ── AccountCategory (Plano de Contas Hierárquico) ─────────────────
class AccountCategoryType(str, enum.Enum):
    REVENUE  = "REVENUE"   # Receitas
    COST     = "COST"      # Custos Diretos
    EXPENSE  = "EXPENSE"   # Despesas Operacionais
    TAX      = "TAX"       # Impostos / Taxas
    TRANSFER = "TRANSFER"  # Transferências


class AccountCategory(Base):
    """
    Plano de Contas parametrizável hierárquico (spec §5.2).
    Um registro sem parent_id é uma categoria raiz.
    """
    __tablename__ = "account_categories"

    id          = Column(DB_UUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id = Column(DB_UUID, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    parent_id   = Column(DB_UUID, ForeignKey("account_categories.id", ondelete="SET NULL"), nullable=True)
    name        = Column(String(255), nullable=False)
    type        = Column(Enum(AccountCategoryType), nullable=False)
    is_active   = Column(Boolean, default=True, nullable=False)

    created_at  = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_account_categories_business", "business_id"),
        Index("ix_account_categories_type",     "type"),
        Index("ix_account_categories_parent_id", "parent_id"),
    )


# ── EntityNote (Anotações Auditadas) ──────────────────────────────
class EntityNote(Base):
    """
    Widget de Anotações transversal (spec §2.4).
    entity_type: 'crm_contact' | 'cooperado' | 'billing_invoice' | 'account_payable'
    """
    __tablename__ = "entity_notes"

    id          = Column(DB_UUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id = Column(DB_UUID, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id   = Column(DB_UUID, nullable=False)  # UUID as string for polymorphism
    content     = Column(Text, nullable=False)
    author_id   = Column(DB_UUID, nullable=False)
    author_name = Column(String(255), nullable=False)

    created_at  = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_entity_notes_entity", "entity_type", "entity_id"),
        Index("ix_entity_notes_business", "business_id"),
    )


# ── EntityFile (Repositório de Arquivos em Nuvem) ─────────────────
class EntityFile(Base):
    """
    Repositório de Arquivos por entidade (spec §2.4).
    """
    __tablename__ = "entity_files"

    id            = Column(DB_UUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id   = Column(DB_UUID, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    entity_type   = Column(String(50), nullable=False)
    entity_id     = Column(DB_UUID, nullable=False)
    filename      = Column(String(500), nullable=False)
    file_url      = Column(Text, nullable=False)     # S3 / cloud storage URL
    file_category = Column(String(100), nullable=True)  # ex: 'contrato', 'identidade', 'comprovante'
    file_size     = Column(Integer, nullable=True)    # bytes
    uploaded_by   = Column(String(255), nullable=True)

    created_at    = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_entity_files_entity", "entity_type", "entity_id"),
        Index("ix_entity_files_business", "business_id"),
    )


# ── Recurrence (Faturamento Recorrente / Assinaturas) ─────────────
class RecurrenceFrequency(str, enum.Enum):
    DAILY   = "DAILY"
    WEEKLY  = "WEEKLY"
    MONTHLY = "MONTHLY"
    ANNUAL  = "ANNUAL"


class RecurrenceStatus(str, enum.Enum):
    ACTIVE    = "ACTIVE"
    PAUSED    = "PAUSED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class Recurrence(Base):
    """
    Faturamento recorrente / mensalidades (spec §3.5).
    """
    __tablename__ = "recurrences"

    id                = Column(DB_UUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id       = Column(DB_UUID, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    crm_contact_id    = Column(DB_UUID, ForeignKey("crm_contacts.id", ondelete="SET NULL"), nullable=True)
    cooperado_id      = Column(DB_UUID, ForeignKey("cooperados.id", ondelete="SET NULL"), nullable=True)
    category_id       = Column(DB_UUID, ForeignKey("account_categories.id", ondelete="SET NULL"), nullable=True)
    description       = Column(Text, nullable=False)
    amount            = Column(Numeric(precision=20, scale=8), nullable=False)
    frequency         = Column(Enum(RecurrenceFrequency), nullable=False, default=RecurrenceFrequency.MONTHLY)
    first_due_date    = Column(DateTime(timezone=True), nullable=False)
    next_due_date     = Column(DateTime(timezone=True), nullable=True)
    parcel_total      = Column(Integer, nullable=True)    # NULL = prazo indeterminado
    parcel_current    = Column(Integer, nullable=False, default=0)
    status            = Column(Enum(RecurrenceStatus), nullable=False, default=RecurrenceStatus.ACTIVE)
    payment_method    = Column(Enum(PaymentMethod), nullable=False, default=PaymentMethod.PIX)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_recurrences_business", "business_id"),
        Index("ix_recurrences_status",   "status"),
        Index("ix_recurrences_next_due", "next_due_date"),
        Index("ix_recurrences_crm_contact_id", "crm_contact_id"),
        Index("ix_recurrences_cooperado_id", "cooperado_id"),
        Index("ix_recurrences_category_id", "category_id"),
    )


# ── MonthClose (Fechamento de Mês / Trava Criptográfica) ──────────
class MonthClose(Base):
    """
    Fechamento de Mês imutável (spec §4.1).
    Após criado, nenhum lançamento do período pode ser alterado.
    checksum = SHA-256(todos os lançamentos do período em JSON)
    """
    __tablename__ = "month_closes"

    id           = Column(DB_UUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id  = Column(DB_UUID, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    period_year  = Column(Integer, nullable=False)
    period_month = Column(Integer, nullable=False)   # 1-12
    closed_by_id = Column(DB_UUID, nullable=False)
    closed_by_name = Column(String(255), nullable=False)
    checksum     = Column(String(64), nullable=False)   # SHA-256 hex
    summary_json = Column(Text, nullable=True)           # dossiê imutável serializado

    closed_at    = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_month_closes_business_period", "business_id", "period_year", "period_month", unique=True),
    )


# ── CRM Deals (Funil Kanban) ──────────────────────────────────────

class DealStage(str, enum.Enum):
    PROSPECTING = "PROSPECTING"
    PRESENTATION = "PRESENTATION"
    NEGOTIATION = "NEGOTIATION"
    WON = "WON"
    LOST = "LOST"

class DealStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    CLOSED = "CLOSED"

class CRMDeal(Base):
    """
    Negociações do Funil Kanban (CRM).
    Ao arrastar e mover para WON, engatilha faturamento e DRE automaticamente.
    """
    __tablename__ = "crm_deals"

    id             = Column(DB_UUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id    = Column(DB_UUID, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    contact_id     = Column(DB_UUID, ForeignKey("crm_contacts.id", ondelete="SET NULL"), nullable=True)
    title          = Column(String(255), nullable=False)
    value          = Column(Numeric(precision=20, scale=8), nullable=False, default=0.0)
    stage          = Column(Enum(DealStage), nullable=False, default=DealStage.PROSPECTING)
    status         = Column(Enum(DealStatus), nullable=False, default=DealStatus.ACTIVE)
    loss_reason    = Column(String(255), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_crm_deals_business", "business_id"),
        Index("ix_crm_deals_stage", "stage"),
        Index("ix_crm_deals_contact_id", "contact_id"),
    )

# ── Omnichannel Sessions (WhatsApp & E-mail Logs) ─────────────────
class OmnichannelStatus(str, enum.Enum):
    PENDING = "PENDING"
    SENT    = "SENT"
    FAILED  = "FAILED"

class OmnichannelLog(Base):
    """
    Registros de disparos de WhatsApp e E-mail.
    Garante o isolamento (Row Level Security lógico) atrelando todas as msgs enviadas à tenant específica (business_id).
    """
    __tablename__ = "omnichannel_logs"

    id              = Column(DB_UUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id     = Column(DB_UUID, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    sender_id       = Column(DB_UUID, ForeignKey(_PUBLIC_USERS_FK, ondelete="CASCADE"), nullable=False)
    contact_id      = Column(DB_UUID, ForeignKey("crm_contacts.id", ondelete="SET NULL"), nullable=True)
    channel         = Column(String(50), nullable=False)  # WHATSAPP | EMAIL
    recipient       = Column(String(255), nullable=False) # Phone number or Email
    message_content = Column(Text, nullable=False)
    status          = Column(String(50), nullable=False, default="PENDING")
    error_message   = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_omnichannel_logs_business", "business_id"),
        Index("ix_omnichannel_logs_channel", "channel"),
        Index("ix_omnichannel_logs_sender", "sender_id"),
        Index("ix_omnichannel_logs_contact_id", "contact_id"),
    )


# ── Módulo CBM (Consumer Behavior Management) & Risco de Churn ────
class ChurnRiskLevel(str, enum.Enum):
    LOW      = "LOW"
    MEDIUM   = "MEDIUM"
    HIGH     = "HIGH"
    CRITICAL = "CRITICAL"


class CBMCustomerProfile(Base):
    """
    Perfis Comportamentais (RFM), Sazonalidade e Risco de Churn por Contato.
    Isolamento estrito Multi-Tenant (business_id) e chaves UUID nativas (Manual 02).
    """
    __tablename__ = "cbm_customer_profiles"

    id                           = Column(DB_UUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id                  = Column(DB_UUID, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    contact_id                   = Column(DB_UUID, ForeignKey("crm_contacts.id", ondelete="CASCADE"), nullable=False)
    rfm_recency_days             = Column(Integer, nullable=False, default=0)
    rfm_frequency_score          = Column(Numeric(precision=5, scale=2), nullable=False, default=0.0)
    rfm_monetary_total           = Column(Numeric(precision=15, scale=2), nullable=False, default=0.0)
    churn_risk_score             = Column(Numeric(precision=5, scale=2), nullable=False, default=0.0)
    churn_risk_level             = Column(String(20), nullable=False, default="LOW")  # LOW, MEDIUM, HIGH, CRITICAL
    seasonality_cluster          = Column(String(50), nullable=True, default="RECORRENTE_MENSAL")
    ai_recommended_offer         = Column(Text, nullable=True)
    encrypted_behavioral_notes   = Column(Text, nullable=True)  # MultiFernet AES-256 at rest
    predicted_next_purchase_date = Column(DateTime(timezone=True), nullable=True)
    opt_in_campaigns             = Column(Boolean, default=True, nullable=False)
    updated_at                   = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    __table_args__ = (
        Index("ix_cbm_profiles_business_risk", "business_id", "churn_risk_level"),
        Index("ix_cbm_profiles_business_contact", "business_id", "contact_id", unique=True),
        Index("ix_cbm_customer_profiles_contact_id", "contact_id"),
    )


class CBMCampaign(Base):
    """
    Campanhas Automatizadas Multicanal do Módulo CBM (WhatsApp OrBrick, E-mail Resend, SMS).
    """
    __tablename__ = "cbm_campaigns"

    id                 = Column(DB_UUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id        = Column(DB_UUID, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    name               = Column(String(120), nullable=False)
    trigger_type       = Column(String(40), nullable=False)  # CHURN_ALERT, INACTIVITY_30D, SEASONAL, BILLING_D3
    channels           = Column(Text, nullable=False, default='["WHATSAPP", "EMAIL"]')  # JSON array
    ai_prompt_template = Column(Text, nullable=True)
    is_active          = Column(Boolean, default=True, nullable=False)
    dispatched_count   = Column(Integer, nullable=False, default=0)
    last_dispatched_at = Column(DateTime(timezone=True), nullable=True)
    created_at         = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at         = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    __table_args__ = (
        Index("ix_cbm_campaigns_business", "business_id"),
        Index("ix_cbm_campaigns_trigger", "business_id", "trigger_type"),
    )


class AIKnowledgeChunk(Base):
    """
    Base de Conhecimento RAG Isolada por Contratante (Multi-Tenant AI Knowledge Base).
    Permite que cada administrador contratante treine sua própria OrBrick-IA com
    regulamento interno, estatuto, regras de cobrança, FAQ e tom de voz, com isolamento
    lateral estrito por business_id e RLS no PostgreSQL.
    """
    __tablename__ = "ai_knowledge_chunks"

    id               = Column(DB_UUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id      = Column(DB_UUID, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    title            = Column(String(200), nullable=False)
    category         = Column(String(80), nullable=False, default="REGULAMENTO_INTERNO")
    content          = Column(Text, nullable=False)
    keywords         = Column(String(500), nullable=True)
    encrypted_digest = Column(Text, nullable=True)
    is_active        = Column(Boolean, default=True, nullable=False)
    created_by_id    = Column(DB_UUID, ForeignKey(_PUBLIC_USERS_FK, ondelete="SET NULL"), nullable=True)
    created_at       = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at       = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    __table_args__ = (
        Index("ix_ai_knowledge_chunks_business", "business_id"),
        Index("ix_ai_knowledge_chunks_biz_cat", "business_id", "category"),
        Index("ix_ai_knowledge_chunks_created_by_id", "created_by_id"),
    )



# ── Módulo OrbeJobs (Zero-Key + IMORTAL Predictive Cascade + Gmail Vault) ────

class LivingCVProfile(Base):
    """
    Living CV em formato JSON Resume (v1.0) vinculado ao usuário e tenant.
    Armazena experiências, cursos/certificações, embedding vetorial e governança de envio.
    """
    __tablename__ = "orbejobs_living_cvs"

    id                    = Column(DB_UUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id           = Column(DB_UUID, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    user_id               = Column(DB_UUID, ForeignKey(_PUBLIC_USERS_FK, ondelete="CASCADE"), nullable=False)
    full_name             = Column(String(200), nullable=False, default="")
    headline              = Column(String(255), nullable=True)
    target_roles          = Column(Text, nullable=True)
    json_resume           = Column(Text, nullable=False, default="{}")
    embedding_json        = Column(Text, nullable=True)
    human_in_the_loop     = Column(Boolean, nullable=False, default=True, server_default="true")
    daily_send_limit      = Column(Integer, nullable=False, default=12, server_default="12")
    kill_switch_active    = Column(Boolean, nullable=False, default=False, server_default="false")
    whatsapp_source_phone = Column(String(40), nullable=True)
    last_pdf_sha256       = Column(String(64), nullable=True)
    created_at            = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at            = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("business_id", "user_id", name="uq_orbejobs_living_cv_biz_user"),
        Index("ix_orbejobs_living_cvs_business_id", "business_id"),
        Index("ix_orbejobs_living_cvs_user_id", "user_id"),
    )


class OrbeJobListing(Base):
    """
    Vagas coletadas pelos conectores híbridos (Greenhouse, Lever, RSS, Playwright).
    Deduplicadas por SHA-256 canônico da URL (job_url_hash).
    """
    __tablename__ = "orbejobs_listings"

    id               = Column(DB_UUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id      = Column(DB_UUID, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    source_ats       = Column(String(40), nullable=False, default="rss")
    company_name     = Column(String(200), nullable=False)
    title            = Column(String(255), nullable=False)
    location         = Column(String(200), nullable=True)
    remote_type      = Column(String(60), nullable=True)
    job_url          = Column(String(1000), nullable=False)
    job_url_hash     = Column(String(64), nullable=False)
    recipient_email  = Column(String(255), nullable=True)
    description_text = Column(Text, nullable=False, default="")
    skills_tags      = Column(Text, nullable=True)
    embedding_json   = Column(Text, nullable=True)
    published_at     = Column(DateTime(timezone=True), nullable=True)
    created_at       = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        UniqueConstraint("business_id", "job_url_hash", name="uq_orbejobs_listing_biz_hash"),
        Index("ix_orbejobs_listings_business_id", "business_id"),
        Index("ix_orbejobs_listings_hash", "job_url_hash"),
        Index("ix_orbejobs_listings_ats", "source_ats"),
    )


class OrbeJobApplication(Base):
    """
    Candidaturas no Kanban OrbeJobs com deduplicação estrita por (user_id, job_url_hash).
    """
    __tablename__ = "orbejobs_applications"

    id                     = Column(DB_UUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id            = Column(DB_UUID, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    user_id                = Column(DB_UUID, ForeignKey(_PUBLIC_USERS_FK, ondelete="CASCADE"), nullable=False)
    job_id                 = Column(DB_UUID, ForeignKey("orbejobs_listings.id", ondelete="SET NULL"), nullable=True)
    job_url_hash           = Column(String(64), nullable=False)
    company_name           = Column(String(200), nullable=False)
    job_title              = Column(String(255), nullable=False)
    job_url                = Column(String(1000), nullable=False)
    recipient_email        = Column(String(255), nullable=True)
    stage                  = Column(String(40), nullable=False, default="DISCOVERED")
    match_score            = Column(Numeric(precision=5, scale=4), nullable=False, default=0)
    tailored_cover_letter  = Column(Text, nullable=True)
    tailored_resume_json   = Column(Text, nullable=True)
    ai_provider_used       = Column(String(80), nullable=True)
    requires_approval      = Column(Boolean, nullable=False, default=True, server_default="true")
    approved_by_human      = Column(Boolean, nullable=False, default=False, server_default="false")
    approved_at            = Column(DateTime(timezone=True), nullable=True)
    applied_at             = Column(DateTime(timezone=True), nullable=True)
    created_at             = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at             = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("user_id", "job_url_hash", name="uq_orbejobs_app_user_job_hash"),
        Index("ix_orbejobs_apps_business_id", "business_id"),
        Index("ix_orbejobs_apps_user_id", "user_id"),
        Index("ix_orbejobs_apps_job_id", "job_id"),
        Index("ix_orbejobs_apps_stage", "business_id", "stage"),
    )


class OrbeJobSendQueue(Base):
    """
    Fila de envio controlada via Gmail API com validação DNS MX, jitter aleatório,
    teto diário (10-15 envios/dia) e Kill-Switch.
    """
    __tablename__ = "orbejobs_send_queue"

    id               = Column(DB_UUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id      = Column(DB_UUID, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    user_id          = Column(DB_UUID, ForeignKey(_PUBLIC_USERS_FK, ondelete="CASCADE"), nullable=False)
    application_id   = Column(DB_UUID, ForeignKey("orbejobs_applications.id", ondelete="CASCADE"), nullable=False)
    recipient_email  = Column(String(255), nullable=False)
    subject          = Column(String(300), nullable=False)
    body_text        = Column(Text, nullable=False)
    mx_valid         = Column(Boolean, nullable=False, default=False, server_default="false")
    mx_records_json  = Column(Text, nullable=True)
    status           = Column(String(40), nullable=False, default="PENDING_APPROVAL")
    jitter_seconds   = Column(Numeric(precision=8, scale=2), nullable=False, default=0)
    scheduled_for    = Column(DateTime(timezone=True), nullable=True)
    sent_at          = Column(DateTime(timezone=True), nullable=True)
    error_message    = Column(Text, nullable=True)
    created_at       = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at       = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    __table_args__ = (
        Index("ix_orbejobs_queue_business_id", "business_id"),
        Index("ix_orbejobs_queue_user_id", "user_id"),
        Index("ix_orbejobs_queue_app_id", "application_id"),
        Index("ix_orbejobs_queue_status", "business_id", "status"),
    )


class OrbeJobSendLog(Base):
    """
    Log imutável de envios e trilha de conformidade LGPD do OrbeJobs.
    """
    __tablename__ = "orbejobs_send_logs"

    id               = Column(DB_UUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id      = Column(DB_UUID, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    user_id          = Column(DB_UUID, ForeignKey(_PUBLIC_USERS_FK, ondelete="CASCADE"), nullable=False)
    queue_id         = Column(DB_UUID, ForeignKey("orbejobs_send_queue.id", ondelete="SET NULL"), nullable=True)
    application_id   = Column(DB_UUID, ForeignKey("orbejobs_applications.id", ondelete="SET NULL"), nullable=True)
    recipient_email  = Column(String(255), nullable=False)
    gmail_message_id = Column(String(200), nullable=True)
    mx_host          = Column(String(255), nullable=True)
    status           = Column(String(40), nullable=False)
    latency_ms       = Column(Integer, nullable=False, default=0)
    lgpd_audit_hash  = Column(String(64), nullable=False)
    detail           = Column(Text, nullable=True)
    created_at       = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_orbejobs_logs_business_id", "business_id"),
        Index("ix_orbejobs_logs_user_id", "user_id"),
        Index("ix_orbejobs_logs_queue_id", "queue_id"),
        Index("ix_orbejobs_logs_app_id", "application_id"),
        Index("ix_orbejobs_logs_created_at", "created_at"),
    )


class OrbeJobOAuthVault(Base):
    """
    Cofre criptografado MultiFernet AES-256 para tokens OAuth2 (gmail.send) do OrbeJobs.
    Bloqueado 100% no PostgREST via supabase_hardening.sensitive_tables.
    """
    __tablename__ = "orbejobs_oauth_vault"

    id                      = Column(DB_UUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id             = Column(DB_UUID, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    user_id                 = Column(DB_UUID, ForeignKey(_PUBLIC_USERS_FK, ondelete="CASCADE"), nullable=False)
    provider                = Column(String(40), nullable=False, default="gmail")
    account_email           = Column(String(255), nullable=False)
    encrypted_access_token  = Column(Text, nullable=False)
    encrypted_refresh_token = Column(Text, nullable=True)
    scopes                  = Column(String(500), nullable=False, default="https://www.googleapis.com/auth/gmail.send")
    token_expiry            = Column(DateTime(timezone=True), nullable=True)
    is_active               = Column(Boolean, nullable=False, default=True, server_default="true")
    created_at              = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at              = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("business_id", "user_id", "provider", name="uq_orbejobs_oauth_biz_user_prov"),
        Index("ix_orbejobs_oauth_business_id", "business_id"),
        Index("ix_orbejobs_oauth_user_id", "user_id"),
    )


class TenantAIPolicy(Base):
    """
    Política Estruturada da IA por Contratante (Onda 3 - Fase 5A/5B, Manual 35).
    Armazena regras extraídas de estatutos/documentos, trechos de origem,
    detecção de conflitos e aprovação explícita do gestor humano.
    O PolicyEngine determinístico executa apenas sobre `approved_rules_json`.
    """
    __tablename__ = "tenant_ai_policies"

    id                   = Column(DB_UUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id          = Column(DB_UUID, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, unique=True)
    status               = Column(String(40), nullable=False, default="DRAFT")  # DRAFT, CONFLICT_REVIEW, APPROVED
    draft_rules_json     = Column(Text, nullable=False, default="{}")
    approved_rules_json  = Column(Text, nullable=False, default="{}")
    source_excerpts_json = Column(Text, nullable=False, default="[]")
    has_conflict         = Column(Boolean, nullable=False, default=False, server_default="false")
    conflict_notes       = Column(Text, nullable=True)
    approved_by_id       = Column(DB_UUID, ForeignKey(_PUBLIC_USERS_FK, ondelete="SET NULL"), nullable=True)
    approved_by_name     = Column(String(255), nullable=True)
    approved_at          = Column(DateTime(timezone=True), nullable=True)
    created_at           = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at           = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    __table_args__ = (
        Index("ix_tenant_ai_policies_business_id", "business_id"),
        Index("ix_tenant_ai_policies_status", "status"),
    )


# ── INHO Turismo Vertical (AI-First / Human-Last · Orbe Systems) ────────

class TurismoQuote(Base):
    __tablename__ = "turismo_quotes"

    id                   = Column(DB_UUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id          = Column(DB_UUID, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    contact_id           = Column(DB_UUID, ForeignKey("crm_contacts.id", ondelete="SET NULL"), nullable=True)
    proposal_slug        = Column(String(80), nullable=False, unique=True)
    client_name          = Column(String(200), nullable=False)
    origin               = Column(String(20), nullable=False)
    destination          = Column(String(20), nullable=False)
    departure_date       = Column(String(30), nullable=True)
    return_date          = Column(String(30), nullable=True)
    passengers           = Column(Integer, nullable=False, default=1)
    airline_program      = Column(String(60), nullable=False, default="SMILES")
    cash_price_brl       = Column(Numeric(precision=15, scale=2), nullable=False, default=0.0)
    miles_required       = Column(Integer, nullable=False, default=0)
    mile_cost_per_k_brl  = Column(Numeric(precision=10, scale=2), nullable=False, default=17.5)
    tax_fees_brl         = Column(Numeric(precision=15, scale=2), nullable=False, default=0.0)
    total_miles_cost_brl = Column(Numeric(precision=15, scale=2), nullable=False, default=0.0)
    recommended_mode     = Column(String(20), nullable=False, default="MILES")  # MILES | CASH
    savings_brl          = Column(Numeric(precision=15, scale=2), nullable=False, default=0.0)
    options_json         = Column(Text, nullable=False, default="[]")
    selected_option      = Column(String(10), nullable=True)  # A | B | C
    pnr_locator          = Column(String(30), nullable=True)
    pnr_raw_text         = Column(Text, nullable=True)
    is_public_offer      = Column(Boolean, nullable=False, default=False, server_default="false")
    status               = Column(String(30), nullable=False, default="DRAFT")  # DRAFT, SENT, APPROVED, EMITTED
    approved_at          = Column(DateTime(timezone=True), nullable=True)
    created_at           = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at           = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_turismo_quotes_business_id", "business_id"),
        Index("ix_turismo_quotes_slug", "proposal_slug"),
    )


class TurismoMilesAccount(Base):
    """
    Cofre de Milhas & Semáforo de CPF (sem NUNCA armazenar senhas).
    """
    __tablename__ = "turismo_miles_accounts"

    id                      = Column(DB_UUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id             = Column(DB_UUID, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    program_name            = Column(String(60), nullable=False)  # SMILES, LATAM_PASS, AZUL, LIVELO
    holder_name             = Column(String(200), nullable=False)
    holder_document_masked  = Column(String(40), nullable=False)
    miles_balance           = Column(Integer, nullable=False, default=0)
    cpfs_used_year          = Column(Integer, nullable=False, default=0)
    cpfs_limit_year         = Column(Integer, nullable=False, default=25)
    semaphore_status        = Column(String(20), nullable=False, default="GREEN")  # GREEN | YELLOW | RED
    notes                   = Column(Text, nullable=True)
    created_at              = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at              = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_turismo_miles_business_id", "business_id"),
    )


class TurismoBooking(Base):
    """
    Reservas confirmadas, DRE de Agência (Intermediação vs Repasse/ISS) e Radar de Embarque.
    """
    __tablename__ = "turismo_bookings"

    id                   = Column(DB_UUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id          = Column(DB_UUID, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    quote_id             = Column(DB_UUID, ForeignKey("turismo_quotes.id", ondelete="SET NULL"), nullable=True)
    contact_id           = Column(DB_UUID, ForeignKey("crm_contacts.id", ondelete="SET NULL"), nullable=True)
    pnr_locator          = Column(String(30), nullable=False)
    passenger_name       = Column(String(200), nullable=False)
    origin               = Column(String(20), nullable=False)
    destination          = Column(String(20), nullable=False)
    departure_at         = Column(DateTime(timezone=True), nullable=False)
    return_at            = Column(DateTime(timezone=True), nullable=True)
    sale_amount_brl      = Column(Numeric(precision=15, scale=2), nullable=False, default=0.0)
    supplier_cost_brl    = Column(Numeric(precision=15, scale=2), nullable=False, default=0.0)
    agency_fee_brl       = Column(Numeric(precision=15, scale=2), nullable=False, default=0.0)
    iss_rate_pct         = Column(Numeric(precision=5, scale=2), nullable=False, default=5.0)
    iss_tax_brl          = Column(Numeric(precision=15, scale=2), nullable=False, default=0.0)
    net_profit_brl       = Column(Numeric(precision=15, scale=2), nullable=False, default=0.0)
    status               = Column(String(30), nullable=False, default="CONFIRMED")
    boarding_d7_sent     = Column(Boolean, nullable=False, default=False, server_default="false")
    boarding_d2_sent     = Column(Boolean, nullable=False, default=False, server_default="false")
    boarding_d0_sent     = Column(Boolean, nullable=False, default=False, server_default="false")
    boarding_d2_post_sent = Column(Boolean, nullable=False, default=False, server_default="false")
    created_at           = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_turismo_bookings_business_id", "business_id"),
    )


class TurismoGroup(Base):
    __tablename__ = "turismo_groups"

    id                   = Column(DB_UUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id          = Column(DB_UUID, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    group_name           = Column(String(200), nullable=False)
    destination          = Column(String(120), nullable=False)
    departure_date       = Column(String(30), nullable=True)
    return_date          = Column(String(30), nullable=True)
    max_members          = Column(Integer, nullable=False, default=30)
    price_per_person_brl = Column(Numeric(precision=15, scale=2), nullable=False, default=0.0)
    status               = Column(String(30), nullable=False, default="OPEN")
    created_at           = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_turismo_groups_business_id", "business_id"),
    )


class TurismoGroupMember(Base):
    __tablename__ = "turismo_group_members"

    id              = Column(DB_UUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id     = Column(DB_UUID, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    group_id        = Column(DB_UUID, ForeignKey("turismo_groups.id", ondelete="CASCADE"), nullable=False)
    member_name     = Column(String(200), nullable=False)
    document_masked = Column(String(40), nullable=True)
    room_number     = Column(String(20), nullable=True)
    room_type       = Column(String(40), nullable=False, default="DUPLO")
    amount_paid_brl = Column(Numeric(precision=15, scale=2), nullable=False, default=0.0)
    amount_due_brl  = Column(Numeric(precision=15, scale=2), nullable=False, default=0.0)
    payment_status  = Column(String(30), nullable=False, default="PENDING")
    created_at      = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_turismo_group_members_group_id", "group_id"),
        Index("ix_turismo_group_members_business_id", "business_id"),
    )


class TurismoChannelConfig(Base):
    __tablename__ = "turismo_channel_configs"

    id                            = Column(DB_UUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id                   = Column(DB_UUID, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, unique=True)
    whatsapp_enabled              = Column(Boolean, nullable=False, default=True, server_default="true")
    instagram_enabled             = Column(Boolean, nullable=False, default=False, server_default="false")
    instagram_page_id             = Column(String(100), nullable=True)
    encrypted_instagram_token     = Column(Text, nullable=True)
    telegram_enabled              = Column(Boolean, nullable=False, default=False, server_default="false")
    encrypted_telegram_bot_token  = Column(Text, nullable=True)
    telegram_vip_channel_id       = Column(String(100), nullable=True)
    ai_first_enabled              = Column(Boolean, nullable=False, default=True, server_default="true")
    updated_at                    = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)


class TurismoChannelMessage(Base):
    __tablename__ = "turismo_channel_messages"

    id                = Column(DB_UUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id       = Column(DB_UUID, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    channel           = Column(String(20), nullable=False)  # WHATSAPP | INSTAGRAM | TELEGRAM
    sender_ref        = Column(String(120), nullable=False)
    direction         = Column(String(15), nullable=False)  # INBOUND | OUTBOUND
    message_text      = Column(Text, nullable=False)
    handled_by        = Column(String(20), nullable=False, default="AI_FIRST")  # AI_FIRST | HUMAN_LAST
    escalation_trigger = Column(String(60), nullable=True)
    created_at        = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_turismo_channel_msgs_business_id", "business_id"),
    )


class TurismoClubSubscription(Base):
    __tablename__ = "turismo_club_subscriptions"

    id                     = Column(DB_UUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id            = Column(DB_UUID, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    member_name            = Column(String(200), nullable=False)
    member_email           = Column(String(255), nullable=False)
    telegram_chat_id       = Column(String(100), nullable=True)
    stripe_subscription_id = Column(String(120), nullable=True)
    plan_price_brl         = Column(Numeric(precision=10, scale=2), nullable=False, default=49.90)
    discount_pct           = Column(Numeric(precision=5, scale=2), nullable=False, default=50.0)
    status                 = Column(String(30), nullable=False, default="ACTIVE")
    created_at             = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_turismo_club_business_id", "business_id"),
    )
