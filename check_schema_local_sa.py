import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv(r"D:\APP INHO\backend\.env")

DB_URL = os.getenv("DATABASE_URL")
# fallback cleanup just in case
if DB_URL and DB_URL.startswith("postgresql+asyncpg"):
    DB_URL = DB_URL.replace("postgresql+asyncpg", "postgresql+psycopg2")
if DB_URL and DB_URL.startswith("postgresql://"):
    DB_URL = DB_URL.replace("postgresql://", "postgresql+psycopg2://")

engine = create_engine(DB_URL)

with engine.connect() as conn:
    print("SCHEMA FOR public.users:")
    rows = conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users'")).fetchall()
    for row in rows:
        print(row)

    print("\nSCHEMA FOR auth.users:")
    rows = conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users'")).fetchall()
    for row in rows:
        print(row)
