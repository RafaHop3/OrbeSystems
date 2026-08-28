import asyncio
from db.session import engine
from sqlalchemy import text

async def recreate():
    async with engine.begin() as conn:
        # Drop all tables with CASCADE to handle foreign keys
        await conn.execute(text("DROP SCHEMA public CASCADE; CREATE SCHEMA public;"))
        print('Schema recreated')
        
        # Now create all tables
        from models.models import Base
        await conn.run_sync(Base.metadata.create_all)
        print('Tables recreated')

asyncio.run(recreate())