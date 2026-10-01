import psycopg2
import sys
import uuid

# Manually use passlib inside the backend virtual env or global env
try:
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    hash_pw = pwd_context.hash("Muhammadalivsroyjonesjr#Ju.130798")
except:
    import bcrypt
    hash_pw = bcrypt.hashpw("Muhammadalivsroyjonesjr#Ju.130798".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

db_url = "postgresql://postgres.bjidrhoniciczqkhazqv:Muhammadalivsroyjonesjr%23Ju.130798@aws-1-us-west-2.pooler.supabase.com:6543/postgres"

print("Enforcing Master Password for 'rafael@orbesystems.com.br'...")
try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    cur.execute("SELECT id FROM users WHERE email = 'rafael@orbesystems.com.br'")
    r = cur.fetchone()
    if not r:
        cur.execute("INSERT INTO users (id, email, password_hash, role) VALUES (%s, %s, %s, 'admin')", (str(uuid.uuid4()), 'rafael@orbesystems.com.br', hash_pw))
        print("Master Admin Created!")
    else:
        cur.execute("UPDATE users SET password_hash = %s WHERE email = 'rafael@orbesystems.com.br'", (hash_pw,))
        print("Master Admin Overridden safely!")
    conn.commit()
except Exception as e:
    print(e)
