"""
INHO – Contracts Router (Gestão de Contratos)
"""
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.deps import get_current_user
from db.session import get_db
from models.models import (
    Contract, ContractStatus, User,
    AuditAction
)
from schemas.schemas import ContractCreate, ContractOut
from services.audit import write_audit

router = APIRouter(prefix="/contracts", tags=["Contracts"])


@router.post("/", response_model=ContractOut, status_code=status.HTTP_201_CREATED)
async def create_contract(
    request: Request,
    body: ContractCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contract = Contract(**body.model_dump())
    db.add(contract)
    await db.flush()
    await write_audit(
        db, AuditAction.CREATE, "Contract",
        user_id=current_user.id, entity_id=str(contract.id),
        detail={"title": body.title}, request=request
    )
    await db.commit()
    await db.refresh(contract)
    return contract


@router.get("/", response_model=List[ContractOut])
async def list_contracts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Contract).order_by(Contract.created_at.desc()))
    return result.scalars().all()


@router.get("/{contract_id}", response_model=ContractOut)
async def get_contract(
    contract_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Contract).where(Contract.id == contract_id))
    contract = result.scalar_one_or_none()
    if not contract:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")
    return contract


@router.post("/{contract_id}/activate", response_model=ContractOut)
async def activate_contract(
    request: Request,
    contract_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Ativa o contrato."""
    result = await db.execute(select(Contract).where(Contract.id == contract_id))
    contract = result.scalar_one_or_none()
    if not contract:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")
    if contract.status == ContractStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Contrato já está ativo")

    contract.status = ContractStatus.ACTIVE

    await write_audit(
        db, AuditAction.UPDATE, "Contract",
        user_id=current_user.id, entity_id=str(contract_id),
        detail={"activated": True},
        request=request
    )
    await db.commit()
    await db.refresh(contract)
    return contract


@router.patch("/{contract_id}/status", response_model=ContractOut)
async def update_contract_status(
    request: Request,
    contract_id: UUID,
    new_status: ContractStatus,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Contract).where(Contract.id == contract_id))
    contract = result.scalar_one_or_none()
    if not contract:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")
    contract.status = new_status
    await write_audit(
        db, AuditAction.UPDATE, "Contract",
        user_id=current_user.id, entity_id=str(contract_id),
        detail={"new_status": new_status}, request=request
    )
    await db.commit()
    await db.refresh(contract)
    return contract
