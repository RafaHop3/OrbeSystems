"""
INHO – Router: Plano de Contas (AccountCategory)
CRUD hierárquico + seed automático de categorias padrão (spec §5.2)
"""
import uuid as uuid_module
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.deps import get_current_user
from db.session import get_db
from models.models import AccountCategory, AccountCategoryType, User
from routers.billing import _get_user_business
from schemas.crm_schemas import AccountCategoryCreate, AccountCategoryOut, AccountCategoryUpdate

router = APIRouter(prefix="/api/v1/categories", tags=["Plano de Contas"])

# ── Seed padrão (spec §5.2) ───────────────────────────────────────
DEFAULT_CATEGORIES = [
    {"name": "Receitas Operacionais",             "type": AccountCategoryType.REVENUE},
    {"name": "Taxas Administrativas de Cooperados","type": AccountCategoryType.REVENUE},
    {"name": "Custos Diretos",                    "type": AccountCategoryType.COST},
    {"name": "Despesas Operacionais",             "type": AccountCategoryType.EXPENSE},
    {"name": "Juros e Multas Recebidas",          "type": AccountCategoryType.REVENUE},
    {"name": "Juros e Multas Pagas",              "type": AccountCategoryType.EXPENSE},
    {"name": "Transferências entre Contas",       "type": AccountCategoryType.TRANSFER},
    {"name": "Impostos e Taxas",                  "type": AccountCategoryType.TAX},
]


async def _seed_default_categories(db: AsyncSession, business_id: UUID):
    """Cria categorias padrão apenas se não existir nenhuma ainda."""
    existing = await db.execute(
        select(AccountCategory).where(AccountCategory.business_id == business_id).limit(1)
    )
    if existing.scalar_one_or_none():
        return  # já possui categorias

    for cat in DEFAULT_CATEGORIES:
        db.add(AccountCategory(
            id=uuid_module.uuid4(),
            business_id=business_id,
            name=cat["name"],
            type=cat["type"],
        ))
    await db.commit()


# ── CRUD ──────────────────────────────────────────────────────────

@router.get("/", response_model=List[AccountCategoryOut])
async def list_categories(
    cat_type: Optional[AccountCategoryType] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    business = await _get_user_business(db, current_user)
    await _seed_default_categories(db, business.id)

    query = select(AccountCategory).where(
        AccountCategory.business_id == business.id,
        AccountCategory.is_active == True,
    )
    if cat_type:
        query = query.where(AccountCategory.type == cat_type)

    result = await db.execute(query.order_by(AccountCategory.type, AccountCategory.name))
    return result.scalars().all()


@router.post("/", response_model=AccountCategoryOut, status_code=status.HTTP_201_CREATED)
async def create_category(
    payload: AccountCategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    business = await _get_user_business(db, current_user)
    cat = AccountCategory(**payload.model_dump(), business_id=business.id)
    db.add(cat)
    await db.commit()
    await db.refresh(cat)
    return cat


@router.put("/{category_id}", response_model=AccountCategoryOut)
async def update_category(
    category_id: UUID,
    payload: AccountCategoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    business = await _get_user_business(db, current_user)
    result = await db.execute(
        select(AccountCategory).where(
            AccountCategory.id == category_id,
            AccountCategory.business_id == business.id
        )
    )
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(404, "Categoria não encontrada")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(cat, field, value)

    await db.commit()
    await db.refresh(cat)
    return cat


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Soft delete — marca is_active=False para preservar histórico."""
    business = await _get_user_business(db, current_user)
    result = await db.execute(
        select(AccountCategory).where(
            AccountCategory.id == category_id,
            AccountCategory.business_id == business.id
        )
    )
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(404, "Categoria não encontrada")

    cat.is_active = False
    await db.commit()
