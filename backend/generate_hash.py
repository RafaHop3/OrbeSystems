import sys
import bcrypt

def main():
    print("====================================")
    print(" ORBE SYSTEMS - HASH GENERATOR TOOL ")
    print("====================================")
    
    password = input("Digite a nova senha que deseja usar: ")
    
    if not password:
        print("Erro: Senha não pode ser vazia.")
        sys.exit(1)
        
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt).decode('utf-8')
    
    print("\n[ SUCESSO ] Seu novo hash bcrypt foi gerado:\n")
    print(hashed)
    print("\nComo usar:")
    print("1. Copie o hash inteiro acima (começando com $2b$12$...)")
    print("2. Cole-o no seu arquivo .env local como ADMIN_PASSWORD_HASH=seu_hash_aqui")
    print("3. No Render/Produção, atualize a variável ADMIN_PASSWORD_HASH com esse valor.")
    print("====================================")

if __name__ == "__main__":
    main()
