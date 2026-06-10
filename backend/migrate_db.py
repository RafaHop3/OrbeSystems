import os
import sys

# Garante que as variáveis de ambiente possam ser lidas
from dotenv import load_dotenv
load_dotenv()

from database import engine, Base
import models.users
import models.metadata
import models.math_vectors
import models.math_matrices
import models.audit_log
import models.imobverse
import models.repository_db

def run_migration():
    print("Conectando ao banco de dados...")
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Tabelas `user_roles` e `user_subscriptions` criadas com sucesso no banco de dados!")
    except Exception as e:
        print(f"❌ Erro ao criar tabelas: {e}")

if __name__ == "__main__":
    run_migration()
