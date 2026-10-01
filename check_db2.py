import psycopg2
db_url = "postgresql://postgres.bjidrhoniciczqkhazqv:Muhammadalivsroyjonesjr%23Ju.130798@aws-1-us-west-2.pooler.supabase.com:6543/postgres"

print("Checking exactly where users were injected by the Admin Dashboard...")
conn = psycopg2.connect(db_url)
cur = conn.cursor()
try:
    cur.execute("SELECT id, email, role FROM users WHERE email LIKE 'qa%';")
    print("Found in public.users:", cur.fetchall())
except Exception as e:
    print(e)
