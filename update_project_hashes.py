import hashlib
import os
import re

# Arquivos críticos do ecossistema Orbe Systems & IMORTAL
FILES_TO_HASH = [
    "backend/routes/powershell_bot.py",
    "backend/main.py",
    "frontend/src/app/ferramentas-premium/powershell-bot/page.tsx",
    "frontend/src/components/Header.tsx",
    "frontend/src/app/(categories)/cyber-security/page.tsx",
    "SECURITY_PROTOCOL.md",
    "backend/imortal/ai.py",
    "backend/imortal/compiler.py",
    "backend/imortal/prover.py",
    "backend/imortal/sandbox.py",
    "backend/imortal/server.py",
    "backend/imortal/visualizer.py",
    "frontend/src/app/api/ping-backend/route.ts",
    "frontend/vercel.json"
]

TARGET_DOCUMENTS = [
    "ORGANIZACAO_ATIVOS.md",
    "NORMATIZACAO_JURIDICO_TECNICA.md"
]

def calculate_sha256(filepath):
    if not os.path.exists(filepath):
        print(f"[AVISO] Arquivo não encontrado para hash: {filepath}")
        return None
    
    sha256_hash = hashlib.sha256()
    with open(filepath, "rb") as f:
        for byte_block in iter(lambda: f.read(65536), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def update_markdown_tables(hashes):
    # Primeiro atualizamos todas as outras referências
    for doc in TARGET_DOCUMENTS:
        if not os.path.exists(doc):
            print(f"[ERROR] Documento de destino não encontrado: {doc}")
            continue
            
        with open(doc, "r", encoding="utf-8") as f:
            content = f.read()
            
        updated_content = content
        
        # Substitui os hashes na tabela Markdown
        # Formatos comuns:
        # | `caminho/do/arquivo` | `HASH_VELHO` |
        # | `caminho/do/arquivo` | Descrição | `HASH_VELHO` |
        # | caminho/do/arquivo | Descrição | HASH_VELHO |
        
        for file_path, file_hash in hashes.items():
            base_name = os.path.basename(file_path)
            
            # Padrão 1: `caminho/do/arquivo` | `HASH`
            pattern1 = rf"(`{re.escape(file_path)}`\s*\|\s*`)[^`]+(`)"
            updated_content = re.sub(pattern1, rf"\g<1>{file_hash}\g<2>", updated_content)
            
            # Padrão 2: `caminho/do/arquivo` | Descrição | `HASH` ou `[HASH_PENDENTE]`
            pattern2 = rf"(`{re.escape(file_path)}`\s*\|[^|]+\|\s*`)[^`]+(`)"
            updated_content = re.sub(pattern2, rf"\g<1>{file_hash}\g<2>", updated_content)

            # Padrão 3: `caminho/do/arquivo` | `HASH` (sem crase no hash)
            pattern3 = rf"(`{re.escape(file_path)}`\s*\|\s*)[0-9a-fA-F]{{64}}"
            updated_content = re.sub(pattern3, rf"\g<1>{file_hash}", updated_content)
            
            # Padrão 4: `caminho/do/arquivo` | Descrição | `HASH` (sem crase no hash)
            pattern4 = rf"(`{re.escape(file_path)}`\s*\|[^|]+\|\s*)[0-9a-fA-F]{{64}}"
            updated_content = re.sub(pattern4, rf"\g<1>{file_hash}", updated_content)
            
        with open(doc, "w", encoding="utf-8") as f:
            f.write(updated_content)
        print(f"[OK] Documento '{doc}' atualizado com hashes calculados.")

def main():
    print("=" * 80)
    print("   INICIANDO ATUALIZAÇÃO AUTOMÁTICA DE HASHES CRIPTOGRÁFICOS")
    print("=" * 80)
    
    # 1. Calcula hashes dos arquivos fonte principais
    calculated_hashes = {}
    for filepath in FILES_TO_HASH:
        h = calculate_sha256(filepath)
        if h:
            calculated_hashes[filepath] = h
            print(f"Calculado: {filepath:<55} -> {h}")
            
    # 2. Atualiza tabelas markdown com os hashes calculados
    update_markdown_tables(calculated_hashes)
    
    # 3. Agora calcula o hash dos próprios documentos de documentação e atualiza as auto-referências cruzadas
    # (Para o ORGANIZACAO_ATIVOS.md conter o hash do NORMATIZACAO_JURIDICO_TECNICA.md e vice-versa)
    doc_hashes = {}
    for doc in TARGET_DOCUMENTS:
        h = calculate_sha256(doc)
        if h:
            doc_hashes[doc] = h
            print(f"Calculado Documento: {doc:<47} -> {h}")
            
    # Executa uma segunda rodada de atualização apenas com os hashes dos próprios documentos de documentação
    update_markdown_tables(doc_hashes)
    
    # 4. Exibe resultado final
    print("=" * 80)
    print("   ATUALIZAÇÃO DE CONFORMIDADE DE ATIVOS CONCLUÍDA COM SUCESSO!")
    print("=" * 80)

if __name__ == "__main__":
    main()
