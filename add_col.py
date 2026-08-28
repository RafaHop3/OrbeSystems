import psycopg2

db_url = "postgresql://postgres:Muhammadalivsroyjonesjr@db.zgdtyzaxoqziroqjqgni.supabase.co:5432/postgres?sslmode=require"
try:
    conn = psycopg2.connect(db_url)
    curr = conn.cursor()
    curr.execute("ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255) DEFAULT 'OrbeAdmin' NOT NULL;")
    conn.commit()
    print("SUCCESS: full_name column added securely to public.users")
    conn.close()
except Exception as e:
    print("ERR:", e)
