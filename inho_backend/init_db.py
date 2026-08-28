import asyncio
from db.session import engine, Base
import models.models
import models.pco_models

async def reset_db():
    async with engine.begin() as conn:
        print("Creating/Updating SQLite database tables...")
        await conn.run_sync(Base.metadata.create_all)
    print("DB initialized!")

if __name__ == "__main__":
    asyncio.run(reset_db())
