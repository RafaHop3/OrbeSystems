import os
import psycopg2
from dotenv import load_dotenv

# Let's load the INHO backend .env to get the Supabase URL
load_dotenv(r"D:\APP INHO\backend\.env")

DB_URL = os.getenv("DATABASE_URL")

conn = psycopg2.connect(DB_URL)
cursor = conn.cursor()

# Check public.users types
cursor.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users'")
rows = cursor.fetchall()
print("SCHEMA FOR public.users:")
for row in rows:
    print(row)

# Also check auth.users just in case there is cross talk
cursor.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users'")
rows = cursor.fetchall()
print("\nSCHEMA FOR auth.users:")
for row in rows:
    print(row)
