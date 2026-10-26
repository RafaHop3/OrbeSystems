from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, cast, String
from pydantic import BaseModel
import traceback

from db.session import get_db
from models.models import Business, User, UserRole, BusinessCategory
from typing import Optional

router = APIRouter(prefix="/businesses", tags=["Businesses"])

from uuid import UUID
from pydantic import BaseModel, ConfigDict, field_validator

class BusinessCreate(BaseModel):
    name: str
    cnpj: str | None = None
    category: BusinessCategory = BusinessCategory.OUTROS

    @field_validator("category", mode="before")
    @classmethod
    def _normalize_category(cls, v):
        if isinstance(v, str):
            return v.strip().upper()
        return v

class BusinessResponse(BaseModel):
    id: UUID | str
    name: str
    cnpj: str | None = None
    category: BusinessCategory
    municipal_registration: str | None = None
    state_registration: str | None = None
    logo_url: str | None = None
    cashflow_horizon_months: int = 6

    model_config = ConfigDict(from_attributes=True)

class BusinessSettingsUpdate(BaseModel):
    name: str | None = None
    municipal_registration: str | None = None
    state_registration: str | None = None
    cashflow_horizon_months: int | None = None

class BusinessLogoUpload(BaseModel):
    logo_url: str

from core.deps import get_current_user

@router.post("/", response_model=BusinessResponse)
async def create_business(
    item: BusinessCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Usuario nao autenticado.")

    # 1. Enforce the limit of 3 businesses per premium user
    count_query = await db.execute(
        select(func.count(Business.id))
        .where(cast(Business.user_id, String) == str(current_user.id))
    )
    current_count = count_query.scalar() or 0

    if current_count >= 3:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Limite de negócios alcançado. Seu plano permite no máximo 3 repositórios/empresas."
        )

    from routers.billing import _BIZ_CACHE
    from models.models import BusinessOperator

    # Se o usuário possui apenas a empresa placeholder auto-gerada ("Empresa de ..."), atualiza-a in-place
    existing_res = await db.execute(
        select(Business).where(cast(Business.user_id, String) == str(current_user.id))
    )
    existing_list = existing_res.scalars().all()
    if (
        len(existing_list) == 1
        and existing_list[0].name.startswith("Empresa de ")
        and not existing_list[0].cnpj
    ):
        placeholder = existing_list[0]
        placeholder.name = item.name
        placeholder.cnpj = item.cnpj
        placeholder.category = item.category
        await db.commit()
        await db.refresh(placeholder)
        _BIZ_CACHE.pop(str(current_user.id), None)
        return placeholder

    new_business = Business(
        user_id=current_user.id,
        name=item.name,
        cnpj=item.cnpj,
        category=item.category
    )
    db.add(new_business)
    await db.flush()

    db.add(BusinessOperator(
        business_id=new_business.id,
        user_id=current_user.id,
    ))
    await db.commit()
    await db.refresh(new_business)
    _BIZ_CACHE.pop(str(current_user.id), None)

    return new_business

@router.get("/", response_model=list[BusinessResponse])
async def list_businesses(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Usuario nao autenticado.")
        
    result = await db.execute(
        select(Business).where(cast(Business.user_id, String) == str(current_user.id))
    )
    businesses = list(result.scalars().all())
    if not businesses:
        from routers.billing import _get_user_business
        biz = await _get_user_business(db, current_user)
        if biz:
            businesses = [biz]
    return businesses

@router.patch("/{id}", response_model=BusinessResponse)
async def update_business_settings(
    id: str,
    payload: BusinessSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Business).where(Business.id == id, cast(Business.user_id, String) == str(current_user.id))
    )
    biz = result.scalar_one_or_none()
    if not biz:
        raise HTTPException(status_code=404, detail="Negócio não encontrado")
        
    for k, v in payload.dict(exclude_unset=True).items():
        setattr(biz, k, v)
        
    await db.commit()
    await db.refresh(biz)
    return biz

@router.post("/{id}/logo", response_model=BusinessResponse)
async def update_business_logo(
    id: str,
    payload: BusinessLogoUpload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Business).where(Business.id == id, cast(Business.user_id, String) == str(current_user.id))
    )
    biz = result.scalar_one_or_none()
    if not biz:
        raise HTTPException(status_code=404, detail="Negócio não encontrado")
        
    biz.logo_url = payload.logo_url
    await db.commit()
    await db.refresh(biz)
    return biz
