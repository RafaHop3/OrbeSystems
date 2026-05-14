"""
routes/auth_public.py — Public Auth Endpoints
════════════════════════════════════════════════════
GET /api/auth/me — Returns current user data from JWT
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from security.auth import get_current_user_optional
from models.user import User

router = APIRouter()


@router.get("/me")
async def get_me(current_user: Optional[User] = Depends(get_current_user_optional)):
    """
    Returns the authenticated user's data.
    Returns null if not authenticated.
    The JWT is read from the Authorization header or cookie.
    """
    if current_user:
        return current_user.to_dict()
    return None
