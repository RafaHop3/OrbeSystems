"""
INHO – Seed Script
Cria o primeiro usuario SUPER_ADMIN no banco de dados.

Uso:
    cd "d:\\APP INHO\\backend"
    .\\venv\\Scripts\\Activate.ps1
    python scripts/seed.py
"""
import asyncio
import sys
import os

# Garante que o modulo raiz do backend seja encontrado
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from db.session import AsyncSessionLocal, engine, Base
from models.models import User, UserRole
from core.security import hash_password


SUPER_ADMIN = {
    "email":      "admin@inho.io",
    "full_name":  "INHO Super Admin",
    "password":   "Admin@INHO2026!",   # troque imediatamente apos o primeiro login
    "role":       UserRole.SUPER_ADMIN,
}


async def seed():
    print("\n[INHO Seed] Iniciando...")

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # Verifica se ja existe
        result = await db.execute(
            select(User).where(User.email == SUPER_ADMIN["email"])
        )
        existing = result.scalar_one_or_none()

        if existing:
            print(f"[INHO Seed] SUPER_ADMIN ja existe: {SUPER_ADMIN['email']}")
            print("[INHO Seed] Nenhuma acao necessaria.")
            return

        user = User(
            email=SUPER_ADMIN["email"],
            full_name=SUPER_ADMIN["full_name"],
            hashed_password=hash_password(SUPER_ADMIN["password"]),
            role=SUPER_ADMIN["role"],
            is_active=True,
            is_verified=True,
        )
        db.add(user)
        await db.commit()

        print(f"[INHO Seed] SUPER_ADMIN criado com sucesso!")
        print(f"  Email: {SUPER_ADMIN['email']}")
        print(f"  Senha: {SUPER_ADMIN['password']}")
        print(f"  ID:    {user.id}")
        print("\n  ATENCAO: Troque a senha imediatamente apos o primeiro login!\n")


if __name__ == "__main__":
    asyncio.run(seed())
