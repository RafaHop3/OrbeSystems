import psycopg2
import traceback

db_url = "postgresql://postgres:Muhammadalivsroyjonesjr@db.zgdtyzaxoqziroqjqgni.supabase.co:5432/postgres?sslmode=require"
try:
    print("Connecting to EC2's exact Supabase URL...")
    conn = psycopg2.connect(db_url, connect_timeout=10)
    curr = conn.cursor()
    curr.execute("ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255) DEFAULT 'OrbeAdmin' NOT NULL;")
    conn.commit()
    print("SUCCESS")
    conn.close()
except Exception as e:
    print("ERROR TRACEBACK: ", str(e)[:200])
