from sqlalchemy import cast, String
import uuid
from datetime import datetime, timezone, timedelta
from dateutil.relativedelta import relativedelta
from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, cast, String

from db.session import get_db
from models.models import User, Business, Recurrence
from core.deps import get_current_user
from schemas.billing_schemas import RecurrenceCreate, RecurrenceOut
from routers.billing import _get_user_business

router = APIRouter()

@router.post("/", response_model=RecurrenceOut)
async def create_recurrence(
    payload: RecurrenceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    business = await _get_user_business(db, current_user)
    
    recurrence = Recurrence(
        business_id=business.id,
        category_id=payload.category_id,
        crm_contact_id=payload.crm_contact_id,
        cooperado_id=payload.cooperado_id,
        description=payload.description,
        amount=payload.amount,
        frequency=payload.frequency,
        first_due_date=payload.first_due_date,
        next_due_date=payload.first_due_date,
        parcel_total=payload.parcel_total,
        parcel_current=1,
        status="ACTIVE",
        payment_method=payload.payment_method
    )
    
    db.add(recurrence)
    await db.commit()
    await db.refresh(recurrence)
    return recurrence

@router.get("/", response_model=List[RecurrenceOut])
async def list_recurrences(
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    business = await _get_user_business(db, current_user)
    
    stmt = select(Recurrence).where(Recurrence.business_id == business.id)
    if status:
        stmt = stmt.where(Recurrence.status == status)
        
    result = await db.execute(stmt)
    return result.scalars().all()

@router.get("/{id}", response_model=RecurrenceOut)
async def get_recurrence(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    business = await _get_user_business(db, current_user)
    
    result = await db.execute(
        select(Recurrence).where(Recurrence.id == id, Recurrence.business_id == business.id)
    )
    recurrence = result.scalar_one_or_none()
    
    if not recurrence:
        raise HTTPException(status_code=404, detail="Recorrência não encontrada")
        
    return recurrence

@router.post("/{id}/pause", response_model=RecurrenceOut)
async def pause_recurrence(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    recurrence = await get_recurrence(id, db, current_user)
    recurrence.status = "PAUSED"
    await db.commit()
    await db.refresh(recurrence)
    return recurrence

@router.post("/{id}/resume", response_model=RecurrenceOut)
async def resume_recurrence(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    recurrence = await get_recurrence(id, db, current_user)
    recurrence.status = "ACTIVE"
    await db.commit()
    await db.refresh(recurrence)
    return recurrence

@router.delete("/{id}")
async def delete_recurrence(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    recurrence = await get_recurrence(id, db, current_user)
    recurrence.status = "CANCELLED"
    await db.commit()
    return {"message": "Recorrência cancelada com sucesso"}

@router.get("/{id}/projection")
async def recurrence_projection(
    id: uuid.UUID,
    cycles: int = Query(5, ge=1, le=24),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    recurrence = await get_recurrence(id, db, current_user)
    
    projection = []
    current_date = recurrence.next_due_date if recurrence.next_due_date else recurrence.first_due_date
    current_parcel = recurrence.parcel_current
    
    for _ in range(cycles):
        if recurrence.parcel_total and current_parcel > recurrence.parcel_total:
            break
            
        projection.append({
            "parcel": current_parcel,
            "due_date": current_date,
            "amount": recurrence.amount
        })
        
        if recurrence.frequency == "MONTHLY":
            current_date += relativedelta(months=1)
        elif recurrence.frequency == "WEEKLY":
            current_date += timedelta(weeks=1)
        elif recurrence.frequency == "DAILY":
            current_date += timedelta(days=1)
        elif recurrence.frequency == "ANNUAL":
            current_date += relativedelta(years=1)
            
        current_parcel += 1
        
    return {"projection": projection}
