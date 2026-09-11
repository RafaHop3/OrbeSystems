import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

engine = create_async_engine(os.getenv('DATABASE_URL'))

async def run():
    async with engine.begin() as conn:
        await conn.execute(text('ALTER TABLE inho.billing_invoices ADD COLUMN IF NOT EXISTS reminder_before_sent_at TIMESTAMPTZ, ADD COLUMN IF NOT EXISTS reminder_due_sent_at TIMESTAMPTZ, ADD COLUMN IF NOT EXISTS reminder_after_sent_at TIMESTAMPTZ;'))
    print("Database columns successfully injected!")

asyncio.run(run())
