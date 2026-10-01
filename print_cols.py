import psycopg2
db_url = "postgresql://postgres.bjidrhoniciczqkhazqv:Muhammadalivsroyjonesjr%23Ju.130798@aws-1-us-west-2.pooler.supabase.com:6543/postgres"

conn = psycopg2.connect(db_url)
cur = conn.cursor()
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_schema='inho' AND table_name='users';")
print("INHO:", [r[0] for r in cur.fetchall()])
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='users';")
print("PUBLIC:", [r[0] for r in cur.fetchall()])
