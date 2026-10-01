import psycopg2
db_url = "postgresql://postgres.bjidrhoniciczqkhazqv:Muhammadalivsroyjonesjr%23Ju.130798@aws-1-us-west-2.pooler.supabase.com:6543/postgres"

print("Patching public.audit_logs schema drift...")
try:
    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute("ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS business_id UUID DEFAULT NULL;")
    print("Successfully added business_id to public.audit_logs!")
except Exception as e:
    print("ERROR:", e)
