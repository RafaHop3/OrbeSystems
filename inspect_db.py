import psycopg2

db_url = "postgresql://postgres.bjidrhoniciczqkhazqv:Muhammadalivsroyjonesjr%23Ju.130798@aws-1-us-west-2.pooler.supabase.com:6543/postgres"

print("Interrogating users table schema...")
try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users';")
    columns = cur.fetchall()
    print("USERS COLUMNS:", columns)
    
    # Let's also check admin_users just in case
    cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'admin_users';")
    admin_columns = cur.fetchall()
    print("ADMIN_USERS COLUMNS:", admin_columns)
except Exception as e:
    print(e)
