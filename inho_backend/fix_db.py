import asyncio
from db.session import engine
from sqlalchemy import text

async def fix_db():
    async with engine.begin() as conn:
        # Add missing columns to billing_invoices
        columns_to_add = [
            ("created_by_id", "UUID"),
            ("created_by_name", "VARCHAR(255)"),
            ("updated_by_id", "UUID"),
            ("updated_by_name", "VARCHAR(255)"),
        ]
        
        for col_name, col_type in columns_to_add:
            try:
                await conn.execute(text(f"ALTER TABLE billing_invoices ADD COLUMN {col_name} {col_type}"))
                print(f"Added column: {col_name}")
            except Exception as e:
                print(f"Column {col_name} might already exist: {e}")

asyncio.run(fix_db())