# Orbe Systems — Monorepo

> Hub de portfólio de projetos de Engenharia de Software e Cyber Security.

## Estrutura

```
orbe-systems/
├── backend/    # FastAPI — API Gateway para o GitHub
└── frontend/   # Next.js — Interface cyberpunk
```

---

## 🐍 Backend (FastAPI)

### Setup local

```powershell
cd backend

# 1. Criar ambiente virtual
python -m venv .venv

# 2. Ativar
.venv\Scripts\activate

# 3. Instalar dependências
pip install -r requirements.txt

# 4. Copiar o arquivo de env
copy .env.example .env
# Edite .env e adicione seu GITHUB_TOKEN se quiser (opcional)

# 5. Rodar o servidor
uvicorn main:app --reload --port 8000
```

Acesse a documentação interativa em: http://localhost:8000/docs

### Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/projects` | Lista repositórios do GitHub (RafaHop3), com featured first |
| GET | `/health` | Health check para o Render keep-alive |

---

## ⚡ Frontend (Next.js)

### Setup local

```powershell
cd frontend

# 1. Instalar dependências
npm install

# 2. (Opcional) Conferir o .env.local — já aponta para localhost:8000
# NEXT_PUBLIC_API_URL=http://localhost:8000

# 3. Rodar em modo dev
npm run dev
```

Abra http://localhost:3000

---

## 🚀 Deploy

### Backend → Render
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Adicione a variável `ALLOWED_ORIGINS` com o domínio da Vercel + `https://orbesystems.com.br`
- Adicione `GITHUB_TOKEN` (opcional, mas recomendado para evitar rate limit)

### Frontend → Vercel
- Conecte o repositório no painel da Vercel
- Configure a variável de ambiente:
  - `NEXT_PUBLIC_API_URL` = URL do seu serviço no Render (ex: `https://orbe-systems-api.onrender.com`)
- O Vercel detectará automaticamente o Next.js e fará o deploy

---

## 🔒 Segurança

- CORS restrito a origens permitidas (configurado via `.env`)
- Token do GitHub nunca exposto no frontend (passa pelo backend)
- Headers padrão do FastAPI + revisar com `securityheaders.com` após deploy
