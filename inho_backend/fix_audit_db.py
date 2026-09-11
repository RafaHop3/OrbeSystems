import asyncio
from db.session import engine
from sqlalchemy import text

async def fix_audit_db():
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE inho.audit_logs ALTER COLUMN user_id TYPE VARCHAR(36);"))
            print("Successfully altered user_id to VARCHAR(36) in inho.audit_logs")
        except Exception as e:
            print(f"Error altering schema: {e}")
            try:
                await conn.execute(text("ALTER TABLE audit_logs ALTER COLUMN user_id TYPE VARCHAR(36);"))
                print("Successfully altered user_id to VARCHAR(36) in public.audit_logs")
            except Exception as e2:
                print(f"Error in public schema: {e2}")

asyncio.run(fix_audit_db())
