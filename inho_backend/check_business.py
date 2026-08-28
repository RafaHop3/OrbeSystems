import asyncio
from db.session import engine
from sqlalchemy import text

async def check_business_table():
    async with engine.begin() as conn:
        result = await conn.execute(text("PRAGMA table_info(businesses)"))
        cols = result.fetchall()
        print('Business columns:', cols)

asyncio.run(check_business_table())