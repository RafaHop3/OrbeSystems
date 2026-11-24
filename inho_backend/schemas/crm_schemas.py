from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime
from typing import Optional, List
from models.models import (
    ContactCategory, PayableStatus,
    AccountCategoryType, RecurrenceFrequency, RecurrenceStatus, PaymentMethod
)


# ── CRM Contacts ──────────────────────────────────────────────────
from pydantic import BaseModel, EmailStr, field_validator
import json
import re

COMPE_BANK_NAMES = {
    "001": "Banco do Brasil",
    "033": "Santander",
    "041": "Banrisul",
    "070": "BRB - Banco de Brasília",
    "077": "Banco Inter",
    "085": "Ailos / Viacredi",
    "104": "Caixa Econômica Federal",
    "133": "Cresol",
    "136": "Unicred",
    "208": "BTG Pactual",
    "212": "Banco Original",
    "237": "Bradesco",
    "260": "Nubank",
    "290": "PagBank",
    "323": "Mercado Pago",
    "336": "C6 Bank",
    "341": "Itaú Unibanco",
    "380": "PicPay",
    "403": "Cora",
    "422": "Banco Safra",
    "655": "Banco Votorantim (BV)",
    "748": "Sicredi",
    "756": "Sicoob",
}


def sanitize_whatsapp_number(v: Optional[str]) -> Optional[str]:
    if not v:
        return None
    nums = re.sub(r"\D", "", str(v))
    if not nums:
        return None
    if len(nums) in [10, 11] and not nums.startswith("55"):
        nums = "55" + nums
    if len(nums) == 13 and nums.startswith("55") and nums[4] == "9":
        return nums[:4] + nums[5:]
    return nums


class ContactPhoneEntry(BaseModel):
    number: str
    type: Optional[str] = "PROPRIO"     # PROPRIO | MAE | PAI | RECADO | WHATSAPP | COMERCIAL | RESIDENCIAL | OUTRO
    label: Optional[str] = None         # Ex.: "Telefone da mãe (Dona Maria)", "Telefone para recado"
    is_whatsapp: Optional[bool] = True
    is_primary: Optional[bool] = False


class ContactEmailEntry(BaseModel):
    email: str
    type: Optional[str] = "PRINCIPAL"   # PRINCIPAL | PESSOAL | CORPORATIVO | FINANCEIRO | SECUNDARIO | OUTRO
    label: Optional[str] = None
    is_primary: Optional[bool] = False


class ContactBankAccountEntry(BaseModel):
    bank_code: Optional[str] = None     # Número COMPE ex: 001, 756, 748, 341
    bank_name: Optional[str] = None     # Nome do banco ex: Banco do Brasil, Sicoob, Sicredi, Itaú
    agency: Optional[str] = None        # Agência separada
    account: Optional[str] = None       # Conta separada
    account_type: Optional[str] = "CONTA_CORRENTE"  # CONTA_CORRENTE | CONTA_POUPANCA | CONTA_CAPITAL_COOP | CONTA_SALARIO | CONTA_PAGAMENTO
    pix_key_type: Optional[str] = None
    pix_key: Optional[str] = None
    holder_name: Optional[str] = None
    is_primary: Optional[bool] = False


def _format_single_bank_summary(b: dict) -> str:
    code = (b.get("bank_code") or "").strip()
    name = (b.get("bank_name") or "").strip()
    if code and not name:
        name = COMPE_BANK_NAMES.get(code.zfill(3), "")
    ag = (b.get("agency") or "").strip()
    acc = (b.get("account") or "").strip()
    acc_type = (b.get("account_type") or "").strip()
    pix = (b.get("pix_key") or "").strip()
    parts = []
    if code or name:
        parts.append(f"Banco: {code}{(' - ' + name) if (code and name) else name}".strip())
    if ag:
        parts.append(f"Ag: {ag}")
    if acc:
        parts.append(f"Conta: {acc}{f' ({acc_type})' if acc_type else ''}")
    if pix:
        parts.append(f"PIX: {pix}")
    return " | ".join(parts)


def normalize_registration_payload(data: dict, existing_obj=None) -> dict:
    """
    Normaliza campos pessoais (birth_date, filiation, mother_name, father_name),
    dados bancários estruturados (bank_code, bank_name, bank_agency, bank_account)
    e multiplicidade (phones -> phones_json, emails -> emails_json, bank_accounts -> bank_accounts_json),
    mantendo compatibilidade retroativa com as colunas primárias (phone, email, bank_details).
    """
    out = dict(data)

    # 1. Filiação
    mother = (out.get("mother_name") or "").strip()
    father = (out.get("father_name") or "").strip()
    filiation = (out.get("filiation") or "").strip()
    if not filiation and (mother or father):
        if mother and father:
            out["filiation"] = f"Mãe: {mother} | Pai: {father}"
        else:
            out["filiation"] = mother or father

    # 2. Múltiplos Telefones
    raw_phones = out.pop("phones", None)
    if raw_phones is not None:
        cleaned_phones = []
        for idx, p in enumerate(raw_phones):
            p_dict = p.model_dump() if hasattr(p, "model_dump") else dict(p)
            num = (p_dict.get("number") or "").strip()
            if not num:
                continue
            cleaned_phones.append({
                "number": num,
                "type": (p_dict.get("type") or "PROPRIO").strip().upper(),
                "label": (p_dict.get("label") or "").strip() or None,
                "is_whatsapp": bool(p_dict.get("is_whatsapp", True)),
                "is_primary": bool(p_dict.get("is_primary", idx == 0)),
            })
        out["phones_json"] = json.dumps(cleaned_phones, ensure_ascii=False)
        if cleaned_phones and not out.get("phone"):
            primary_p = next((x for x in cleaned_phones if x.get("is_primary")), cleaned_phones[0])
            out["phone"] = sanitize_whatsapp_number(primary_p["number"])
    elif out.get("phone") and (existing_obj is None or not getattr(existing_obj, "phones_json", None) or getattr(existing_obj, "phones_json", "[]") == "[]"):
        out["phones_json"] = json.dumps([{
            "number": out["phone"],
            "type": "PROPRIO",
            "label": "Telefone Principal",
            "is_whatsapp": True,
            "is_primary": True,
        }], ensure_ascii=False)

    # 3. Múltiplos E-mails
    raw_emails = out.pop("emails", None)
    if raw_emails is not None:
        cleaned_emails = []
        for idx, em in enumerate(raw_emails):
            e_dict = em.model_dump() if hasattr(em, "model_dump") else dict(em)
            addr = (e_dict.get("email") or "").strip()
            if not addr:
                continue
            cleaned_emails.append({
                "email": addr,
                "type": (e_dict.get("type") or "PRINCIPAL").strip().upper(),
                "label": (e_dict.get("label") or "").strip() or None,
                "is_primary": bool(e_dict.get("is_primary", idx == 0)),
            })
        out["emails_json"] = json.dumps(cleaned_emails, ensure_ascii=False)
        if cleaned_emails and not out.get("email"):
            primary_e = next((x for x in cleaned_emails if x.get("is_primary")), cleaned_emails[0])
            out["email"] = primary_e["email"]
    elif out.get("email") and (existing_obj is None or not getattr(existing_obj, "emails_json", None) or getattr(existing_obj, "emails_json", "[]") == "[]"):
        out["emails_json"] = json.dumps([{
            "email": out["email"],
            "type": "PRINCIPAL",
            "label": "E-mail Principal",
            "is_primary": True,
        }], ensure_ascii=False)

    # 4. Dados Bancários Estruturados & Múltiplas Contas Bancárias
    if out.get("bank_code") and not out.get("bank_name"):
        c_code = str(out["bank_code"]).strip().zfill(3)
        if c_code in COMPE_BANK_NAMES:
            out["bank_name"] = COMPE_BANK_NAMES[c_code]

    raw_banks = out.pop("bank_accounts", None)
    if raw_banks is not None:
        cleaned_banks = []
        for idx, b in enumerate(raw_banks):
            b_dict = b.model_dump() if hasattr(b, "model_dump") else dict(b)
            b_code = (b_dict.get("bank_code") or "").strip()
            b_name = (b_dict.get("bank_name") or "").strip()
            if b_code and not b_name:
                b_name = COMPE_BANK_NAMES.get(b_code.zfill(3), "")
            b_ag = (b_dict.get("agency") or "").strip()
            b_acc = (b_dict.get("account") or "").strip()
            b_pix = (b_dict.get("pix_key") or "").strip()
            if not any([b_code, b_name, b_ag, b_acc, b_pix]):
                continue
            cleaned_banks.append({
                "bank_code": b_code or None,
                "bank_name": b_name or None,
                "agency": b_ag or None,
                "account": b_acc or None,
                "account_type": (b_dict.get("account_type") or "CONTA_CORRENTE").strip().upper(),
                "pix_key_type": (b_dict.get("pix_key_type") or "").strip() or None,
                "pix_key": b_pix or None,
                "holder_name": (b_dict.get("holder_name") or "").strip() or None,
                "is_primary": bool(b_dict.get("is_primary", idx == 0)),
            })
        out["bank_accounts_json"] = json.dumps(cleaned_banks, ensure_ascii=False)
        if cleaned_banks:
            primary_b = next((x for x in cleaned_banks if x.get("is_primary")), cleaned_banks[0])
            out["bank_code"] = out.get("bank_code") or primary_b.get("bank_code")
            out["bank_name"] = out.get("bank_name") or primary_b.get("bank_name")
            out["bank_agency"] = out.get("bank_agency") or primary_b.get("agency")
            out["bank_account"] = out.get("bank_account") or primary_b.get("account")
            out["bank_account_type"] = out.get("bank_account_type") or primary_b.get("account_type")
            out["pix_key_type"] = out.get("pix_key_type") or primary_b.get("pix_key_type")
            out["pix_key"] = out.get("pix_key") or primary_b.get("pix_key")
            if not out.get("bank_details"):
                summaries = [_format_single_bank_summary(x) for x in cleaned_banks if _format_single_bank_summary(x)]
                if summaries:
                    out["bank_details"] = " ; ".join(summaries)
    elif any(out.get(k) for k in ("bank_code", "bank_name", "bank_agency", "bank_account", "pix_key")):
        single_b = {
            "bank_code": out.get("bank_code"),
            "bank_name": out.get("bank_name"),
            "agency": out.get("bank_agency"),
            "account": out.get("bank_account"),
            "account_type": out.get("bank_account_type") or "CONTA_CORRENTE",
            "pix_key_type": out.get("pix_key_type"),
            "pix_key": out.get("pix_key"),
            "holder_name": out.get("name"),
            "is_primary": True,
        }
        if existing_obj is None or not getattr(existing_obj, "bank_accounts_json", None) or getattr(existing_obj, "bank_accounts_json", "[]") == "[]":
            out["bank_accounts_json"] = json.dumps([single_b], ensure_ascii=False)
        if not out.get("bank_details"):
            summary = _format_single_bank_summary(single_b)
            if summary:
                out["bank_details"] = summary

    return out
from pydantic import BaseModel, EmailStr, field_validator
import re

class CRMContactBase(BaseModel):
    category:     ContactCategory
    name:         str
    document:     Optional[str] = None
    email:        Optional[EmailStr] = None
    phone:        Optional[str] = None
    bank_details: Optional[str] = None
    notes:        Optional[str] = None
    is_active:    bool = True

    @field_validator("category", mode="before")
    @classmethod
    def _category_alias(cls, v):
        # Alias do frontend: COOPERADO == PARTNER (sócio/cooperado)
        return "PARTNER" if isinstance(v, str) and v.upper() == "COOPERADO" else v

    @field_validator("email", "document", "phone", "bank_details", "notes", "birth_date", "identity_number", "identity_issuer", "filiation", "mother_name", "father_name", "bank_code", "bank_name", "bank_agency", "bank_account", "bank_account_type", "pix_key_type", "pix_key", mode="before")
    @classmethod
    def _empty_to_none(cls, v):
        return None if isinstance(v, str) and not v.strip() else v

    # ---- B2B2C Corporate/Entity Extensions ----
    person_type:            Optional[str] = None
    birth_date:             Optional[str] = None
    identity_number:        Optional[str] = None
    identity_issuer:        Optional[str] = None
    filiation:              Optional[str] = None
    mother_name:            Optional[str] = None
    father_name:            Optional[str] = None
    municipal_registration: Optional[str] = None
    state_registration:     Optional[str] = None
    website:                Optional[str] = None
    contact_person:         Optional[str] = None
    nis:                    Optional[str] = None
    correios_matricula:     Optional[str] = None

    # Address fields (spec §2.2)
    address:      Optional[str] = None
    street:                 Optional[str] = None
    number:                 Optional[str] = None
    complement:             Optional[str] = None
    neighborhood:           Optional[str] = None
    city:         Optional[str] = None
    state:        Optional[str] = None
    zip_code:     Optional[str] = None

    # Banking / Liquidation fields
    bank_code:              Optional[str] = None
    bank_name:              Optional[str] = None
    bank_agency:            Optional[str] = None
    bank_account:           Optional[str] = None
    bank_account_type:      Optional[str] = None
    pix_key_type:           Optional[str] = None
    pix_key:                Optional[str] = None

    # Multiplicidade de Dados por Cadastro
    phones:                 Optional[List[ContactPhoneEntry]] = None
    emails:                 Optional[List[ContactEmailEntry]] = None
    bank_accounts:          Optional[List[ContactBankAccountEntry]] = None
    bank_agency:            Optional[str] = None
    bank_account:           Optional[str] = None
    pix_key_type:           Optional[str] = None
    pix_key:                Optional[str] = None

    # HR fields (spec §2.3 — relevant for EMPLOYEE)
    role_title:          Optional[str]      = None
    admission_date:      Optional[datetime] = None
    vacation_start_date: Optional[datetime] = None

    # OrBrick AI Attendance & LGPD Consent Flags
    ai_attendance_enabled: Optional[bool] = True
    ai_handoff_until:      Optional[datetime] = None
    opt_in_marketing:      Optional[bool] = True

    @field_validator('phone', mode='before')
    @classmethod
    def sanitize_whatsapp(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return v
        nums = re.sub(r'\D', '', v)
        
        # 1. Se chegou limpo como DDD + Num (Ex: 51984743957 - 11 digitos) ou Fixo (10 digitos)
        if len(nums) in [10, 11] and not nums.startswith('55'):
            nums = '55' + nums
            
        # 2. Se for 13 digitos no padrão Orbe/Baileys com '55' no início e '9' extra
        # Regra do 9º Dígito: Removemos a 5º casa (que é o 9) para forçar o padrao 12-chars de API
        if len(nums) == 13 and nums.startswith('55') and nums[4] == '9':
            return nums[:4] + nums[5:]
            
        return nums


class CRMContactCreate(CRMContactBase):
    pass


class CRMContactUpdate(BaseModel):
    birth_date:   Optional[str] = None
    identity_number: Optional[str] = None
    identity_issuer: Optional[str] = None
    filiation:    Optional[str] = None
    mother_name:  Optional[str] = None
    father_name:  Optional[str] = None
    person_type:  Optional[str] = None
    nis:          Optional[str] = None
    correios_matricula: Optional[str] = None
    municipal_registration: Optional[str] = None
    state_registration: Optional[str] = None
    website:      Optional[str] = None
    contact_person: Optional[str] = None
    street:       Optional[str] = None
    number:       Optional[str] = None
    complement:   Optional[str] = None
    neighborhood: Optional[str] = None
    bank_code:         Optional[str] = None
    bank_name:         Optional[str] = None
    bank_agency:       Optional[str] = None
    bank_account:      Optional[str] = None
    bank_account_type: Optional[str] = None
    pix_key_type:      Optional[str] = None
    pix_key:           Optional[str] = None
    phones:            Optional[List[ContactPhoneEntry]] = None
    emails:            Optional[List[ContactEmailEntry]] = None
    bank_accounts:     Optional[List[ContactBankAccountEntry]] = None

    @field_validator("category", mode="before")
    @classmethod
    def _upd_category_alias(cls, v):
        return "PARTNER" if isinstance(v, str) and v.upper() == "COOPERADO" else v

    @field_validator("email", "document", "phone", "bank_details", "notes", "birth_date", "identity_number", "identity_issuer", "filiation", "mother_name", "father_name", "bank_code", "bank_name", "bank_agency", "bank_account", "bank_account_type", "pix_key_type", "pix_key", mode="before")
    @classmethod
    def _upd_empty_to_none(cls, v):
        return None if isinstance(v, str) and not v.strip() else v

    @field_validator("phone", mode="before")
    @classmethod
    def _upd_sanitize_whatsapp(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_whatsapp_number(v) if v else v
    category:     Optional[ContactCategory] = None
    name:         Optional[str] = None
    document:     Optional[str] = None
    email:        Optional[EmailStr] = None
    phone:        Optional[str] = None
    bank_details: Optional[str] = None
    notes:        Optional[str] = None
    is_active:    Optional[bool] = None
    address:      Optional[str] = None
    city:         Optional[str] = None
    state:        Optional[str] = None
    zip_code:     Optional[str] = None
    role_title:          Optional[str]      = None
    admission_date:      Optional[datetime] = None
    vacation_start_date: Optional[datetime] = None

    # OrBrick AI Attendance & LGPD Consent Flags
    ai_attendance_enabled: Optional[bool] = True
    ai_handoff_until:      Optional[datetime] = None
    opt_in_marketing:      Optional[bool] = True


class CRMContactOut(CRMContactBase):
    id:          UUID
    business_id: UUID
    created_at:  datetime
    updated_at:  datetime

    class Config:
        from_attributes = True


# ── Accounts Payable ──────────────────────────────────────────────
class AccountPayableBase(BaseModel):
    supplier_id:      Optional[UUID]     = None
    category_id:      Optional[UUID]     = None
    description:      str
    amount:           float
    due_date:         datetime
    data_competencia: Optional[datetime] = None  # dupla datação (spec §8)
    paid_date:        Optional[datetime] = None
    status:           PayableStatus      = PayableStatus.PENDING
    is_reimbursable:  bool               = False
    payment_account:  Optional[str]      = None
    project_id:       Optional[str]      = None


class AccountPayableCreate(AccountPayableBase):
    pass


class AccountPayableUpdate(BaseModel):
    supplier_id:      Optional[UUID]     = None
    category_id:      Optional[UUID]     = None
    description:      Optional[str]      = None
    amount:           Optional[float]    = None
    due_date:         Optional[datetime] = None
    data_competencia: Optional[datetime] = None
    paid_date:        Optional[datetime] = None
    status:           Optional[PayableStatus] = None
    is_reimbursable:  Optional[bool]     = None
    payment_account:  Optional[str]      = None
    project_id:       Optional[str]      = None


class AccountPayableOut(AccountPayableBase):
    id:          UUID
    business_id: UUID
    created_at:  datetime
    updated_at:  datetime

    class Config:
        from_attributes = True


# ── Account Categories (Plano de Contas) ─────────────────────────
class AccountCategoryCreate(BaseModel):
    parent_id: Optional[UUID]       = None
    name:      str
    type:      AccountCategoryType
    is_active: bool                 = True


class AccountCategoryUpdate(BaseModel):
    parent_id: Optional[UUID]            = None
    name:      Optional[str]             = None
    type:      Optional[AccountCategoryType] = None
    is_active: Optional[bool]            = None


class AccountCategoryOut(BaseModel):
    id:          UUID
    business_id: UUID
    parent_id:   Optional[UUID]
    name:        str
    type:        AccountCategoryType
    is_active:   bool
    created_at:  datetime

    class Config:
        from_attributes = True


# ── Entity Notes (Anotações Auditadas) ─────────────────────────────
class EntityNoteCreate(BaseModel):
    entity_type: str   # 'crm_contact' | 'cooperado' | 'billing_invoice' | 'account_payable'
    entity_id:   str
    content:     str


class EntityNoteOut(BaseModel):
    id:          UUID
    business_id: UUID
    entity_type: str
    entity_id:   str
    content:     str
    author_id:   str
    author_name: str
    created_at:  datetime

    class Config:
        from_attributes = True


# ── Entity Files ────────────────────────────────────────────────────
class EntityFileCreate(BaseModel):
    entity_type:   str
    entity_id:     str
    filename:      str
    file_url:      str
    file_category: Optional[str] = None
    file_size:     Optional[int] = None


class EntityFileOut(BaseModel):
    id:            UUID
    business_id:   UUID
    entity_type:   str
    entity_id:     str
    filename:      str
    file_url:      str
    file_category: Optional[str]
    file_size:     Optional[int]
    uploaded_by:   Optional[str]
    created_at:    datetime

    class Config:
        from_attributes = True


# ── Recurrences (Mensalidades / Assinaturas) ────────────────────────
class RecurrenceCreate(BaseModel):
    crm_contact_id: Optional[UUID]             = None
    cooperado_id:   Optional[UUID]             = None
    category_id:    Optional[UUID]             = None
    description:    str
    amount:         float
    frequency:      RecurrenceFrequency        = RecurrenceFrequency.MONTHLY
    first_due_date: datetime
    parcel_total:   Optional[int]              = None
    payment_method: PaymentMethod              = PaymentMethod.PIX


class RecurrenceUpdate(BaseModel):
    description:    Optional[str]              = None
    amount:         Optional[float]            = None
    frequency:      Optional[RecurrenceFrequency] = None
    parcel_total:   Optional[int]              = None
    status:         Optional[RecurrenceStatus] = None
    payment_method: Optional[PaymentMethod]    = None


class RecurrenceOut(BaseModel):
    id:              UUID
    business_id:     UUID
    crm_contact_id:  Optional[UUID]
    cooperado_id:    Optional[UUID]
    category_id:     Optional[UUID]
    description:     str
    amount:          float
    frequency:       RecurrenceFrequency
    first_due_date:  datetime
    next_due_date:   Optional[datetime]
    parcel_total:    Optional[int]
    parcel_current:  int
    status:          RecurrenceStatus
    payment_method:  PaymentMethod
    created_at:      datetime
    updated_at:      datetime

    class Config:
        from_attributes = True


# ── CRM Deals (Funil Kanban) ──────────────────────────────────────
from models.models import DealStage, DealStatus

class CRMDealBase(BaseModel):
    contact_id:  Optional[UUID] = None
    title:       str
    value:       float = 0.0
    stage:       DealStage = DealStage.PROSPECTING
    status:      DealStatus = DealStatus.ACTIVE
    loss_reason: Optional[str] = None

class CRMDealCreate(CRMDealBase):
    pass

class CRMDealUpdate(BaseModel):
    contact_id:  Optional[UUID] = None
    title:       Optional[str] = None
    value:       Optional[float] = None
    stage:       Optional[DealStage] = None
    status:      Optional[DealStatus] = None
    loss_reason: Optional[str] = None

class CRMDealOut(CRMDealBase):
    id:          UUID
    business_id: UUID
    created_at:  datetime
    updated_at:  datetime

    class Config:
        from_attributes = True



# ── CBM (Consumer Behavior Management) Schemas ────────────────────
class CBMCustomerProfileOut(BaseModel):
    id:                           UUID
    business_id:                  UUID
    contact_id:                   UUID
    contact_name:                 Optional[str] = None
    contact_phone:                Optional[str] = None
    contact_email:                Optional[str] = None
    contact_category:             Optional[str] = None
    ai_attendance_enabled:        bool = True
    ai_handoff_until:             Optional[datetime] = None
    rfm_recency_days:             int = 0
    rfm_frequency_score:          float = 0.0
    rfm_monetary_total:           float = 0.0
    churn_risk_score:             float = 0.0
    churn_risk_level:             str = "LOW"
    seasonality_cluster:          Optional[str] = "RECORRENTE_MENSAL"
    ai_recommended_offer:         Optional[str] = None
    predicted_next_purchase_date: Optional[datetime] = None
    opt_in_campaigns:             bool = True
    updated_at:                   datetime

    class Config:
        from_attributes = True


class CBMCampaignCreate(BaseModel):
    name:               str
    trigger_type:       str = "CHURN_ALERT"  # CHURN_ALERT, INACTIVITY_30D, SEASONAL, BILLING_D3
    channels:           List[str] = ["WHATSAPP", "EMAIL"]
    ai_prompt_template: Optional[str] = None
    is_active:          bool = True
    auto_dispatch:      bool = False


class CBMCampaignOut(BaseModel):
    id:                 UUID
    business_id:        UUID
    name:               str
    trigger_type:       str
    channels:           List[str]
    ai_prompt_template: Optional[str] = None
    is_active:          bool
    dispatched_count:   int = 0
    last_dispatched_at: Optional[datetime] = None
    created_at:         datetime
    updated_at:         datetime
