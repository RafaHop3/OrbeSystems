import asyncio
from db.session import AsyncSessionLocal
from models.models import User, UserRole
from core.security import hash_password

async def create_test_user():
    async with AsyncSessionLocal() as db:
        # Check if user exists
        from sqlalchemy import select
        result = await db.execute(select(User).where(User.email == "teste@inho.com"))
        existing = result.scalar_one_or_none()
        
        if existing:
            print("Usuário de teste já existe")
            print(f"Email: teste@inho.com")
            print(f"Senha: Teste123!")
            return
        
        # Create test user
        user = User(
            email="teste@inho.com",
            full_name="Usuário de Teste INHO",
            hashed_password=hash_password("Teste123!"),
            role=UserRole.ADMIN,
            is_active=True,
            is_verified=True,
            is_mfa_enabled=False
        )
        
        db.add(user)
        await db.commit()
        await db.refresh(user)
        
        print("Usuário de teste criado com sucesso!")
        print(f"Email: teste@inho.com")
        print(f"Senha: Teste123!")
        print(f"ID: {user.id}")
        print(f"Role: {user.role}")

if __name__ == "__main__":
    asyncio.run(create_test_user())
