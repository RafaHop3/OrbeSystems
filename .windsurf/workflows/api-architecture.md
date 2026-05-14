---
description: Arquitetura de APIs - Integrações e Endpoints
---

# Arquitetura de APIs do Orbe Systems

## Overview

O Orbe Systems utiliza uma arquitetura de APIs distribuída com comunicação entre **Frontend (Next.js/Vercel)** e **Backend (FastAPI/Render)**, além de integrações externas com **GitHub API**.

## Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                        USUÁRIO                              │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND (Next.js)                                         │
│  ─────────────────                                          │
│  • Vercel Edge Network                                      │
│  • React Server Components                                  │
│  • Static Site Generation (SSG)                             │
│  • Client-side fetch()                                      │
└──────────┬────────────────────┬───────────────────────────────┘
           │                  │
           │ API Interna      │ API Externa
           ▼                  ▼
┌──────────────────┐  ┌──────────────────────────────┐
│  BACKEND         │  │  GITHUB API                  │
│  (FastAPI)       │  │  ────────────                │
│  ─────────────   │  │  • api.github.com            │
│  • Render.com    │  │  • Rate Limit: 60/h (anon)   │
│  • SQLite/Disk   │  │  • Rate Limit: 5000/h (auth) │
│  • Python 3.12   │  │  • Bearer Token (GITHUB_TOKEN)│
└──────────────────┘  └──────────────────────────────┘
```

## APIs Utilizadas

### 1. Backend Próprio (FastAPI)

**Base URL**: `https://orbesystems.onrender.com`

#### Autenticação

- **JWT Bearer Token** para rotas administrativas
- **HTTP Basic** para health checks (desativado)
- Token gerado no login: `/api/auth/login`
- Validade: 60 minutos (configurável)

#### Endpoints Públicos

| Endpoint | Método | Descrição | Cache |
|----------|--------|-----------|-------|
| `/health` | GET | Health check do servidor | ❌ |
| `/api/projects` | GET | Lista todos os repositórios | ✅ 60s |
| `/api/analytics/list` | GET | Métricas de acesso (admin) | ❌ |

#### Endpoints Administrativos (requer JWT)

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/admin/projects` | GET | Lista com metadados editáveis |
| `/api/admin/status` | GET | Status do sistema |
| `/api/admin/projects/{id}` | POST | Atualiza metadados do repo |
| `/api/admin/repos/lookup` | POST | Busca repo no GitHub |
| `/api/admin/repos/add` | POST | Injeta novo repo no portfolio |

#### Endpoint de Autenticação

| Endpoint | Método | Descrição | Rate Limit |
|----------|--------|-----------|------------|
| `/api/auth/login` | POST | Autenticação admin | 5/min |

### 2. GitHub API

**Base URL**: `https://api.github.com`

#### Endpoints Utilizados

| Endpoint | Uso | Autenticação |
|----------|-----|--------------|
| `GET /users/{owner}/repos` | Lista repos públicos | Opcional (aumenta rate limit) |
| `GET /repos/{owner}/{repo}` | Busca repo específico | Opcional |

#### Rate Limits

```
Sem autenticação: 60 requisições/hora
Com GITHUB_TOKEN: 5.000 requisições/hora
```

#### Nosso Token

Configurado no Render:
- Variável: `GITHUB_TOKEN`
- Uso: Evita rate limit durante desenvolvimento
- Escopo: Apenas leitura de repos públicos

## Fluxos de API

### 1. Login no Admin

```
Frontend                                    Backend
────────                                    ───────
  │  POST /api/auth/login                    │
  │  Body: {username, password}              │
  │ ──────────────────────────────────────>  │
  │                                          │
  │           200 OK {access_token}          │
  │ <────────────────────────────────────────  │
  │                                          │
  │  Salva token no localStorage             │
  │  Redireciona para /admin                 │
```

### 2. Listagem de Projetos (Site Público)

```
Frontend                                    Backend                    GitHub
────────                                    ───────                    ──────
  │  GET /api/projects                       │                          │
  │ ──────────────────────────────────────>  │                          │
  │                                          │  GET /users/theorbesystems-sketch/repos
  │                                          │ ───────────────────────> │
  │                                          │                          │
  │                                          │  Lista de repos          │
  │                                          │ <────────────────────────│
  │                                          │                          │
  │                                          │  Merge com metadados     │
  │                                          │  do SQLite               │
  │           JSON com repos                 │                          │
  │ <────────────────────────────────────────│                          │
  │                                          │                          │
  │  Renderiza cards no site                 │
```

**Cache**: 60 segundos (`@alru_cache`)

### 3. Injeção de Novo Repo (Admin)

```
Admin Dashboard                           Backend                    GitHub
───────────────                           ───────                    ──────
  │  1. Digita: "rafahop3/Jovempano"       │                          │
  │  2. Clica "LOOKUP"                     │                          │
  │                                         │                          │
  │  POST /api/admin/repos/lookup          │                          │
  │  Body: {repo_name}                     │                          │
  │ ────────────────────────────────────>  │                          │
  │                                         │  GET /repos/rafahop3/Jovempano
  │                                         │ ───────────────────────> │
  │                                         │                          │
  │                                         │  Dados do repo           │
  │                                         │ <────────────────────────│
  │                                         │                          │
  │  200 OK {dados do repo}                │                          │
  │ <────────────────────────────────────────                         │
  │                                         │                          │
  │  3. Preenche descrição, imagem, URL    │                          │
  │  4. Clica "INJECT"                      │                          │
  │                                         │                          │
  │  POST /api/admin/repos/add             │                          │
  │  Body: {repo_id, repo_name, ...}       │                          │
  │ ────────────────────────────────────>  │                          │
  │                                         │  Salva no SQLite         │
  │                                         │  Limpa cache             │
  │                                         │                          │
  │  200 OK {status: "success"}            │                          │
  │ <────────────────────────────────────────                         │
```

### 4. Edição de Metadados (Admin)

```
Admin Dashboard                           Backend                    Database
───────────────                           ───────                    ─────────
  │  1. Clica no lápis de um repo          │                          │
  │  2. Edita campos                       │                          │
  │  3. Salva                              │                          │
  │                                         │                          │
  │  POST /api/admin/projects/{id}         │                          │
  │  Body: {custom_description,           │                          │
  │         image_url, deploy_url}          │                          │
  │  Headers: {Authorization: Bearer token}  │                          │
  │ ────────────────────────────────────>  │                          │
  │                                         │  Atualiza campos         │
  │                                         │  no SQLite (preserva     │
  │                                         │  campos não enviados)    │
  │                                         │                          │
  │  200 OK {status: "success"}            │                          │
  │ <────────────────────────────────────────                         │
  │                                         │                          │
  │  Site atualizado automaticamente!        │
```

## CORS (Cross-Origin Resource Sharing)

### Configuração

```python
# backend/main.py
origins = [
    "https://www.orbesystems.com.br",
    "https://orbesystems.com.br",
    # ... outros domínios permitidos
]
```

### Por que é necessário?

- Frontend roda em: `https://www.orbesystems.com.br` (Vercel)
- Backend roda em: `https://orbesystems.onrender.com` (Render)
- São **domínios diferentes** → precisam de CORS

### Headers enviados pelo backend

```
Access-Control-Allow-Origin: https://www.orbesystems.com.br
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
```

## Segurança

### Autenticação JWT

```
Header: Authorization: Bearer <token>
                        │
                        └── eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
                            │
                            └── Payload: {sub: "rafael_admin", exp: 1234567890}
```

### Rate Limiting

| Endpoint | Limite |
|----------|--------|
| `/api/auth/login` | 5 tentativas/minuto |
| `/api/projects` | 60 segundos de cache |
| Outros endpoints | Sem limitação específica |

### Proteções

- ✅ Senha armazenada com **bcrypt** (hash seguro)
- ✅ JWT com **expiração** (60 min)
- ✅ CORS restrito aos domínios corretos
- ✅ Rate limit no login (evita brute force)
- ✅ **NUNCA** expõe GITHUB_TOKEN no frontend

## Exemplos de Requisições

### 1. Login (curl)

```bash
curl -X POST https://orbesystems.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "rafael_admin", "password": "sua_senha"}'
```

**Resposta**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### 2. Listar Projetos (curl)

```bash
curl https://orbesystems.onrender.com/api/projects
```

**Resposta**:
```json
[
  {
    "id": 123456,
    "name": "OrbeSystems",
    "full_name": "theorbesystems-sketch/OrbeSystems",
    "description": "Sistema de gestão...",
    "html_url": "https://github.com/theorbesystems-sketch/OrbeSystems",
    "language": "Python",
    "stargazers_count": 5,
    "forks_count": 2,
    "topics": ["fastapi", "react"],
    "updated_at": "2026-05-08",
    "is_featured": true,
    "image_url": "/images/orbesystems.jpeg",
    "custom_description": "Descrição personalizada..."
  }
]
```

### 3. Buscar Repo no GitHub (curl)

```bash
curl -X POST https://orbesystems.onrender.com/api/admin/repos/lookup \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -d '{"repo_name": "rafahop3/Jovempano"}'
```

## Variáveis de Ambiente

### Backend (Render)

```env
# GitHub
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx

# Auth
ADMIN_USERNAME=rafael_admin
ADMIN_PASSWORD_HASH=$2b$12$...
SECRET_KEY=sua_chave_secreta_jwt

# Database
DATABASE_URL=sqlite:///./data/projects.db

# CORS
ALLOWED_ORIGINS=https://orbesystems.com.br,https://www.orbesystems.com.br
```

### Frontend (Vercel)

```env
NEXT_PUBLIC_API_URL=https://orbesystems.onrender.com
```

## Troubleshooting

### Erro: "CORS error" no console

**Causa**: Domínio não está na lista `ALLOWED_ORIGINS`

**Solução**: Adicionar domínio no backend:
```python
ALLOWED_ORIGINS="https://seu-novo-dominio.com,..."
```

### Erro: "401 Unauthorized"

**Causas**:
- Token JWT expirado (60 min)
- Token não enviado no header
- Rota requer autenticação

**Solução**: Fazer login novamente no `/admin`

### Erro: "429 Too Many Requests"

**Causa**: Rate limit atingido

**Solução**: Aguardar 1 minuto antes de nova tentativa

### Erro: "Failed to fetch repositories"

**Causa**: GitHub API rate limit ou backend offline

**Verifique**:
1. `https://orbesystems.onrender.com/health` está online?
2. GITHUB_TOKEN configurado no Render?
3. Logs do backend no Render Dashboard

## Monitoramento

### Health Check

```bash
curl https://orbesystems.onrender.com/health
```

**Resposta esperada**:
```json
{
  "status": "operational",
  "service": "orbe-systems-api",
  "version": "1.3.0",
  "deployed_at": "2026-05-08T17:22:22"
}
```

### Logs

- **Frontend**: Vercel Dashboard → Logs
- **Backend**: Render Dashboard → OrbeSystems → Logs

## Referências

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [GitHub REST API](https://docs.github.com/en/rest)
- [JWT.io](https://jwt.io/) - Debugger de tokens
- [CORS Explained](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

---

**Última atualização**: 2026-05-08
**Versão da API**: 1.3.0
