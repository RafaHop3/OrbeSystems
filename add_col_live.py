import psycopg2
import sys

db_url = "postgresql://postgres:Muhammadalivsroyjonesjr@db.ehpbwhyqweljbsxbwbob.supabase.co:5432/postgres?sslmode=require"
try:
    print("Attempting to connect to the real active project...")
    conn = psycopg2.connect(db_url, connect_timeout=10)
    curr = conn.cursor()
    curr.execute("ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255) DEFAULT 'OrbeAdmin' NOT NULL;")
    conn.commit()
    print("SUCCESS: full_name column added securely to public.users on LIVE cluster!")
    conn.close()
except Exception as e:
    print("ERR:", e)
    sys.exit(1)
