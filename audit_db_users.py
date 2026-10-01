import psycopg2

db_url = "postgresql://postgres.bjidrhoniciczqkhazqv:Muhammadalivsroyjonesjr%23Ju.130798@aws-1-us-west-2.pooler.supabase.com:6543/postgres"

print("Auditing target users in Supabase Database...")
try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    cur.execute("SELECT id, email, role FROM users WHERE email LIKE 'qa%';")
    users = cur.fetchall()
    print("MATCHES IN 'users':", users)
    
    # Try looking at all tables to see if they got put somewhere else like imobverse.users or public.clients?
    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
    tables = cur.fetchall()
    print("PUBLIC TABLES:", tables)
except Exception as e:
    print(e)
