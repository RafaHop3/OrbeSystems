import psycopg2
db_url = "postgresql://postgres.bjidrhoniciczqkhazqv:Muhammadalivsroyjonesjr%23Ju.130798@aws-1-us-west-2.pooler.supabase.com:6543/postgres"

print("Fixing Schema Shadowing...")
try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    # Let's see if inho schema exists and what tables are there
    cur.execute("SELECT table_schema, table_name FROM information_schema.tables WHERE table_name = 'users';")
    tables = cur.fetchall()
    
    has_inho_users = False
    for t in tables:
        if t[0] == 'inho':
            has_inho_users = True
            
    if has_inho_users:
        print("Detected inho.users! Copying public.users data into it...")
        # Since id is PK, we handle conflicts
        cur.execute("""
            INSERT INTO inho.users (id, email, password_hash, role, is_email_verified, created_at, subscription_status)
            SELECT id, email, password_hash, role, is_email_verified, created_at, 'active' 
            FROM public.users
            ON CONFLICT (id) DO NOTHING;
        """)
        conn.commit()
        print("Synchronized public users into INHO shadow schema! Login should work now.")
    else:
        print("No inho.users table found. The issue is NOT a shadow table. Dumping exact public.users matches:")
        cur.execute("SELECT id, email FROM public.users;")
        print(cur.fetchall())
except Exception as e:
    print(e)
