# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
"""
╔══════════════════════════════════════════════════════════════╗
║   ORBE SYSTEMS — SUITE DE TESTES COMPLETA  v1.0             ║
║   Testa TODOS os recursos disponíveis na API local          ║
╚══════════════════════════════════════════════════════════════╝
Execute com:
    .venv\Scripts\python.exe ..\test_completo.py
"""

import requests
import json
import time
import sys
from datetime import datetime

BASE_URL = "http://127.0.0.1:8000"

# ──────────────────────────────────────────────────────────────
# Utilitários de Output
# ──────────────────────────────────────────────────────────────
VERDE  = "\033[92m"
VERM   = "\033[91m"
AMAR   = "\033[93m"
CIANO  = "\033[96m"
BOLD   = "\033[1m"
RESET  = "\033[0m"
DIM    = "\033[2m"

resultados = []

def sep(titulo=""):
    print(f"\n{CIANO}{'═'*60}{RESET}")
    if titulo:
        print(f"{BOLD}{CIANO}  {titulo}{RESET}")
        print(f"{CIANO}{'─'*60}{RESET}")

def ok(nome, msg=""):
    status = f"{VERDE}✅ PASSOU{RESET}"
    print(f"  {status}  {nome}  {DIM}{msg}{RESET}")
    resultados.append(("PASSOU", nome, msg))

def falhou(nome, msg=""):
    status = f"{VERM}❌ FALHOU{RESET}"
    print(f"  {status}  {nome}  {DIM}{msg}{RESET}")
    resultados.append(("FALHOU", nome, msg))

def aviso(nome, msg=""):
    status = f"{AMAR}⚠️  AVISO {RESET}"
    print(f"  {status}  {nome}  {DIM}{msg}{RESET}")
    resultados.append(("AVISO", nome, msg))

def checar(condicao, nome, msg_ok="", msg_fail=""):
    if condicao:
        ok(nome, msg_ok)
        return True
    else:
        falhou(nome, msg_fail)
        return False

# ──────────────────────────────────────────────────────────────
# Tokens de auth
# ──────────────────────────────────────────────────────────────
admin_token = None
user_token = None
premium_token = None
test_user_id = None
test_user_email = f"teste_auto_{int(time.time())}@orbesystems-qa.com"
test_user_password = "Senha@Segura123"


def get_auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# ══════════════════════════════════════════════════════════════
# 1. HEALTH CHECK
# ══════════════════════════════════════════════════════════════
def test_health():
    sep("1. HEALTH CHECK")
    try:
        r = requests.get(f"{BASE_URL}/health", timeout=10)
        checar(r.status_code == 200, "GET /health status 200", f"status={r.status_code}")
        data = r.json()
        checar(data.get("status") == "operational", "Campo 'status' = operational", str(data.get("status")))
        checar("database" in data, "Campo 'database' presente", str(data.get("database")))
        checar("version" in data, "Campo 'version' presente", str(data.get("version")))
    except Exception as e:
        falhou("GET /health", str(e))


# ══════════════════════════════════════════════════════════════
# 2. PROJETOS PÚBLICOS
# ══════════════════════════════════════════════════════════════
def test_projects():
    sep("2. PROJETOS (GET /api/projects)")
    try:
        r = requests.get(f"{BASE_URL}/api/projects", timeout=15)
        checar(r.status_code == 200, "GET /api/projects status 200", f"status={r.status_code}")
        data = r.json()
        checar(isinstance(data, list), "Retorna lista de projetos", f"tipo={type(data).__name__}")
        if isinstance(data, list) and len(data) > 0:
            checar(len(data) > 0, f"Retornou {len(data)} projeto(s)", f"count={len(data)}")
            proj = data[0]
            checar("name" in proj, "Campo 'name' presente no projeto")
            checar("html_url" in proj, "Campo 'html_url' presente")
            checar("is_featured" in proj, "Campo 'is_featured' presente")
            # Premium-only não deve aparecer para anônimos
            premium_visible = any(p.get("is_premium_only") for p in data)
            checar(not premium_visible, "Projetos premium ocultados para usuário anônimo")
        else:
            aviso("GET /api/projects", "Lista vazia retornada")
    except Exception as e:
        falhou("GET /api/projects", str(e))


# ══════════════════════════════════════════════════════════════
# 3. AUTH — ADMIN
# ══════════════════════════════════════════════════════════════
def test_auth_admin():
    global admin_token
    sep("3. AUTH ADMIN (POST /api/auth/login)")
    
    # Credenciais erradas
    try:
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"username": "admin_errado", "password": "senha_errada"},
                          timeout=10)
        checar(r.status_code == 401, "Login admin com credenciais erradas → 401", f"status={r.status_code}")
    except Exception as e:
        falhou("Login admin inválido", str(e))

    # Credenciais corretas (do .env)
    try:
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"username": "rafael_admin", "password": "Rafael@1234"},
                          timeout=10)
        if r.status_code == 200:
            admin_token = r.json().get("access_token")
            checar(bool(admin_token), "Login admin com credenciais corretas → 200 + token", f"token={admin_token[:20]}...")
        else:
            aviso("Login admin", f"status={r.status_code} — verifique senha no .env (hash bcrypt). Testes admin serão pulados.")
    except Exception as e:
        falhou("Login admin", str(e))


# ══════════════════════════════════════════════════════════════
# 4. AUTH — USUÁRIO PÚBLICO
# ══════════════════════════════════════════════════════════════
def test_auth_user():
    global user_token, test_user_id
    sep("4. AUTH USUÁRIO (Register + Login)")

    # Registro com senha fraca
    try:
        r = requests.post(f"{BASE_URL}/api/users/register",
                          json={"email": "fraco@teste.com", "password": "123"},
                          timeout=10)
        checar(r.status_code in [422, 400], "Registro com senha fraca → erro 4xx", f"status={r.status_code}")
    except Exception as e:
        falhou("Registro senha fraca", str(e))

    # Registro válido
    try:
        r = requests.post(f"{BASE_URL}/api/users/register",
                          json={"email": test_user_email, "password": test_user_password},
                          timeout=10)
        checar(r.status_code == 201, f"Registro novo usuário → 201", f"email={test_user_email}")
        if r.status_code == 201:
            data = r.json()
            user_token = data.get("access_token")
            test_user_id = data.get("user", {}).get("id")
            checar(bool(user_token), "Registro retorna access_token", f"token={user_token[:20] if user_token else 'None'}...")
            checar(data.get("user", {}).get("role") == "user", "Role padrão = 'user'", f"role={data.get('user', {}).get('role')}")
    except Exception as e:
        falhou("Registro novo usuário", str(e))

    # Registro duplicado
    try:
        r = requests.post(f"{BASE_URL}/api/users/register",
                          json={"email": test_user_email, "password": test_user_password},
                          timeout=10)
        checar(r.status_code == 409, "Registro email duplicado → 409", f"status={r.status_code}")
    except Exception as e:
        falhou("Registro duplicado", str(e))

    # Login válido
    try:
        r = requests.post(f"{BASE_URL}/api/users/login",
                          json={"email": test_user_email, "password": test_user_password},
                          timeout=10)
        checar(r.status_code == 200, "Login usuário válido → 200", f"status={r.status_code}")
        if r.status_code == 200:
            data = r.json()
            user_token = data.get("access_token")
            test_user_id = data.get("user", {}).get("id")
            checar(bool(user_token), "Login retorna access_token", "OK")
    except Exception as e:
        falhou("Login usuário", str(e))

    # Login inválido
    try:
        r = requests.post(f"{BASE_URL}/api/users/login",
                          json={"email": test_user_email, "password": "senhaErrada"},
                          timeout=10)
        checar(r.status_code == 401, "Login com senha errada → 401", f"status={r.status_code}")
    except Exception as e:
        falhou("Login inválido", str(e))


# ══════════════════════════════════════════════════════════════
# 5. GET /api/auth/me
# ══════════════════════════════════════════════════════════════
def test_me():
    sep("5. GET /api/auth/me")
    
    # Sem token
    try:
        r = requests.get(f"{BASE_URL}/api/auth/me", timeout=10)
        checar(r.status_code == 200 and r.json() is None, "GET /me sem token → 200 + null", f"body={r.text[:50]}")
    except Exception as e:
        falhou("GET /me sem token", str(e))

    # Com token user
    if user_token:
        try:
            r = requests.get(f"{BASE_URL}/api/auth/me", headers=get_auth_headers(user_token), timeout=10)
            checar(r.status_code == 200, "GET /me com token user → 200", f"status={r.status_code}")
            data = r.json()
            checar("email" in (data or {}), "Retorna email do usuário", str((data or {}).get("email", "?")))
        except Exception as e:
            falhou("GET /me com token", str(e))


# ══════════════════════════════════════════════════════════════
# 6. PROTEÇÃO DE ROTAS PREMIUM
# ══════════════════════════════════════════════════════════════
def test_premium_protection():
    sep("6. PROTEÇÃO ROTAS PREMIUM (sem acesso premium)")
    premium_endpoints = [
        ("POST", "/api/imortal/cyber",        {"prompt": "teste"}),
        ("POST", "/api/imortal/marketing",     {"prompt": "teste"}),
        ("POST", "/api/imortal/demographic",   {"prompt": "teste"}),
        ("GET",  "/api/imortal/default",       None),
        ("POST", "/api/imortal/generate",      {"prompt": "teste"}),
        ("POST", "/api/powershell-bot/chat",   {"prompt": "teste"}),
        ("POST", "/api/powershell-bot/analyze-script", {"script_content": "Get-Process"}),
        ("POST", "/api/suite-inteligente/compress", {"content": "hello world"}),
        ("POST", "/api/suite-inteligente/generate-document", {
            "template_type": "audit", "company_name": "Teste", "auditor_name": "Ana", "vulnerabilities": []
        }),
    ]

    headers = get_auth_headers(user_token) if user_token else {}
    for method, path, body in premium_endpoints:
        try:
            if method == "POST":
                r = requests.post(f"{BASE_URL}{path}", json=body, headers=headers, timeout=10)
            else:
                r = requests.get(f"{BASE_URL}{path}", headers=headers, timeout=10)
            checar(r.status_code in [401, 403], f"{method} {path} bloqueado sem premium",
                   f"status={r.status_code}")
        except Exception as e:
            falhou(f"{method} {path}", str(e))


# ══════════════════════════════════════════════════════════════
# 7. IMOBVERSE — ROTAS PÚBLICAS
# ══════════════════════════════════════════════════════════════
def test_imobverse_public():
    sep("7. IMOBVERSE — ROTAS PÚBLICAS")

    # Listagem pública
    try:
        r = requests.get(f"{BASE_URL}/api/imobverse/properties", timeout=10)
        checar(r.status_code == 200, "GET /api/imobverse/properties → 200", f"status={r.status_code}")
        checar(isinstance(r.json(), list), "Retorna lista", f"tipo={type(r.json()).__name__}")
    except Exception as e:
        falhou("GET /api/imobverse/properties", str(e))

    # Listagem com filtros
    try:
        r = requests.get(f"{BASE_URL}/api/imobverse/properties?city=São Paulo&deal_type=aluguel", timeout=10)
        checar(r.status_code == 200, "GET /properties com filtros → 200", f"count={len(r.json())}")
    except Exception as e:
        falhou("GET /properties com filtros", str(e))

    # Senior Match (público)
    try:
        r = requests.post(f"{BASE_URL}/api/imobverse/senior-match",
                          json={"city": "São Paulo", "importance_accessibility": "high", "importance_security": "high",
                                "importance_convenience": "medium", "importance_silence": "low"},
                          timeout=10)
        checar(r.status_code == 200, "POST /imobverse/senior-match → 200", f"status={r.status_code}")
        data = r.json()
        checar(isinstance(data, list), "Retorna lista de matches", f"count={len(data)}")
        if data:
            checar("match_percentage" in data[0], "Match tem 'match_percentage'", str(data[0].get("match_percentage")))
            checar("breakdown" in data[0], "Match tem 'breakdown'", "")
            # Garantir que a ordenação está correta (maior % primeiro)
            pcts = [item.get("match_percentage", 0) for item in data]
            checar(pcts == sorted(pcts, reverse=True), "Resultados ordenados por match_percentage DESC", str(pcts))
    except Exception as e:
        falhou("POST /imobverse/senior-match", str(e))

    # Imóvel não encontrado
    try:
        r = requests.get(f"{BASE_URL}/api/imobverse/properties/id-que-nao-existe", timeout=10)
        checar(r.status_code == 404, "GET /properties/{id_inexistente} → 404", f"status={r.status_code}")
    except Exception as e:
        falhou("GET /properties/id-inexistente", str(e))


# ══════════════════════════════════════════════════════════════
# 8. POWERSHELL BOT — ANÁLISE ESTÁTICA (requer premium)
# Aqui testamos usando mock local (sem Gemini/Ollama)
# ══════════════════════════════════════════════════════════════
def test_powershell_static_analysis():
    """
    O endpoint /analyze-script usa lógica local (regex) e não depende de IA externa.
    Mas ainda exige autenticação premium. Como não temos token premium nos testes
    automatizados, testamos apenas a proteção de rota.
    """
    sep("8. POWERSHELL BOT — ROTA BLOQUEADA SEM PREMIUM")
    try:
        r = requests.post(f"{BASE_URL}/api/powershell-bot/analyze-script",
                          json={"script_content": "Get-Process"},
                          timeout=10)
        checar(r.status_code in [401, 403], "POST /powershell-bot/analyze-script sem premium → 401/403",
               f"status={r.status_code}")
    except Exception as e:
        falhou("POST /powershell-bot/analyze-script", str(e))


# ══════════════════════════════════════════════════════════════
# 9. SUITE INTELIGENTE — ROTAS BLOQUEADAS SEM PREMIUM
# ══════════════════════════════════════════════════════════════
def test_suite_inteligente():
    sep("9. SUITE INTELIGENTE — PROTEÇÃO DE ROTAS")
    
    endpoints = [
        ("/api/suite-inteligente/compress", {"content": "hello world, hello world, hello world"}),
        ("/api/suite-inteligente/convert",  {"mode": "json2csv", "content": '[{"a":1}]'}),
        ("/api/suite-inteligente/generate-document", {
            "template_type": "audit",
            "company_name": "TesteCorp",
            "auditor_name": "Ana Lima",
            "vulnerabilities": [{"severity": "HIGH", "component": "API", "description": "SQL Injection", "status": "Open"}]
        }),
    ]
    
    headers = get_auth_headers(user_token) if user_token else {}
    for path, body in endpoints:
        try:
            r = requests.post(f"{BASE_URL}{path}", json=body, headers=headers, timeout=10)
            checar(r.status_code in [401, 403], f"POST {path} bloqueado sem premium → 401/403",
                   f"status={r.status_code}")
        except Exception as e:
            falhou(f"POST {path}", str(e))


# ══════════════════════════════════════════════════════════════
# 10. ANÁLISE DE SEGURANÇA DA API
# ══════════════════════════════════════════════════════════════
def test_security():
    sep("10. ANÁLISE DE SEGURANÇA DA API")
    
    # CORS Headers presentes
    try:
        r = requests.options(f"{BASE_URL}/health",
                             headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "GET"},
                             timeout=10)
        has_cors = "access-control-allow-origin" in r.headers or r.status_code in [200, 204]
        checar(has_cors, "CORS headers presentes em preflight OPTIONS", f"status={r.status_code}")
    except Exception as e:
        aviso("CORS preflight", str(e))

    # Docs protegidos por HTTP Basic (sem credenciais → 401)
    try:
        r = requests.get(f"{BASE_URL}/docs", timeout=10)
        checar(r.status_code == 401, "GET /docs sem credenciais → 401 (proteção Basic Auth)", f"status={r.status_code}")
    except Exception as e:
        falhou("GET /docs sem credenciais", str(e))

    # SQL injection básico em query params
    try:
        r = requests.get(f"{BASE_URL}/api/imobverse/properties?city='; DROP TABLE users;--", timeout=10)
        checar(r.status_code in [200, 400, 422], "SQL injection em query param não gera 500",
               f"status={r.status_code}")
    except Exception as e:
        aviso("SQL injection test", str(e))

    # Token inválido → 401 em rota protegida
    try:
        r = requests.get(f"{BASE_URL}/api/imortal/default",
                         headers={"Authorization": "Bearer token_totalmente_falso_12345"},
                         timeout=10)
        checar(r.status_code in [401, 403], "Token JWT inválido → 401/403", f"status={r.status_code}")
    except Exception as e:
        falhou("Token JWT inválido", str(e))

    # Token ausente em rota premium
    try:
        r = requests.post(f"{BASE_URL}/api/imortal/cyber",
                          json={"prompt": "teste"},
                          timeout=10)
        checar(r.status_code in [401, 403], "Sem token em rota premium → 401/403", f"status={r.status_code}")
    except Exception as e:
        falhou("Sem token em rota premium", str(e))


# ══════════════════════════════════════════════════════════════
# 11. IMOBVERSE — LEAD (criação sem auth)
# ══════════════════════════════════════════════════════════════
def test_imobverse_lead():
    sep("11. IMOBVERSE — CRIAÇÃO DE LEAD (sem auth)")
    
    # Lead em imóvel inexistente
    try:
        r = requests.post(f"{BASE_URL}/api/imobverse/leads",
                          json={
                              "property_id": "id-demo-nao-existe",
                              "customer_name": "João Teste",
                              "customer_email": "joao@teste.com",
                              "customer_phone": "11999999999",
                              "message": "Tenho interesse no imóvel"
                          },
                          timeout=10)
        checar(r.status_code == 404, "Lead em imóvel inexistente → 404", f"status={r.status_code}")
    except Exception as e:
        falhou("POST /imobverse/leads (imóvel inexistente)", str(e))


# ══════════════════════════════════════════════════════════════
# 12. RATE LIMITING
# ══════════════════════════════════════════════════════════════
def test_rate_limiting():
    sep("12. RATE LIMITING (Auth Login — 5/min)")
    print(f"  {DIM}Enviando 6 requisições rápidas para /api/auth/login...{RESET}")
    blocked = False
    for i in range(6):
        try:
            r = requests.post(f"{BASE_URL}/api/auth/login",
                              json={"username": "usuario_spam_teste", "password": "senha_errada"},
                              timeout=5)
            if r.status_code == 429:
                blocked = True
                break
        except Exception:
            break
    checar(blocked, "Rate limiting ativou 429 após múltiplos logins rápidos",
           "Rate limiter funcionando" if blocked else "Atenção: 429 não ativado nos 6 testes")


# ══════════════════════════════════════════════════════════════
# 13. TEST EVENTS ENDPOINT
# ══════════════════════════════════════════════════════════════
def test_events():
    sep("13. TEST EVENTS (GET/POST/DELETE /api/test-events)")
    
    # 1. GET sem token
    try:
        r = requests.get(f"{BASE_URL}/api/test-events", timeout=10)
        checar(r.status_code in [401, 403], "GET /api/test-events sem token → 401/403", f"status={r.status_code}")
    except Exception as e:
        falhou("GET /api/test-events sem token", str(e))

    # 2. GET com token user
    if user_token:
        try:
            r = requests.get(f"{BASE_URL}/api/test-events", headers=get_auth_headers(user_token), timeout=10)
            checar(r.status_code == 200, "GET /api/test-events com token user → 200", f"status={r.status_code}")
            data = r.json()
            checar(isinstance(data, list) and len(data) > 0, "Retornou lista de eventos semeados", f"count={len(data)}")
        except Exception as e:
            falhou("GET /api/test-events com token", str(e))

    # 3. POST novo evento
    try:
        payload = {
            "event_type": "unit_test_run",
            "service": "gateway_tester",
            "status": "success",
            "message": "Automated system test suite executed successfully",
            "details": {"test_count": 13, "environment": "QA"}
        }
        r = requests.post(f"{BASE_URL}/api/test-events", json=payload, timeout=10)
        checar(r.status_code == 201, "POST /api/test-events → 201", f"status={r.status_code}")
        if r.status_code == 201:
            data = r.json()
            checar(data.get("event_type") == "unit_test_run", "Campo 'event_type' correto", data.get("event_type"))
            checar(data.get("message") == "Automated system test suite executed successfully", "Campo 'message' correto", data.get("message"))
    except Exception as e:
        falhou("POST /api/test-events", str(e))

    # 4. DELETE sem admin token (com user_token)
    if user_token:
        try:
            r = requests.delete(f"{BASE_URL}/api/test-events", headers=get_auth_headers(user_token), timeout=10)
            checar(r.status_code in [401, 403], "DELETE /api/test-events com token user → 401/403 (bloqueado)", f"status={r.status_code}")
        except Exception as e:
            falhou("DELETE /api/test-events com token user", str(e))

    # 5. DELETE com admin token
    if admin_token:
        try:
            r = requests.delete(f"{BASE_URL}/api/test-events", headers=get_auth_headers(admin_token), timeout=10)
            checar(r.status_code == 204, "DELETE /api/test-events com admin token → 204 (sucesso)", f"status={r.status_code}")
            
            # Verificar se limpou
            r_check = requests.get(f"{BASE_URL}/api/test-events", headers=get_auth_headers(admin_token), timeout=10)
            checar(r_check.status_code == 200 and len(r_check.json()) == 0, "GET após DELETE retorna lista vazia", f"count={len(r_check.json()) if r_check.status_code == 200 else '?'}")
        except Exception as e:
            falhou("DELETE /api/test-events com admin token", str(e))



# ══════════════════════════════════════════════════════════════
# 14. OFFLINE AGENT INTEGRATION TESTS
# ══════════════════════════════════════════════════════════════
def test_offline_agent():
    global premium_token
    sep("14. OFFLINE AGENT")

    if not admin_token:
        aviso("test_offline_agent", "admin_token não disponível. Pulando testes do offline agent.")
        return
    if not test_user_id:
        aviso("test_offline_agent", "test_user_id não disponível. Pulando testes do offline agent.")
        return

    # 1. Elevar novo usuário a premium
    try:
        headers = get_auth_headers(admin_token)
        headers["X-CSRF-Token"] = "CSRF_TOKEN_TEST"
        r = requests.post(f"{BASE_URL}/api/admin/users/{test_user_id}/role?role=premium", headers=headers, timeout=10)
        if checar(r.status_code == 200, "Elevar usuário a premium → 200", f"status={r.status_code}"):
            # Login novamente para obter token premium
            r_login = requests.post(f"{BASE_URL}/api/users/login",
                                    json={"email": test_user_email, "password": test_user_password},
                                    timeout=10)
            if checar(r_login.status_code == 200, "Login do novo usuário premium → 200", f"status={r_login.status_code}"):
                premium_token = r_login.json().get("access_token")
                checar(bool(premium_token), "Login premium retorna access_token", "OK")
                checar(r_login.json().get("user", {}).get("role") == "premium", "Usuário agora possui role 'premium'", f"role={r_login.json().get('user', {}).get('role')}")
    except Exception as e:
        falhou("Elevar usuário a premium", str(e))

    if not premium_token:
        aviso("test_offline_agent", "premium_token não configurado. Pulando restante dos testes do offline agent.")
        return

    # 2. Submeter job sem token premium (anônimo ou token inválido)
    # Anônimo
    try:
        r = requests.post(f"{BASE_URL}/api/offline-agent/submit", json={"prompt": "Test offline agent anonymous"}, timeout=10)
        checar(r.status_code in [401, 403], "Submeter job sem token → 401/403", f"status={r.status_code}")
    except Exception as e:
        falhou("Submeter job sem token", str(e))

    # Token inválido
    try:
        r = requests.post(f"{BASE_URL}/api/offline-agent/submit",
                          json={"prompt": "Test offline agent invalid token"},
                          headers=get_auth_headers("token_invalido_123"),
                          timeout=10)
        checar(r.status_code in [401, 403], "Submeter job com token inválido → 401/403", f"status={r.status_code}")
    except Exception as e:
        falhou("Submeter job com token inválido", str(e))

    # 3. Submeter job com token premium → 200 + job_id
    job_id = None
    try:
        r = requests.post(f"{BASE_URL}/api/offline-agent/submit",
                          json={"prompt": "Test premium offline agent prompt execution"},
                          headers=get_auth_headers(premium_token),
                          timeout=10)
        if checar(r.status_code == 200, "Submeter job com token premium → 200", f"status={r.status_code}"):
            data = r.json()
            job_id = data.get("job_id")
            checar(bool(job_id), "Job submetido retornou job_id", f"job_id={job_id}")
    except Exception as e:
        falhou("Submeter job com token premium", str(e))

    if not job_id:
        aviso("test_offline_agent", "job_id não obtido. Pulando testes de listagem e detalhes.")
        return

    # 4. Listar jobs → lista contendo o job_id submetido
    try:
        r = requests.get(f"{BASE_URL}/api/offline-agent/jobs",
                         headers=get_auth_headers(premium_token),
                         timeout=10)
        if checar(r.status_code == 200, "Listar jobs offline com token premium → 200", f"status={r.status_code}"):
            data = r.json()
            if checar(isinstance(data, list), "Retorna lista de jobs", f"tipo={type(data).__name__}"):
                job_ids = [job.get("job_id") for job in data]
                checar(job_id in job_ids, f"Lista de jobs contém o job_id submetido ({job_id})", f"jobs={job_ids}")
    except Exception as e:
        falhou("Listar jobs offline com token premium", str(e))

    # 5. Buscar status de um job específico → sucesso
    try:
        r = requests.get(f"{BASE_URL}/api/offline-agent/jobs/{job_id}",
                         headers=get_auth_headers(premium_token),
                         timeout=10)
        if checar(r.status_code == 200, f"Buscar status do job {job_id} → 200", f"status={r.status_code}"):
            data = r.json()
            checar(data.get("job_id") == job_id, "Resultado de buscar job tem job_id correto", str(data.get("job_id")))
            checar("status" in data, "Resultado de buscar job tem campo status", str(data.get("status")))
    except Exception as e:
        falhou(f"Buscar status do job {job_id}", str(e))

    # 6. Limpar jobs e verificar listagem vazia
    try:
        r = requests.delete(f"{BASE_URL}/api/offline-agent/jobs",
                            headers=get_auth_headers(premium_token),
                            timeout=10)
        if checar(r.status_code == 200, "Limpar jobs offline com token premium → 200", f"status={r.status_code}"):
            r_list = requests.get(f"{BASE_URL}/api/offline-agent/jobs",
                                  headers=get_auth_headers(premium_token),
                                  timeout=10)
            checar(r_list.status_code == 200 and isinstance(r_list.json(), list) and len(r_list.json()) == 0,
                   "Listagem subsequente retorna lista vazia",
                   f"count={len(r_list.json()) if r_list.status_code == 200 and isinstance(r_list.json(), list) else '?'}")
    except Exception as e:
        falhou("Limpar jobs offline com token premium", str(e))


# ══════════════════════════════════════════════════════════════
# RELATÓRIO FINAL
# ══════════════════════════════════════════════════════════════
def relatorio_final():
    sep("RELATÓRIO FINAL")
    total    = len(resultados)
    passou   = sum(1 for r in resultados if r[0] == "PASSOU")
    falhou_n = sum(1 for r in resultados if r[0] == "FALHOU")
    avisos   = sum(1 for r in resultados if r[0] == "AVISO")

    print(f"\n  {BOLD}Total de testes:{RESET}   {total}")
    print(f"  {VERDE}{BOLD}✅ Passou:{RESET}          {passou}")
    print(f"  {VERM}{BOLD}❌ Falhou:{RESET}          {falhou_n}")
    print(f"  {AMAR}{BOLD}⚠️  Avisos:{RESET}          {avisos}")
    
    pct = (passou / total * 100) if total > 0 else 0
    print(f"\n  {BOLD}Taxa de sucesso:{RESET}   {pct:.1f}%")
    
    if falhou_n > 0:
        print(f"\n  {VERM}{BOLD}Testes com falha:{RESET}")
        for r in resultados:
            if r[0] == "FALHOU":
                print(f"    ❌  {r[1]}  {DIM}{r[2]}{RESET}")
    
    print(f"\n  {DIM}Executado em: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}{RESET}")
    print(f"{CIANO}{'═'*60}{RESET}\n")
    
    return falhou_n == 0


# ══════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════
if __name__ == "__main__":
    print(f"""
{BOLD}{CIANO}
+--------------------------------------------------------------+
| [*] ORBE SYSTEMS -- SUITE DE TESTES COMPLETA               |
| Backend: {BASE_URL}                        |
+--------------------------------------------------------------+
{RESET}""")

    # Aguarda o server ficar pronto
    print(f"  {DIM}Aguardando backend estar pronto...{RESET}")
    for _ in range(10):
        try:
            r = requests.get(f"{BASE_URL}/health", timeout=3)
            if r.status_code == 200:
                print(f"  {VERDE}✅ Backend respondendo!{RESET}\n")
                break
        except Exception:
            time.sleep(1)
    else:
        print(f"  {VERM}❌ Backend não respondeu em 10 segundos. Abortando.{RESET}")
        sys.exit(1)

    # Executa todos os grupos de testes
    test_health()
    test_projects()
    test_auth_admin()
    test_auth_user()
    test_me()
    test_premium_protection()
    test_imobverse_public()
    test_powershell_static_analysis()
    test_suite_inteligente()
    test_security()
    test_imobverse_lead()
    test_rate_limiting()
    test_events()
    test_offline_agent()
    
    sucesso = relatorio_final()
    sys.exit(0 if sucesso else 1)
