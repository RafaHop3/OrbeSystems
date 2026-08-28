import sys, os, asyncio

sys.path.append(os.path.abspath('inho_backend'))

from db.session import AsyncSessionLocal
from models.models import User, UserRole
from core.security import hash_password as get_password_hash
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == 'admin@inho.com'))
        user = result.scalar_one_or_none()
        
        if not user:
            user = User(
                email='admin@inho.com',
                full_name='Super Admin INHO',
                hashed_password=get_password_hash('admin_pwd_123'),
                role=UserRole.ADMIN,
                is_active=True,
                is_verified=True
            )
            session.add(user)
            print("CREATED admin@inho.com")
        else:
            user.hashed_password = get_password_hash('admin_pwd_123')
            user.role = UserRole.ADMIN
            print("UPDATED admin@inho.com")
        
        await session.commit()
        print("Done.")

if __name__ == '__main__':
    asyncio.run(main())
