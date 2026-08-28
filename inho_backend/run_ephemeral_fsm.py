import os
import asyncio
import traceback

os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_webhook_ephemeral.db"

if os.path.exists("./test_webhook_ephemeral.db"):
    os.remove("./test_webhook_ephemeral.db")

from db.session import engine, Base
import models.models
import models.pco_models

async def main():
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        
        # Override test_b2b2c_webhook's first test user if it fails
        from test_b2b2c_webhook import run_simulation
        from models.models import User
        from db.session import AsyncSessionLocal
        
        # we must seed a master user because test_b2b2c_webhook.py looks for one!
        async with AsyncSessionLocal() as session:
            user = User(
                email="master@test.com",
                full_name="Master Test User",
                hashed_password="123",
            )
            session.add(user)
            await session.commit()
            
        await run_simulation()
    except Exception as e:
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
