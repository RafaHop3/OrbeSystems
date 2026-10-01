import psycopg2
db_url = "postgresql://postgres.bjidrhoniciczqkhazqv:Muhammadalivsroyjonesjr%23Ju.130798@aws-1-us-west-2.pooler.supabase.com:6543/postgres"

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    cur.execute("SELECT id, email, password_hash, role FROM public.users WHERE email LIKE 'qa%';")
    qa_users = cur.fetchall()
    
    for u in qa_users:
        cur.execute("INSERT INTO inho.users (id, email, password_hash, role, is_email_verified, subscription_status, created_at) VALUES (%s, %s, %s, %s, true, 'active', now()) ON CONFLICT (id) DO NOTHING;", u)
    conn.commit()
    print("SYNC SUCCESSFUL - Users migrated to shadow schema")
except Exception as e:
    print("ERROR:", e)
