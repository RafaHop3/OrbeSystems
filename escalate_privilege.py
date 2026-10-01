import psycopg2

db_url = "postgresql://postgres.bjidrhoniciczqkhazqv:Muhammadalivsroyjonesjr%23Ju.130798@aws-1-us-west-2.pooler.supabase.com:6543/postgres"

print("Upgrading Orbe Identity Role to 'superadmin'...")
try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    cur.execute("UPDATE users SET role = 'superadmin' WHERE email = 'rafael@orbesystems.com.br'")
    conn.commit()
    print("Master Admin Privilege Escalated Successfully!")
except Exception as e:
    print(e)
