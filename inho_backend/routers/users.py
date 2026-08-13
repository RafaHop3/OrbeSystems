"""
INHO – Users Router (RBAC-protected)
"""
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.deps import get_current_user, require_admin
from db.session import get_db
from models.models import AuditAction, User
from schemas.schemas import UserOut, UserUpdate
from services.audit import write_audit

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserOut)
async def get_me(
    current: Annotated[dict, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == current["sub"]))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return user


@router.get("/", response_model=list[UserOut], dependencies=[Depends(require_admin)])
async def list_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return result.scalars().all()


@router.patch("/{user_id}", response_model=UserOut)
async def update_user(
    user_id: UUID,
    body: UserUpdate,
    request: Request,
    current: Annotated[dict, Depends(require_admin)],
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user: User | None = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    changes = body.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(user, field, value)

    await write_audit(
        db, AuditAction.UPDATE, "User",
        user_id=UUID(current["sub"]), entity_id=str(user_id),
        detail=changes, request=request,
    )
    await db.commit()
    await db.refresh(user)
    return user
