import psycopg2
import sys

conn_str = "postgresql://postgres.bjidrhoniciczqkhazqv:Muhammadalivsroyjonesjr%23Ju.130798@aws-1-us-west-2.pooler.supabase.com:6543/postgres"

print("Connecting to Supabase to recreate inho schema...")
try:
    conn = psycopg2.connect(conn_str)
    conn.autocommit = True
    cur = conn.cursor()

    cur.execute('CREATE SCHEMA IF NOT EXISTS inho;')
    print("Created inho schema successfully.")

except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
