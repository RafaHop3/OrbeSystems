import asyncio
from db.session import engine
from sqlalchemy import text

async def recreate():
    async with engine.begin() as conn:
        # Execute DROP and CREATE separately
        await conn.execute(text("DROP SCHEMA public CASCADE"))
        await conn.execute(text("CREATE SCHEMA public"))
        print('Schema recreated')
        
        from models.models import Base
        await conn.run_sync(Base.metadata.create_all)
        print('Tables recreated')

asyncio.run(recreate())