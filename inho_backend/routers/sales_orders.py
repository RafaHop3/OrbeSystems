"""
INHO – Sales Orders Router (Faturamento Integrado)
"""
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy import select, cast, String
from sqlalchemy.ext.asyncio import AsyncSession

from core.deps import get_current_user
from db.session import get_db
from models.models import (
    SalesOrder, SalesOrderStatus, User, AuditAction, BusinessOperator
)
from schemas.schemas import SalesOrderCreate, SalesOrderOut
from services.audit import write_audit
from services.nfe_provider import issue_nfe_mock
from routers.billing import _get_user_business

router = APIRouter(prefix="/sales-orders", tags=["SalesOrders"])


@router.post("/", response_model=SalesOrderOut, status_code=status.HTTP_201_CREATED)
async def create_sales_order(
    request: Request,
    body: SalesOrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    business = await _get_user_business(db, current_user)
        
    order = SalesOrder(**body.model_dump(), business_id=business.id, status=SalesOrderStatus.DRAFT)
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
    business = await _get_user_business(db, current_user)

    query = select(SalesOrder).where(SalesOrder.business_id == business.id)
    if status:
        query = query.where(SalesOrder.status == status)
    result = await db.execute(query.order_by(SalesOrder.created_at.desc()))
    return result.scalars().all()


@router.get("/{order_id}", response_model=SalesOrderOut)
async def get_sales_order(
    order_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    business = await _get_user_business(db, current_user)

    result = await db.execute(select(SalesOrder).where(SalesOrder.id == order_id, SalesOrder.business_id == business.id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    return order


@router.post("/{order_id}/confirm", response_model=SalesOrderOut)
async def confirm_sales_order(
    request: Request,
    order_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Confirma o pedido."""
    business = await _get_user_business(db, current_user)

    result = await db.execute(select(SalesOrder).where(SalesOrder.id == order_id, SalesOrder.business_id == business.id))
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
    order_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Emite a NF-e / NFS-e para o pedido/proposta confirmado e gera automaticamente
    o título em Contas a Receber (BillingInvoice) com PIX autenticado via MultiFernet,
    conectando Propostas -> Pedidos -> Recebíveis -> Fluxo de Caixa & DRE em 1 clique.
    """
    import os
    import uuid
    import urllib.parse
    from sqlalchemy import text
    from models.models import BillingInvoice, BillingStatus, PaymentMethod, InvoiceType
    from routers.billing import _generate_authenticated_pix_code
    from routers.crm import get_uuid

    business = await _get_user_business(db, current_user)
    b_id = get_uuid(business.id)
    o_id = get_uuid(order_id)
    is_sqlite = os.environ.get("DATABASE_URL", "").startswith("sqlite")

    try:
        if not is_sqlite:
            await db.execute(text("SET LOCAL lock_timeout = '5s'"))

        stmt = select(SalesOrder).where(SalesOrder.id == o_id, SalesOrder.business_id == b_id)
        if not is_sqlite:
            stmt = stmt.with_for_update()
        result = await db.execute(stmt)
        order = result.scalar_one_or_none()
        if not order:
            raise HTTPException(status_code=404, detail="Pedido não encontrado")
        if order.status == SalesOrderStatus.INVOICED:
            return order
        if order.status != SalesOrderStatus.CONFIRMED:
            raise HTTPException(status_code=400, detail="Apenas pedidos Confirmados podem ser faturados")

        nfe_data = issue_nfe_mock(order)
        order.invoice_number = nfe_data["invoice_number"]
        order.nfe_key        = nfe_data["nfe_key"]
        order.nfe_status     = nfe_data["status"]
        order.status         = SalesOrderStatus.INVOICED

        # Verifica se já existe cobrança vinculada a este pedido (idempotência de estado)
        tag = f"[PEDIDO #{str(order.id)[:8].upper()}]"
        existing_inv = (
            await db.execute(
                select(BillingInvoice).where(
                    BillingInvoice.business_id == b_id,
                    BillingInvoice.description.ilike(f"%{tag}%"),
                )
            )
        ).scalars().first()

        created_invoice_id = None
        if not existing_inv:
            inv_id = uuid.uuid4()
            pix_code, _ = await _generate_authenticated_pix_code(
                db, b_id, inv_id, order.amount, order.customer_name
            )
            pix_qr_url = f"https://api.qrserver.com/v1/create-qr-code/?size=250x250&data={urllib.parse.quote(pix_code)}"
            inv = BillingInvoice(
                id=inv_id,
                business_id=b_id,
                invoice_type=InvoiceType.OUTROS,
                customer_name=order.customer_name,
                customer_doc=order.customer_doc,
                amount=order.amount,
                due_date=order.due_date,
                data_competencia=order.issue_date or order.due_date,
                status=BillingStatus.PENDING,
                pix_code=pix_code,
                pix_qr_url=pix_qr_url,
                payment_method=PaymentMethod.PIX,
                description=f"[NF-e {nfe_data['invoice_number']}] {order.description or 'Faturamento Comercial'} {tag}",
                created_by_id=current_user.id,
                created_by_name=f"{current_user.full_name} ({current_user.role_label})",
                updated_by_id=current_user.id,
                updated_by_name=f"{current_user.full_name} ({current_user.role_label})",
            )
            db.add(inv)
            created_invoice_id = str(inv_id)

        await write_audit(
            db, AuditAction.UPDATE, "SalesOrder",
            user_id=current_user.id,
            user_name=current_user.full_name,
            user_role=current_user.role_label,
            business_id=b_id,
            entity_id=str(order_id),
            detail={"nfe_key": nfe_data["nfe_key"], "billing_invoice_id": created_invoice_id},
            request=request,
        )
        await db.commit()
        await db.refresh(order)
        return order
    except HTTPException:
        raise
    except Exception as exc:
        await db.rollback()
        err_msg = str(exc).lower()
        if "55p03" in err_msg or "lock timeout" in err_msg or "locknotavailable" in err_msg:
            raise HTTPException(
                status_code=409,
                detail="Este pedido está sendo faturado concorrentemente por outro operador. Tente novamente.",
            )
        raise


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_sales_order(
    request: Request,
    order_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    business = await _get_user_business(db, current_user)

    result = await db.execute(select(SalesOrder).where(SalesOrder.id == order_id, SalesOrder.business_id == business.id))
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
