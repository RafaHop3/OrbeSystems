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
from schemas.schemas import UserOut, UserUpdate, UserCreate
from services.audit import write_audit

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserOut)
async def get_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from models.models import BusinessOperator, UserRole
    
    if current_user.role == UserRole.OPERATOR:
        result = await db.execute(select(BusinessOperator).where(BusinessOperator.user_id == str(current_user.id)))
        biz_op = result.scalar_one_or_none()
        if biz_op:
            current_user.business_id = biz_op.business_id
    
    return current_user


@router.get("/", response_model=list[UserOut], dependencies=[Depends(require_admin)])
async def list_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return result.scalars().all()


@router.post("/", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(
    body: UserCreate,
    request: Request,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    from core.security import hash_password

    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Já existe um usuário cadastrado com este e-mail")

    user = User(
        email=body.email,
        full_name=body.full_name,
        hashed_password=hash_password(body.password),
        role=body.role,
        is_active=body.is_active,
        is_verified=True,
    )
    db.add(user)
    await db.flush()

    from models.models import BusinessOperator, UserRole
    role_val = user.role.value if hasattr(user.role, "value") else str(user.role)
    if role_val == UserRole.OPERATOR and body.business_id:
        biz_op = BusinessOperator(business_id=body.business_id, user_id=user.id)
        db.add(biz_op)
        user.business_id = body.business_id

    await write_audit(
        db, AuditAction.CREATE, "User",
        user_id=current_user.id, entity_id=str(user.id),
        detail={
            "created_user_email": user.email,
            "created_user_name": user.full_name,
            "role": user.role.value if hasattr(user.role, "value") else str(user.role),
            "created_by": current_user.email
        },
        request=request,
    )
    await db.commit()
    await db.refresh(user)
    return user


@router.patch("/{user_id}", response_model=UserOut)
async def update_user(
    user_id: UUID,
    body: UserUpdate,
    request: Request,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user: User | None = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    changes = body.model_dump(exclude_unset=True)
    if "password" in changes and changes["password"]:
        from core.security import hash_password
        changes["hashed_password"] = hash_password(changes.pop("password"))

    for field, value in changes.items():
        setattr(user, field, value)

    await write_audit(
        db, AuditAction.UPDATE, "User",
        user_id=current_user.id, entity_id=str(user_id),
        detail={k: str(v) for k, v in changes.items() if k != "hashed_password"},
        request=request,
    )
    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: UUID,
    request: Request,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Você não pode excluir seu próprio usuário mestre")

    result = await db.execute(select(User).where(User.id == user_id))
    user: User | None = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    email = user.email
    await db.delete(user)

    await write_audit(
        db, AuditAction.DELETE, "User",
        user_id=current_user.id, entity_id=str(user_id),
        detail={"deleted_user_email": email},
        request=request,
    )
    await db.commit()
    return None
