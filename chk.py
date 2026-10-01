import psycopg2
db_url = "postgresql://postgres.bjidrhoniciczqkhazqv:Muhammadalivsroyjonesjr%23Ju.130798@aws-1-us-west-2.pooler.supabase.com:6543/postgres"

print("Checking EXACT spelling and whitespace...")
try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    cur.execute("SELECT email, subscription_status, is_email_verified, role FROM public.users WHERE email LIKE '%qa%';")
    rows = cur.fetchall()
    for r in rows:
        print("->", [repr(v) for v in r])
except Exception as e:
    print(e)
