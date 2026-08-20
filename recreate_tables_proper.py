import asyncio
from db.session import engine
from models.models import Base

async def recreate():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
        print('Tables recreated')

asyncio.run(recreate())