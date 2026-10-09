import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv('.env')
db_url = os.getenv('DATABASE_URL')
engine = create_engine(db_url)

with engine.connect() as conn:
    row = conn.execute(text("SELECT email, role FROM users WHERE email = 'rafael@orbesystems.com.br'")).fetchone()
    print('User in DB:', row)
