import sys
import asyncio
import os

# Add to path
sys.path.append(r"D:\OrbeSystems\orbe-systems\inho_backend")

from core.config import settings
from db.session import engine
from sqlalchemy import text

async def test_db():
    async with engine.begin() as conn:
        result = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='users';"))
        cols = [row[0] for row in result.fetchall()]
        print("USERS COLUMNS:", cols)

if __name__ == "__main__":
    asyncio.run(test_db())
