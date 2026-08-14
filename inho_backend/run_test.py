import asyncio
import traceback
import os
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_inho.db"

import tests.test_api as t
from httpx import AsyncClient, ASGITransport
from main import app

async def run():
    with open("out.log", "w", encoding="utf-8") as f:
        try:
            await t.setup_db()
            async with AsyncClient(transport=ASGITransport(app=app), base_url='http://test') as c:
                await t.test_user_role_classification_and_audit_logging(c)
            f.write("✅ SUCCESS!\n")
            f.flush()
            print("✅ SUCCESS!")
        except Exception as e:
            f.write("❌ EXCEPTION OCCURRED:\n")
            f.write(traceback.format_exc())
            f.flush()
            print("❌ EXCEPTION OCCURRED:")

if __name__ == "__main__":
    asyncio.run(run())
