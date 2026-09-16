import asyncio
from db.session import AsyncSessionLocal
from models.models import User, UserRole

async def seed_user():
    async with AsyncSessionLocal() as db:
        user = User(email="localdev@admin.com", password_hash="fake", role=UserRole.SUPER_ADMIN)
        db.add(user)
        await db.commit()
        print("Mock user seeded successfully for dev bypass.")

if __name__ == "__main__":
    asyncio.run(seed_user())
