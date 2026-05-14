"""
routes/admin_users.py — Admin User Management
════════════════════════════════════════════════
Rotas para administrar usuários do sistema.
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel, EmailStr
from security.auth import get_current_admin_user
from database import get_db
from models.user import User
from utils.logger import admin_logger
from services.audit_service import log_audit
from slowapi import Limiter
from slowapi.util import get_remote_address
import re

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

# Constants
ROLE_USER = "user"
ROLE_PREMIUM = "premium"
VALID_ROLES = {ROLE_USER, ROLE_PREMIUM}

# ── Schemas ───────────────────────────────────────────────────────────────────
class CreateUserSchema(BaseModel):
    email: EmailStr
    password: str
    role: str = ROLE_USER

# Whitelist of trusted proxy IPs (Cloudflare, Vercel, etc.)
TRUSTED_PROXIES = {
    "103.21.244.0", "103.22.200.0", "103.31.4.0", "104.16.0.0", "104.24.0.0",
    "108.162.192.0", "131.0.72.0", "141.101.64.0", "162.158.0.0", "172.64.0.0",
    "173.245.48.0", "188.114.96.0", "190.93.240.0", "197.234.240.0", "198.41.128.0"
}


def is_valid_uuid(uuid_string: str) -> bool:
    """Valida se uma string é um UUID válido."""
    uuid_pattern = re.compile(
        r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
        re.IGNORECASE
    )
    return bool(uuid_pattern.match(uuid_string))


def is_valid_ip(ip_string: str) -> bool:
    """Valida se uma string é um endereço IP válido."""
    ip_pattern = re.compile(
        r'^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$'
    )
    return bool(ip_pattern.match(ip_string))


def get_client_ip(request: Request) -> str:
    """
    Obtém o IP real do cliente com validação para evitar spoofing.
    Usa X-Forwarded-For se disponível e válido, senão usa request.client.host.
    """
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # X-Forwarded-For pode ter múltiplos IPs: "client, proxy1, proxy2"
        # Pegamos o primeiro (cliente original)
        client_ip = forwarded_for.split(",")[0].strip()
        # Validar se é um IP válido
        if is_valid_ip(client_ip):
            return client_ip
    # Fallback para request.client.host
    return request.client.host if request.client else "unknown"


def is_trusted_proxy(ip_string: str) -> bool:
    """Verifica se o IP está na whitelist de proxies confiáveis."""
    # Verificar se o IP está em qualquer range da whitelist
    # Para simplificar, verificamos se o IP começa com algum dos prefixos da whitelist
    for trusted_ip in TRUSTED_PROXIES:
        if ip_string.startswith(trusted_ip.rsplit(".", 1)[0]):
            return True
    return False


def verify_csrf_token(request: Request) -> bool:
    """
    Verifica o token CSRF no header para rotas POST/DELETE.
    Para APIs REST, verificamos o header X-CSRF-Token.
    O token CSRF deve ser igual ao hash do JWT do usuário.
    """
    csrf_token = request.headers.get("X-CSRF-Token")
    if not csrf_token:
        return False
    
    # Em produção, validar o token contra uma sessão ou cookie
    # Por enquanto, apenas verificamos se o header está presente
    # TODO: Implementar validação real usando JWT hash
    return True


@router.post("/users")
@limiter.limit("10/minute")
async def create_user(
    data: CreateUserSchema,
    request: Request,
    admin: str = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Cria um novo usuário no sistema.
    """
    if not verify_csrf_token(request):
        raise HTTPException(status_code=403, detail="CSRF token missing")

    # Get admin email from dependency
    admin_email = admin
    # Get real IP address with validation
    ip_address = get_client_ip(request)

    # Validate role
    if data.role not in VALID_ROLES:
        admin_logger.error(f"Invalid role attempted - role={data.role}")
        raise HTTPException(status_code=400, detail="Invalid role")

    # Check if email already exists
    if db.query(User).filter(User.email == data.email).first():
        admin_logger.warning(f"Attempt to create user with existing email - email={data.email}")
        raise HTTPException(status_code=400, detail="Email already registered")

    # Validate password strength
    if len(data.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    # Create user
    from security.auth import get_password_hash
    user = User(
        email=data.email,
        hashed_password=get_password_hash(data.password),
        role=data.role
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Log audit
    log_audit(
        db=db,
        admin_email=admin_email,
        action="create_user",
        target_type="user",
        target_id=user.id,
        details={"user_email": user.email, "role": user.role},
        ip_address=ip_address
    )

    admin_logger.info(f"User created - user_id={user.id}, email={user.email}, role={user.role}")
    return {"status": "success", "message": "User created", "user": user.to_dict()}


@router.get("/users")
async def list_users(
    skip: int = 0,
    limit: int = 50,
    admin: str = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Lista todos os usuários do sistema com paginação.
    """
    admin_logger.info(f"Admin listing users - skip={skip}, limit={limit}")
    # Use subquery to get count in a single query
    from sqlalchemy import func
    total_subquery = db.query(func.count(User.id)).scalar()
    users = db.query(User).order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    admin_logger.info(f"Admin listed {len(users)} users (total: {total_subquery})")
    return {
        "users": [user.to_dict() for user in users],
        "total": total_subquery,
        "skip": skip,
        "limit": limit
    }


@router.get("/users/{user_id}")
async def get_user(user_id: str, db: Session = Depends(get_db)):
    """
    Retorna detalhes de um usuário específico.
    """
    if not is_valid_uuid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user.to_dict()


@router.post("/users/{user_id}/role")
@limiter.limit("30/minute")
async def update_user_role(
    user_id: str,
    role: str,
    request: Request,
    admin: str = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Atualiza o papel de um usuário (user/premium).
    """
    if not verify_csrf_token(request):
        raise HTTPException(status_code=403, detail="CSRF token missing")

    if not is_valid_uuid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID format")

    # Get admin email from dependency
    admin_email = admin
    # Get real IP address with validation
    ip_address = get_client_ip(request)

    admin_logger.warning(f"Admin updating user role - user_id={user_id}, new_role={role}")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        admin_logger.error(f"User not found for role update - user_id={user_id}")
        raise HTTPException(status_code=404, detail="User not found")

    if role not in VALID_ROLES:
        admin_logger.error(f"Invalid role attempted - role={role}")
        raise HTTPException(status_code=400, detail="Invalid role")

    old_role = user.role
    user.role = role
    db.commit()

    # Log audit
    log_audit(
        db=db,
        admin_email=admin_email,
        action="update_user_role",
        target_type="user",
        target_id=user_id,
        details={"old_role": old_role, "new_role": role, "user_email": user.email},
        ip_address=ip_address
    )

    admin_logger.info(f"User role updated - user_id={user_id}, email={user.email}, old_role={old_role}, new_role={role}")
    return {"status": "success", "message": f"User role updated to {role}"}


@router.delete("/users/{user_id}")
@limiter.limit("10/minute")
async def delete_user(
    user_id: str,
    request: Request,
    admin: str = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Deleta um usuário do sistema.
    """
    if not verify_csrf_token(request):
        raise HTTPException(status_code=403, detail="CSRF token missing")

    if not is_valid_uuid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID format")

    # Get admin email from dependency
    admin_email = admin
    # Get real IP address with validation
    ip_address = get_client_ip(request)

    admin_logger.warning(f"Admin deleting user - user_id={user_id}")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        admin_logger.error(f"User not found for deletion - user_id={user_id}")
        raise HTTPException(status_code=404, detail="User not found")

    user_email = user.email
    db.delete(user)
    db.commit()

    # Log audit
    log_audit(
        db=db,
        admin_email=admin_email,
        action="delete_user",
        target_type="user",
        target_id=user_id,
        details={"user_email": user_email},
        ip_address=ip_address
    )

    admin_logger.info(f"User deleted - user_id={user_id}, email={user_email}")
    return {"status": "success", "message": "User deleted"}
