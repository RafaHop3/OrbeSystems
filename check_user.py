#!/usr/bin/env python3
"""Script para verificar e criar usuário premium no banco de dados"""

from database import SessionLocal, engine
from models.users import User
from passlib.context import CryptContext
import sys

pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')

def check_and_create_user():
    db = SessionLocal()
    try:
        # Verificar se usuário existe
        user = db.query(User).filter(User.email == 'rafael@orbesystems.com.br').first()
        
        if user:
            print(f"✅ Usuário existe: {user.email}")
            print(f"   Role atual: {user.role}")
            print(f"   ID: {user.id}")
            
            # Atualizar para premium se não for
            if user.role != 'premium':
                print(f"   Atualizando role para premium...")
                user.role = 'premium'
                db.commit()
                print(f"   ✅ Role atualizada para premium")
            else:
                print(f"   ✅ Usuário já é premium")
        else:
            print(f"❌ Usuário não encontrado. Criando novo usuário premium...")
            
            # Criar novo usuário premium
            hashed_password = pwd_context.hash("Muhammadalivsroyjonesjr#Ju.130798")
            new_user = User(
                email='rafael@orbesystems.com.br',
                password_hash=hashed_password,
                full_name='Rafael Machado Gomes Machado',
                role='premium',
                is_active=True
            )
            
            db.add(new_user)
            db.commit()
            print(f"✅ Usuário premium criado com sucesso!")
            print(f"   Email: {new_user.email}")
            print(f"   Role: {new_user.role}")
            print(f"   ID: {new_user.id}")
            
    except Exception as e:
        print(f"❌ Erro: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    check_and_create_user()
