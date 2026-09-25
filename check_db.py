import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv("D:/OrbeSystems/orbe-systems/backend/.env")

DATABASE_URL = os.environ.get("DATABASE_URL")
engine = create_engine(DATABASE_URL)

try:
    with engine.connect() as conn:
        res = conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users';"))
        for row in res:
            print(f"{row[0]}: {row[1]}")
except Exception as e:
    print(e)
