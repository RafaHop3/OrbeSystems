"""
INHO – Reset Admin Password + Promover para SUPER_ADMIN
Uso:
    python scripts/reset_admin.py
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select, update
from db.session import AsyncSessionLocal, engine, Base
from models.models import User, UserRole
from core.security import hash_password

TARGET_EMAIL = "admin@inho.io"
NEW_PASSWORD = "Admin@INHO2026!"


async def reset():
    print("\n[Reset Admin] Iniciando...")

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == TARGET_EMAIL))
        user = result.scalar_one_or_none()

        if not user:
            print(f"[Reset Admin] Usuario nao encontrado: {TARGET_EMAIL}")
            print("[Reset Admin] Execute scripts/seed.py primeiro.")
            return

        user.hashed_password = hash_password(NEW_PASSWORD)
        user.role            = UserRole.SUPER_ADMIN
        user.is_active       = True
        user.is_verified     = True
        await db.commit()

        print(f"[Reset Admin] Concluido!")
        print(f"  Email: {TARGET_EMAIL}")
        print(f"  Senha: {NEW_PASSWORD}")
        print(f"  Role:  SUPER_ADMIN")
        print(f"  ID:    {user.id}\n")


if __name__ == "__main__":
    asyncio.run(reset())
