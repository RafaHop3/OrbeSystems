from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from pydantic import BaseModel
import traceback

from db.session import get_db
from models.models import Business, User, UserRole, BusinessCategory
from typing import Optional

router = APIRouter(prefix="/businesses", tags=["Businesses"])

from uuid import UUID
from pydantic import BaseModel, ConfigDict

class BusinessCreate(BaseModel):
    name: str
    cnpj: str | None = None
    category: BusinessCategory = BusinessCategory.OUTROS

class BusinessResponse(BaseModel):
    id: UUID
    name: str
    cnpj: str | None = None
    category: BusinessCategory

    model_config = ConfigDict(from_attributes=True)

# TODO: Replace with dependency that gets current OrbeSystems premium user
async def get_current_user_placeholder(db: AsyncSession = Depends(get_db)):
    # Placeholder mock for user
    users = await db.execute(select(User).limit(1))
    return users.scalar_one_or_none()


@router.post("/", response_model=BusinessResponse)
async def create_business(
    item: BusinessCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_placeholder)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Usuario nao autenticado.")

    # 1. Enforce the limit of 3 businesses per premium user
    count_query = await db.execute(
        select(func.count(Business.id))
        .where(Business.user_id == current_user.id)
    )
    current_count = count_query.scalar() or 0

    if current_count >= 3:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Limite de negócios alcançado. Seu plano permite no máximo 3 repositórios/empresas."
        )

    # 2. Prevent duplication by CNPJ or name if desired
    # (Optional business logic here)

    new_business = Business(
        user_id=current_user.id,
        name=item.name,
        cnpj=item.cnpj,
        category=item.category
    )
    db.add(new_business)
    await db.commit()
    await db.refresh(new_business)

    return new_business

@router.get("/")
async def list_businesses(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_placeholder)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Usuario nao autenticado.")
        
    result = await db.execute(
        select(Business).where(Business.user_id == current_user.id)
    )
    businesses = result.scalars().all()
    return businesses
