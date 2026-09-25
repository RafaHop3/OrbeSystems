import psycopg2
from pprint import pprint

conn = psycopg2.connect("postgresql://postgres.bjidrhoniciczqkhazqv:Muhammadalivsroyjonesjr%23Ju.130798@aws-1-us-west-2.pooler.supabase.com:5432/postgres")
cur = conn.cursor()

try:
    cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' AND table_schema = 'public';")
    print("TABLE: public.users")
    for row in cur.fetchall():
        print(f"  {row[0]}: {row[1]}")
except Exception as e:
    print(e)
