"""
INHO – PDV Router (Frente de Caixa)
"""
import io
import csv
from typing import List
from uuid import UUID
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from core.deps import get_current_user
from db.session import get_db
from models.models import (
    CashRegister, CashRegisterStatus, PDVSale, User,
    AuditAction
)
from schemas.schemas import OpenRegisterRequest, PDVSaleCreate, PDVSaleOut, CashRegisterOut
from services.audit import write_audit

router = APIRouter(prefix="/pdv", tags=["PDV"])


@router.post("/open", response_model=CashRegisterOut, status_code=status.HTTP_201_CREATED)
async def open_register(
    request: Request,
    body: OpenRegisterRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verifica se já existe caixa aberto
    existing = await db.execute(
        select(CashRegister).where(
            CashRegister.operator_id == current_user.id,
            CashRegister.status == CashRegisterStatus.OPEN
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Já existe um caixa aberto para este operador")

    register = CashRegister(
        operator_id=current_user.id,
        opening_balance=body.opening_balance,
        status=CashRegisterStatus.OPEN,
    )
    db.add(register)
    await db.flush()
    await write_audit(
        db, AuditAction.CREATE, "CashRegister",
        user_id=current_user.id, entity_id=str(register.id),
        detail={"opening_balance": float(body.opening_balance)},
        request=request
    )
    await db.commit()
    await db.refresh(register)
    return register


@router.get("/session", response_model=CashRegisterOut)
async def get_open_session(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(CashRegister).where(
            CashRegister.operator_id == current_user.id,
            CashRegister.status == CashRegisterStatus.OPEN
        )
    )
    register = result.scalar_one_or_none()
    if not register:
        raise HTTPException(status_code=404, detail="Nenhum caixa aberto encontrado")
    return register


@router.post("/sale", response_model=PDVSaleOut, status_code=status.HTTP_201_CREATED)
async def register_sale(
    request: Request,
    register_id: UUID,
    body: PDVSaleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reg_result = await db.execute(
        select(CashRegister).where(
            CashRegister.id == register_id,
            CashRegister.status == CashRegisterStatus.OPEN
        )
    )
    register = reg_result.scalar_one_or_none()
    if not register:
        raise HTTPException(status_code=404, detail="Caixa não encontrado ou já fechado")

    sale = PDVSale(
        cash_register_id=register_id,
        customer_name=body.customer_name,
        total_amount=body.total_amount,
        payment_method=body.payment_method,
        description=body.description,
    )
    db.add(sale)
    await db.flush()
    await write_audit(
        db, AuditAction.CREATE, "PDVSale",
        user_id=current_user.id, entity_id=str(sale.id),
        detail={"amount": float(body.total_amount), "method": body.payment_method.value},
        request=request
    )
    await db.commit()
    await db.refresh(sale)
    return sale


@router.get("/sales", response_model=List[PDVSaleOut])
async def list_sales(
    register_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(PDVSale).where(PDVSale.cash_register_id == register_id)
        .order_by(PDVSale.created_at.desc())
    )
    return result.scalars().all()


@router.post("/close", response_model=CashRegisterOut)
async def close_register(
    request: Request,
    register_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reg_result = await db.execute(
        select(CashRegister).where(
            CashRegister.id == register_id,
            CashRegister.status == CashRegisterStatus.OPEN
        )
    )
    register = reg_result.scalar_one_or_none()
    if not register:
        raise HTTPException(status_code=404, detail="Caixa não encontrado ou já fechado")

    # Calcula o total vendido no caixa
    total_result = await db.execute(
        select(func.sum(PDVSale.total_amount)).where(PDVSale.cash_register_id == register_id)
    )
    total_sales = total_result.scalar() or 0

    register.closing_balance = register.opening_balance + total_sales
    register.status = CashRegisterStatus.CLOSED
    register.closed_at = datetime.now(timezone.utc)

    await write_audit(
        db, AuditAction.UPDATE, "CashRegister",
        user_id=current_user.id, entity_id=str(register_id),
        detail={"closing_balance": float(register.closing_balance), "total_sales": float(total_sales)},
        request=request
    )
    await db.commit()
    await db.refresh(register)
    return register


@router.get("/report/{register_id}")
async def get_register_report(
    register_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reg_result = await db.execute(select(CashRegister).where(CashRegister.id == register_id))
    register = reg_result.scalar_one_or_none()
    if not register:
        raise HTTPException(status_code=404, detail="Caixa não encontrado")

    sales_result = await db.execute(
        select(PDVSale).where(PDVSale.cash_register_id == register_id).order_by(PDVSale.created_at)
    )
    sales = sales_result.scalars().all()

    stream = io.StringIO()
    writer = csv.writer(stream)
    writer.writerow(["ID", "Data", "Cliente", "Valor", "Forma de Pagamento", "Descrição"])
    for s in sales:
        writer.writerow([
            str(s.id),
            s.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            s.customer_name or "",
            str(s.total_amount),
            s.payment_method.value,
            s.description or "",
        ])
    writer.writerow([])
    writer.writerow(["Saldo Abertura", str(register.opening_balance)])
    writer.writerow(["Total Vendido", str(sum(s.total_amount for s in sales))])
    writer.writerow(["Saldo Fechamento", str(register.closing_balance or "")])

    stream.seek(0)
    filename = f"caixa_{str(register_id)[:8]}.csv"
    return StreamingResponse(
        iter([stream.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
