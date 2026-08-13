"""
INHO – Sales Orders Router (Faturamento Integrado)
"""
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.deps import get_current_user
from db.session import get_db
from models.models import (
    SalesOrder, SalesOrderStatus, User, AuditAction
)
from schemas.schemas import SalesOrderCreate, SalesOrderOut
from services.audit import write_audit
from services.nfe_provider import issue_nfe_mock

router = APIRouter(prefix="/sales-orders", tags=["SalesOrders"])


@router.post("/", response_model=SalesOrderOut, status_code=status.HTTP_201_CREATED)
async def create_sales_order(
    request: Request,
    body: SalesOrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order = SalesOrder(**body.model_dump(), status=SalesOrderStatus.DRAFT)
    db.add(order)
    await db.flush()
    await write_audit(
        db, AuditAction.CREATE, "SalesOrder",
        user_id=current_user.id, entity_id=str(order.id),
        detail={"customer": body.customer_name, "amount": float(body.amount)},
        request=request
    )
    await db.commit()
    await db.refresh(order)
    return order


@router.get("/", response_model=List[SalesOrderOut])
async def list_sales_orders(
    status: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(SalesOrder)
    if status:
        query = query.where(SalesOrder.status == status)
    result = await db.execute(query.order_by(SalesOrder.created_at.desc()))
    return result.scalars().all()


@router.get("/{order_id}", response_model=SalesOrderOut)
async def get_sales_order(
    order_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(SalesOrder).where(SalesOrder.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    return order


@router.post("/{order_id}/confirm", response_model=SalesOrderOut)
async def confirm_sales_order(
    request: Request,
    order_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Confirma o pedido."""
    result = await db.execute(select(SalesOrder).where(SalesOrder.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    if order.status != SalesOrderStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Apenas pedidos em Rascunho podem ser confirmados")

    order.status = SalesOrderStatus.CONFIRMED

    await write_audit(
        db, AuditAction.UPDATE, "SalesOrder",
        user_id=current_user.id, entity_id=str(order_id),
        detail={"confirmed": True},
        request=request
    )
    await db.commit()
    await db.refresh(order)
    return order


@router.post("/{order_id}/invoice", response_model=SalesOrderOut)
async def invoice_sales_order(
    request: Request,
    order_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Emite a NF-e (mock na v1) para o pedido confirmado."""
    result = await db.execute(select(SalesOrder).where(SalesOrder.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    if order.status != SalesOrderStatus.CONFIRMED:
        raise HTTPException(status_code=400, detail="Apenas pedidos Confirmados podem ser faturados")

    nfe_data = issue_nfe_mock(order)
    order.invoice_number = nfe_data["invoice_number"]
    order.nfe_key        = nfe_data["nfe_key"]
    order.nfe_status     = nfe_data["status"]
    order.status         = SalesOrderStatus.INVOICED

    await write_audit(
        db, AuditAction.UPDATE, "SalesOrder",
        user_id=current_user.id, entity_id=str(order_id),
        detail={"nfe_key": nfe_data["nfe_key"]}, request=request
    )
    await db.commit()
    await db.refresh(order)
    return order


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_sales_order(
    request: Request,
    order_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(SalesOrder).where(SalesOrder.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    if order.status == SalesOrderStatus.INVOICED:
        raise HTTPException(status_code=400, detail="Pedidos já faturados não podem ser cancelados")
    order.status = SalesOrderStatus.CANCELLED
    await write_audit(
        db, AuditAction.DELETE, "SalesOrder",
        user_id=current_user.id, entity_id=str(order_id),
        request=request
    )
    await db.commit()
