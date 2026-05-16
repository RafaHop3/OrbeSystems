import os
import sys
from dotenv import load_dotenv

load_dotenv()

from database import SessionLocal
from models.users import User

def test_query():
    db = SessionLocal()
    try:
        print("Consultando usuarios...")
        users = db.query(User).all()
        print(f"Total de usuarios encontrados: {len(users)}")
        
        for u in users:
            print(f"User ID: {u.id}, Email: {u.email}")
            print(f"Role: {u.role}")
            print(f"Subscription: {u.subscription_status}")
            print("To Dict:", u.to_dict())
            
    except Exception as e:
        import traceback
        print("ERRO DE CONSULTA:")
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_query()
