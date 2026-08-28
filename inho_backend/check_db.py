import asyncio
from db.session import engine
from sqlalchemy import text

async def check_db():
    async with engine.begin() as conn:
        # Check if billing_invoices table exists
        result = await conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='billing_invoices'"))
        table = result.fetchone()
        print('billing_invoices table exists:', table)
        
        if table:
            # Check columns
            result = await conn.execute(text("PRAGMA table_info(billing_invoices)"))
            cols = result.fetchall()
            print('Columns:', cols)

asyncio.run(check_db())