import hashlib
import os

FILES_TO_HASH = [
    "backend/routes/powershell_bot.py",
    "backend/main.py",
    "frontend/src/app/ferramentas-premium/powershell-bot/page.tsx",
    "frontend/src/components/Header.tsx",
    "frontend/src/app/(categories)/cyber-security/page.tsx",
    "SECURITY_PROTOCOL.md",
    "ORGANIZACAO_ATIVOS.md",
    "frontend/src/app/layout.tsx",
    "backend/.env.example"
]

def generate_sha256(filepath):
    if not os.path.exists(filepath):
        return "Arquivo não encontrado"
    
    sha256_hash = hashlib.sha256()
    with open(filepath, "rb") as f:
        # Lê em blocos de 64kb para eficiência
        for byte_block in iter(lambda: f.read(65536), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

if __name__ == "__main__":
    print("-" * 100)
    print(f"{'Arquivo':<64} | {'Hash SHA-256':<64}")
    print("-" * 100)
    for filepath in FILES_TO_HASH:
        file_hash = generate_sha256(filepath)
        print(f"{filepath:<64} | {file_hash:<64}")
    print("-" * 100)
