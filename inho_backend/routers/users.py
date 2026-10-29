from sqlalchemy import cast, String
"""
INHO – Users Router (RBAC-protected, Manual 01/02/06 Compliant)
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.deps import get_current_user, require_admin, _USER_CACHE
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
    from routers.billing import _get_user_business
    biz = await _get_user_business(db, current_user)
    if biz:
        current_user.business_id = biz.id
    return current_user


@router.get("/", response_model=list[UserOut])
async def list_users(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    from routers.admin import _is_platform_owner, _tenant
    query = select(User)
    if not _is_platform_owner(current_user):
        _, ids = await _tenant(db, current_user)
        query = query.where(cast(User.id, String).in_(list(ids)))
    result = await db.execute(query.order_by(User.created_at.desc()))
    return result.scalars().all()


@router.post("/", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(
    body: UserCreate,
    request: Request,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    from core.security import hash_password
    from routers.billing import _get_user_business
    from routers.crm import get_uuid
    from models.models import BusinessOperator
    from sqlalchemy.exc import IntegrityError
    from sqlalchemy import func

    role_input = (body.role.value if hasattr(body.role, "value") else str(body.role or "operator")).strip().lower()

    # Determina o target_biz_id do operador/usuário
    target_biz_id = body.business_id
    if not target_biz_id:
        admin_biz = await _get_user_business(db, current_user)
        target_biz_id = admin_biz.id if admin_biz else None
    target_b_uuid = get_uuid(target_biz_id) if target_biz_id else None

    # BUG-04: Tratamento idempotente e prevenção de HTTP 500 por e-mail duplicado
    clean_email = body.email.strip().lower()
    existing_user = (await db.execute(select(User).where(func.lower(User.email) == clean_email))).scalar_one_or_none()

    if existing_user:
        # Verifica se o operador já pertence à mesma organização
        biz_op = (await db.execute(select(BusinessOperator).where(BusinessOperator.user_id == get_uuid(existing_user.id)))).scalar_one_or_none()
        if (biz_op and str(biz_op.business_id) == str(target_b_uuid)) or (target_b_uuid is None):
            if getattr(body, "full_name", None):
                existing_user.full_name_db = body.full_name.strip()
            existing_user.role = role_input
            if body.password:
                existing_user.password_hash = hash_password(body.password)
            existing_user.subscription_status = "active"
            existing_user.is_email_verified = True
            await db.commit()
            await db.refresh(existing_user)
            existing_user.business_id = target_biz_id
            _USER_CACHE.pop(str(existing_user.id), None)
            return existing_user
        else:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="E-mail já vinculado a outra organização"
            )

    try:
        user = User(
            email=clean_email,
            full_name_db=body.full_name.strip() if getattr(body, "full_name", None) else None,
            password_hash=hash_password(body.password),
            role=role_input,
            is_email_verified=True,
            subscription_status="active",
        )
        db.add(user)
        await db.flush()

        # Manual 06 §3 & §4: Comparar sempre em lowercase e vincular Operador ao Business da cooperativa
        if role_input == "operator" and target_b_uuid:
            biz_op = BusinessOperator(
                business_id=target_b_uuid,
                user_id=get_uuid(user.id),
            )
            db.add(biz_op)
            user.business_id = target_biz_id

        await write_audit(
            db, AuditAction.CREATE, "User",
            user_id=current_user.id, entity_id=str(user.id),
            detail={
                "created_user_email": user.email,
                "created_user_name": user.full_name,
                "role": role_input,
                "created_by": current_user.email
            },
            request=request,
        )
        uid_str = str(user.id)
        saved_biz_id = getattr(user, 'business_id', None)
        await db.commit()
        user = (await db.execute(select(User).where(cast(User.id, String) == uid_str))).scalar_one()
        if saved_biz_id:
            user.business_id = saved_biz_id
        return user
    except IntegrityError:
        await db.rollback()
        recheck = (await db.execute(select(User).where(func.lower(User.email) == clean_email))).scalar_one_or_none()
        if recheck:
            recheck.business_id = target_biz_id
            return recheck
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="E-mail já vinculado a outra organização"
        )


@router.patch("/{user_id}", response_model=UserOut)
async def update_user(
    user_id: str,
    body: UserUpdate,
    request: Request,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    from routers.admin import _is_platform_owner, _tenant
    if not _is_platform_owner(current_user):
        _, tenant_ids = await _tenant(db, current_user)
        if str(user_id) not in tenant_ids:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")

    # Manual 01: sempre usar cast(User.id, String) == str(user_id)
    result = await db.execute(select(User).where(cast(User.id, String) == str(user_id)))
    user: User | None = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    changes = body.model_dump(exclude_unset=True)
    if "password" in changes and changes["password"]:
        from core.security import hash_password
        changes["password_hash"] = hash_password(changes.pop("password"))

    if "full_name" in changes:
        fn_val = changes.pop("full_name")
        if fn_val is not None:
            user.full_name_db = fn_val.strip()

    if "is_active" in changes:
        active_val = changes.pop("is_active")
        if active_val is not None:
            user.is_active = bool(active_val)

    if "role" in changes and changes["role"] is not None:
        r_val = changes["role"]
        changes["role"] = (r_val.value if hasattr(r_val, "value") else str(r_val)).strip().lower()

    for field, value in changes.items():
        setattr(user, field, value)

    await write_audit(
        db, AuditAction.UPDATE, "User",
        user_id=current_user.id, entity_id=str(user_id),
        detail={k: str(v) for k, v in changes.items() if k not in ("hashed_password", "password_hash")},
        request=request,
    )
    await db.commit()
    user = (await db.execute(select(User).where(cast(User.id, String) == str(user_id)))).scalar_one()

    # Invalida cache em memória do usuário alterado
    _USER_CACHE.pop(str(user.id), None)
    _USER_CACHE.pop(str(user.email), None)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: str,
    request: Request,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    if str(user_id) == str(current_user.id):
        raise HTTPException(status_code=400, detail="Você não pode excluir seu próprio usuário mestre")

    from routers.admin import _is_platform_owner, _tenant
    if not _is_platform_owner(current_user):
        _, tenant_ids = await _tenant(db, current_user)
        if str(user_id) not in tenant_ids:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")

    result = await db.execute(select(User).where(cast(User.id, String) == str(user_id)))
    user: User | None = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    email = user.email
    from sqlalchemy import delete as sa_delete
    from models.models import BusinessOperator
    await db.execute(sa_delete(BusinessOperator).where(cast(BusinessOperator.user_id, String) == str(user_id)))
    await db.execute(sa_delete(User).where(cast(User.id, String) == str(user_id)))

    await write_audit(
        db, AuditAction.DELETE, "User",
        user_id=current_user.id, entity_id=str(user_id),
        detail={"deleted_user_email": email},
        request=request,
    )
    await db.commit()
    _USER_CACHE.pop(str(user_id), None)
    _USER_CACHE.pop(str(email), None)
    return None
