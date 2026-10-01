import asyncio
import sys
import os

sys.path.append(r"D:\OrbeSystems\orbe-systems\inho_backend")
# Need to set os.environ before importing settings
os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres.bjidrhoniciczqkhazqv:Muhammadalivsroyjonesjr%23Ju.130798@aws-1-us-west-2.pooler.supabase.com:6543/postgres"

from sqlalchemy import select
from models.models import User
from db.session import AsyncSessionLocal

async def test_orm():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == "qa1@orbesystems.com.br"))
        user = result.scalar_one_or_none()
        if user:
            print("SUCCESS! User Found:", user.email, "Role:", getattr(user, 'role', None))
        else:
            print("FAILURE! User is None. The query returned exactly 0 rows via SQLAlchemy.")
            
        # Try raw SQL to compare
        from sqlalchemy import text
        raw_res = await session.execute(text("SELECT email, role FROM public.users WHERE email = 'qa1@orbesystems.com.br'"))
        raw_usr = raw_res.fetchone()
        print("RAW SQL RESULT:", raw_usr)

asyncio.run(test_orm())
