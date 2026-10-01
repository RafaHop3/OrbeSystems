import psycopg2
db_url = "postgresql://postgres.bjidrhoniciczqkhazqv:Muhammadalivsroyjonesjr%23Ju.130798@aws-1-us-west-2.pooler.supabase.com:6543/postgres"

print("Hunting for Schema Shadows in Supabase...")
try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    # Check if inho.users exists
    cur.execute("SELECT table_schema, table_name FROM information_schema.tables WHERE table_name = 'users';")
    print("USERS TABLES FOUND:")
    for row in cur.fetchall():
        print(f" -> {row[0]}.{row[1]}")
        
    cur.execute("SELECT id, email, role FROM public.users WHERE email LIKE 'qa%';")
    print("PUBLIC USERS QA:", cur.fetchall())
except Exception as e:
    print(e)
