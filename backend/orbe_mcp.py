"""
orbe_mcp.py — Model Context Protocol (MCP) Server
Orbe Systems Backend Ponte Gemini <-> Servidor

Este script sobe um servidor local via SSE (Server-Sent Events) usando FastMCP.
O LLM (e.g. Gemini) através do ngrok acessa este servidor.
"""

from fastmcp import FastMCP

# 1. Inicializa o servidor da Orbe Systems
mcp = FastMCP("OrbeSystemsMCP")

# 2. Primeira ferramenta (Tool) — Checagem de saúde da infraestrutura
@mcp.tool()
def verificar_status_sistemas() -> str:
    """Verifica a saúde da infraestrutura e dos serviços da Orbe Systems."""
    # Como isso rodará junto ao backend, você poderia fazer chamadas
    # aos clients do boto3 ou requests para os healtchecks aqui na vida real.
    return "Status: Operacional. Todos os microsserviços estão rodando normalmente."

# 3. Ferramenta de banco de dados — Buscando os leads
@mcp.tool()
def buscar_ultimos_leads(limite: int = 5) -> str:
    """Busca os leads mais recentes no banco de dados PostgreSQL."""
    # Exemplo: import da sua engine SQLAlchemy:
    # from database import SessionLocal
    # from models import Lead
    # with SessionLocal() as db:
    #     leads = db.query(Lead).order_by(Lead.created_at.desc()).limit(limite).all()
    # return str(leads)
    
    # Retorno mock para testes locais iniciais:
    return f"Retornando os últimos {limite} leads simulados: Lead 1 (João), Lead 2 (Maria), Lead 3 (Pedro)."

# 4. Servidor rodando em modo SSE
if __name__ == "__main__":
    print("Iniciando Servidor MCP da Orbe Systems na porta 8000...")
    print("Para expor, execute em outro terminal: ngrok http 8000")
    mcp.run(transport="sse")
