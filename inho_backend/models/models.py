"""
INHO – Database Models
Business (Tenant) | User (RBAC) | Account | Transaction | AuditLog (immutable)
"""
import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean, Column, DateTime, Enum, ForeignKey,
    String, Text, Index, Numeric, Integer
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from db.session import Base


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN       = "admin"
    OPERATOR    = "operator"
    VIEWER      = "viewer"
    CLIENT      = "client"

class BusinessCategory(str, enum.Enum):
    COOPERATIVA = "COOPERATIVA"
    VAREJO      = "VAREJO"
    SERVICOS    = "SERVICOS"
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

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email           = Column(String(255), unique=True, nullable=False, index=True)
    full_name       = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role            = Column(Enum(UserRole), nullable=False, default=UserRole.CLIENT)
    is_active       = Column(Boolean, default=True, nullable=False)
    is_verified     = Column(Boolean, default=False, nullable=False)
    otp_secret      = Column(String(255), nullable=True)
    is_mfa_enabled  = Column(Boolean, default=False, nullable=False)
    backup_codes    = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_users_email_active", "email", "is_active"),
    )

    def __repr__(self) -> str:
        return f"<User {self.email} [{self.role}]>"

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


# ── Business (Tenant) ─────────────────────────────────────────────
class Business(Base):
    """
    Representação de uma empresa/diretório de negócios.
    Usuários Premium podem ter no máximo 3 negócios.
    """
    __tablename__ = "businesses"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id    = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name       = Column(String(255), nullable=False)
    cnpj       = Column(String(20), nullable=True)
    category   = Column(Enum(BusinessCategory), nullable=False, default=BusinessCategory.OUTROS)

    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_businesses_user", "user_id"),
    )

    def __repr__(self) -> str:
        return f"<Business {self.name}>"


# ── AuditLog (IMMUTABLE) ──────────────────────────────────────────
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id= Column(UUID(as_uuid=True), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=True)
    user_id    = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    user_name  = Column(String(255), nullable=True)
    user_role  = Column(String(100), nullable=True)
    action     = Column(Enum(AuditAction), nullable=False)
    entity     = Column(String(100), nullable=False)
    entity_id  = Column(String(255), nullable=True)
    detail     = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(512), nullable=True)
    timestamp  = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_audit_user_action", "user_id", "action"),
        Index("ix_audit_entity",      "entity",  "entity_id"),
        Index("ix_audit_timestamp",   "timestamp"),
    )


# ── ContractStatus / Contract ────────────────────────────────────
class ContractStatus(str, enum.Enum):
    ACTIVE    = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    EXPIRED   = "EXPIRED"
    CANCELLED = "CANCELLED"


class Contract(Base):
    __tablename__ = "contracts"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id  = Column(UUID(as_uuid=True), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
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

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id    = Column(UUID(as_uuid=True), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
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

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id     = Column(UUID(as_uuid=True), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    operator_id     = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    opening_balance = Column(Numeric(precision=20, scale=8), nullable=False, default=0)
    closing_balance = Column(Numeric(precision=20, scale=8), nullable=True)
    status          = Column(Enum(CashRegisterStatus), nullable=False, default=CashRegisterStatus.OPEN)
    opened_at       = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    closed_at       = Column(DateTime(timezone=True), nullable=True)

    sales = relationship("PDVSale", back_populates="cash_register", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_cash_registers_status", "status"),
        Index("ix_cash_registers_business", "business_id"),
    )


class PDVSale(Base):
    __tablename__ = "pdv_sales"

    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cash_register_id = Column(UUID(as_uuid=True), ForeignKey("cash_registers.id", ondelete="CASCADE"), nullable=False)
    customer_name    = Column(String(255), nullable=True)
    total_amount     = Column(Numeric(precision=20, scale=8), nullable=False)
    payment_method   = Column(Enum(PaymentMethod), nullable=False)
    description      = Column(Text, nullable=True)
    created_at       = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    cash_register = relationship("CashRegister", back_populates="sales")

    __table_args__ = (
        Index("ix_pdv_sales_register", "cash_register_id"),
        Index("ix_pdv_sales_created", "created_at"),
    )


class BillingStatus(str, enum.Enum):
    PENDING   = "PENDING"
    PAID      = "PAID"
    OVERDUE   = "OVERDUE"
    CANCELLED = "CANCELLED"

# ── B2B2C Domain: Cooperado Pipeline ──────────────────────────────
class CooperadoStatus(str, enum.Enum):
    CONTRATO_INICIAL  = "CONTRATO_INICIAL"
    AGUARDANDO_TAXA   = "AGUARDANDO_TAXA"
    COOPERADO         = "COOPERADO"
    INADIMPLENTE      = "INADIMPLENTE"
    EM_REGULARIZACAO  = "EM_REGULARIZACAO"

class Cooperado(Base):
    __tablename__ = "cooperados"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id  = Column(UUID(as_uuid=True), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    name         = Column(String(255), nullable=False)
    document     = Column(String(50), nullable=False) # CPF or CNPJ
    email        = Column(String(255), nullable=True)
    phone        = Column(String(50), nullable=True)
    status       = Column(Enum(CooperadoStatus), nullable=False, default=CooperadoStatus.CONTRATO_INICIAL)

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

    id                       = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id              = Column(UUID(as_uuid=True), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    customer_name            = Column(String(255), nullable=False)
    customer_phone           = Column(String(50), nullable=True)
    customer_email           = Column(String(255), nullable=True)
    customer_doc             = Column(String(20), nullable=True)
    amount                   = Column(Numeric(precision=20, scale=8), nullable=False)
    due_date                 = Column(DateTime(timezone=True), nullable=False)
    status                   = Column(Enum(BillingStatus), nullable=False, default=BillingStatus.PENDING)
    pix_code                 = Column(Text, nullable=True)
    pix_qr_url               = Column(Text, nullable=True)
    payment_method           = Column(Enum(PaymentMethod), nullable=False, default=PaymentMethod.PIX)
    description              = Column(Text, nullable=True)
    notification_count       = Column(Integer, nullable=False, default=0)
    last_notification_sent_at= Column(DateTime(timezone=True), nullable=True)
    
    # Audit fields: quem e quando criou / editou
    created_by_id   = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_by_name = Column(String(255), nullable=True)
    updated_by_id   = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_by_name = Column(String(255), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_billing_invoices_status", "status"),
        Index("ix_billing_invoices_business", "business_id"),
        Index("ix_billing_invoices_due", "due_date"),
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

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name        = Column(String(255), nullable=False, unique=True)
    dpo_email   = Column(String(255), nullable=True)
    delete_url  = Column(Text, nullable=True)
    method      = Column(Enum(DataBrokerMethod), nullable=False, default=DataBrokerMethod.EMAIL)
    category    = Column(String(100), nullable=False, default="Geral") # Crédito, Marketing, CNPJ/CPF
    is_active   = Column(Boolean, default=True, nullable=False)

    created_at  = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class PrivacyRequest(Base):
    __tablename__ = "privacy_requests"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id         = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    broker_id       = Column(UUID(as_uuid=True), ForeignKey("data_brokers.id", ondelete="CASCADE"), nullable=False)
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


