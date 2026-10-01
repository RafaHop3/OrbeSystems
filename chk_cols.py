import psycopg2
db_url = "postgresql://postgres.bjidrhoniciczqkhazqv:Muhammadalivsroyjonesjr%23Ju.130798@aws-1-us-west-2.pooler.supabase.com:6543/postgres"

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='inho' AND table_name='users';")
    cols = cur.fetchall()
    print("INHO COLUMNS:", cols)
    
    cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='users';")
    pcols = cur.fetchall()
    print("\nPUBLIC COLUMNS:", pcols)
except Exception as e:
    print(e)
