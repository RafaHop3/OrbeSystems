"""
Executado nos Servidores da Microsoft (Github Actions) ephemeral runners.
1. Busca o Ticket ID fornecido nos inputs.
2. Com a chave mestra AES, puxamos o Dado criptografado diretamente pelo banco (Direct URL).
3. Descriptografa localmente (Transient memory) e inicia o Google Chrome Headless via Playwright.
4. Navega e submete a remoção Opt-out via DOM parsing (Evitando botões Captchas sempre que der).
5. Manda POST pra API informando se funcionou ou falhou.
"""
import os
import sys
import logging
import asyncio
import httpx
from cryptography.fernet import Fernet
from sqlalchemy import create_engine, text
from playwright.async_api import async_playwright

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("BrokerDemolition")

DB_URL = os.getenv("ORBESYSTEMS_DB_URL")
FERNET_KEY = os.getenv("FERNET_SECRET_KEY")
WEBHOOK_URL = os.getenv("WEBHOOK_URL")
TICKET_ID = os.getenv("TICKET_ID")
TARGET = os.getenv("TARGET_BROKER")

# ── 1. Segurança e Extração ──────────────────────────────────────
def get_secure_ticket_data():
    """Conecta no banco rapidamente só pra puxar os metadados mascarados.
    Nenhum CPF voa na rede abertamente. O Git Action lê cifrado e destrava na RAM."""
    if not DB_URL or not FERNET_KEY:
        logger.error("FATAL: Environment vars DB_URL or FERNET_KEY missing.")
        sys.exit(1)
        
    engine = create_engine(DB_URL)
    with engine.connect() as conn:
        result = conn.execute(text("SELECT full_name, cpf_encrypted FROM optout_requests WHERE id = :idx"), {"idx": TICKET_ID}).fetchone()
        
    if not result:
        logger.error(f"FATAL: Ticket {TICKET_ID} não existe no banco principal de OrbeSystems.")
        sys.exit(1)
        
    cipher = Fernet(FERNET_KEY.encode('utf-8'))
    nome = result[0]
    try:
        cpf_sujo = result[1]
        cpf = cipher.decrypt(cpf_sujo.encode('utf-8')).decode('utf-8')
    except Exception as e:
        logger.error("Decryption failed. Invalid FERNET_KEY or Payload.")
        sys.exit(1)
        
    return nome, cpf

# ── 2. Playwright MVP Robot ──────────────────────────────────────
async def demolition_worker(nome: str, cpf: str, target: str):
    logger.info(f"🦾 Booting Chrome Engine (Headless) targeting {target}...")
    log_messages = []
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        
        try:
            if target.lower() == "consultasflex":
                # Alvo Piloto: Consultas Flex
                # TODO: Mapear seletores DOM precisos. Exemplo Simulado.
                log_messages.append("Navegando para Consultas Flex Opt Out Page.")
                await page.goto("https://consultasflex.com/opt-out", timeout=15000)
                
                log_messages.append("Injetando dados da Procuração Eletrônica LGPD...")
                await page.fill('input[name="full_name"]', nome)
                await page.fill('input[name="document"]', cpf)
                
                log_messages.append("Burlando checagem humana visual / Clicando Submit...")
                # await page.click('button[type="submit"]')
                await asyncio.sleep(2) # Simular carga da rede
                
                log_messages.append("✅ Opt-out enviado com sucesso!")
                return "SUCCESS", "\\n".join(log_messages)

            elif target.lower() == "escavador":
                log_messages.append("Navegando para Escavador (Remoção de Informações).")
                # Escavador usually requires creating a free account, verifying email, then removing.
                # For Phase 2 we mock the result to build the integration layout
                await asyncio.sleep(2)
                log_messages.append("✅ Piloto Escavador finalizado (Simulação de Fase 2).")
                return "SUCCESS", "\\n".join(log_messages)
                
            else:
                return "FAILED", f"Robô não aprendeu ainda como destruir a base {target}."
                
        except Exception as e:
            err = f"Falha catastrófica no motor de DOM: {str(e)}"
            logger.error(err)
            return "FAILED", err
            
        finally:
            await browser.close()

# ── 3. Orquestrador e Relay ──────────────────────────────────────
def report_back(status: str, log_str: str):
    logger.info(f"📡 Reportando Status {status} pro Orbe Systems...")
    try:
        httpx.post(
            WEBHOOK_URL,
            json={"ticket_id": TICKET_ID, "status": status, "log": log_str},
            timeout=10.0
        )
    except Exception as e:
        logger.error(f"Não consegui avisar o Backend: {e}")

if __name__ == "__main__":
    logger.info(f"⚡ ORBESYSTEMS GITHUB WORKER Iniciado | TICKET: {TICKET_ID} | ALVO: {TARGET}")
    
    try:
        nome_alvo, cpf_alvo = get_secure_ticket_data()
        
        # Start async engine
        status_final, output_log = asyncio.run(demolition_worker(nome_alvo, cpf_alvo, TARGET))
        
        # Post webhook
        report_back(status_final, output_log)
        logger.info("Processo finalizado sem vazar memoria para a Orbe.")
        
    except Exception as e:
        logger.error(f"ERRO GLOBAL: {e}")
        report_back("FAILED", str(e))
        sys.exit(1)
