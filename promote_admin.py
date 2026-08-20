"""
Promote admin@inho.com to ADMIN and run E2E operator flow.
Run from d:\OrbeSystems\orbe-systems
"""
import asyncio, sys, os
sys.path.insert(0, os.path.abspath("inho_backend"))
os.environ.setdefault("DATABASE_URL", open(".env.docker", encoding="utf-8").read().split("DATABASE_URL=")[1].split("\n")[0].strip() if os.path.exists(".env.docker") else "")

from db.session import AsyncSessionLocal, engine
from models.models import User, UserRole
from sqlalchemy import select, text

async def main():
    async with AsyncSessionLocal() as session:
        # Promote admin to ADMIN role
        await session.execute(
            text("UPDATE inho.users SET role = 'ADMIN' WHERE email = 'admin@inho.com'")
        )
        # Promote operator to OPERATOR role
        await session.execute(
            text("UPDATE inho.users SET role = 'OPERATOR' WHERE email = 'auto_operador3@inho.com'")
        )
        await session.commit()
        
        # Verify
        result = await session.execute(select(User).where(User.email.in_(["admin@inho.com", "auto_operador3@inho.com"])))
        users = result.scalars().all()
        for u in users:
            print(f"  {u.email} => role={u.role}")
    print("Done.")

asyncio.run(main())
