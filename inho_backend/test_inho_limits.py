import os
# Force SQLite for local testing
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_inho.db"

import asyncio
from fastapi.testclient import TestClient
from main import app
from db.session import engine, Base
from models.models import User, Business
from routers.businesses import get_current_user_placeholder

# Re-create tables
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

client = TestClient(app)

def test_business_limits():
    # 1. Start DB
    asyncio.run(setup_db())

    print("\n--- INICIANDO TESTE E2E DO INHO B2B ---")
    # In a real scenario, the user authenticates via OrbeSystems JWT.
    # Our `businesses.py` router currently mocks the current_user if they exist.
    # We will manually create a User first to act as the Premium User.
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy.ext.asyncio import AsyncSession
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async def insert_user():
        async with async_session() as db:
            u = User(email="premium@orbesystems.com.br", full_name="Orbe Premium", hashed_password="fake")
            db.add(u)
            await db.commit()

    asyncio.run(insert_user())

    # 2. Simulate User clicking "Criar Repositório/Empresa" 3 vezes
    for i in range(1, 4):
        resp = client.post("/api/v1/businesses/", json={"name": f"Matriz Corporativa {i}", "cnpj": f"0000{i}"})
        if resp.status_code == 200:
            print(f"✅ Sucesso ao criar negócio {i}: {resp.json()['name']}")
        else:
            print(f"❌ Erro ao criar negócio {i}: {resp.text}")

    # 3. Simulate creation of 4th Business (should trigger hardcoded block!)
    print("\n[Simulando ataque/tentativa excessiva de criação (4º negócio)]")
    resp_blocked = client.post("/api/v1/businesses/", json={"name": "Empresa Clandestina 4", "cnpj": "00004"})
    if resp_blocked.status_code == 403:
        print(f"🔒 BLOQUEADO COM SUCESSO! A API retornou HTTP-403: {resp_blocked.json()['detail']}")
    else:
        print(f"⚠️ FALHA NA REGRA: Permitido criar a 4º empresa, status={resp_blocked.status_code}")


if __name__ == "__main__":
    test_business_limits()
