import psycopg2
import sys

conn_str = "postgresql://postgres:Muhammadalivsroyjonesjr%23Ju.130798@db.bjidrhoniciczqkhazqv.supabase.co:5432/postgres"

print("Connecting to Supabase to drop inho schema...")
try:
    conn = psycopg2.connect(conn_str)
    conn.autocommit = True
    cur = conn.cursor()

    cur.execute('DROP SCHEMA IF EXISTS inho CASCADE;')
    print("Dropped inho schema successfully.")

except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
