import os
os.environ["SCHEMA"] = "public"
os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres.bjidrhoniciczqkhazqv:Muhammadalivsroyjonesjr%23Ju.130798@aws-1-us-west-2.pooler.supabase.com:6543/postgres"

import asyncio
import sys
sys.path.append(r"D:\OrbeSystems\orbe-systems\inho_backend")
from sqlalchemy.ext.asyncio import create_async_engine
from models.models import AuditLog, Base

async def fix():
    engine = create_async_engine(os.environ["DATABASE_URL"])
    async with engine.begin() as conn:
        print("Dropping legacy audit logs...")
        await conn.run_sync(Base.metadata.drop_all, tables=[AuditLog.__table__])
        print("Recreating perfectly aligned audit logs...")
        await conn.run_sync(Base.metadata.create_all, tables=[AuditLog.__table__])
    print("AuditLog Schema 100% Repaired!")

asyncio.run(fix())
