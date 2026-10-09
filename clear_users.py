import asyncio
import sys
sys.path.insert(0, 'd:/OrbeSystems/orbe-systems/backend')
from sqlalchemy import create_engine, text

db_url = "postgresql://postgres.bjidrhoniciczqkhazqv:Muhammadalivsroyjonesjr%23Ju.130798@aws-1-us-west-2.pooler.supabase.com:6543/postgres"

def clean_database():
    engine = create_engine(db_url)
    with engine.begin() as conn:
        res = conn.execute(text("SELECT id, email, role FROM users")).fetchall()
        print(f"Found {len(res)} users in main 'users' table")
        conn.execute(text("DELETE FROM users WHERE email != 'rafael@orbesystems.com.br'"))
        print("Cleared users in main DB except rafael@orbesystems.com.br")
        
        # Try checking inho schemas
        try:
            res_inho = conn.execute(text("SELECT id, email, role FROM inho.users")).fetchall()
            print(f"Found {len(res_inho)} users in 'inho.users' table")
            conn.execute(text("DELETE FROM inho.users WHERE email != 'rafael@orbesystems.com.br'"))
            print("Cleared users in INHO schema DB except rafael@orbesystems.com.br")
        except Exception as e:
            print("Could not query inho.users (maybe it's a different schema or doesn't exist):", e)

if __name__ == "__main__":
    clean_database()
