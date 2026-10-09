import sys
import uuid
import datetime
sys.path.insert(0, 'd:/OrbeSystems/orbe-systems/backend')
from sqlalchemy import create_engine, text
from security.auth import get_password_hash

db_url = "postgresql://postgres.bjidrhoniciczqkhazqv:Muhammadalivsroyjonesjr%23Ju.130798@aws-1-us-west-2.pooler.supabase.com:6543/postgres"
engine = create_engine(db_url)

email = "rafael@orbesystems.com.br"
password = "Muhammadalivsroyjonesjr#Ju.130798"
hashed_pw = get_password_hash(password)

with engine.begin() as conn:
    # Check if user already exists
    row = conn.execute(text("SELECT id FROM users WHERE email = :email"), {"email": email}).fetchone()
    if row:
        print("User already exists, updating role and password...")
        conn.execute(text("UPDATE users SET password_hash = :hash, role = 'superadmin' WHERE email = :email"), 
                     {"hash": hashed_pw, "email": email})
        print("User updated successfully.")
    else:
        print("User does not exist, inserting...")
        user_id = str(uuid.uuid4())
        try:
            conn.execute(text("""
                INSERT INTO users (id, email, password_hash, full_name, role, is_active, created_at)
                VALUES (:id, :email, :hash, 'Rafael Orbe', 'superadmin', true, :now)
            """), {"id": user_id, "email": email, "hash": hashed_pw, "now": datetime.datetime.utcnow()})
            print("User inserted successfully.")
        except Exception as e:
            print("Error inserting user:", e)
            print("Trying to identify table schema to adjust insert...")
            cols = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'")).fetchall()
            print("Columns in users table:", [c[0] for c in cols])
