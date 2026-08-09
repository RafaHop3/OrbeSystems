# Orbe Systems â€” Monorepo

> Hub de portfÃ³lio de projetos de Engenharia de Software e Cyber Security.

## Estrutura

```
orbe-systems/
â”œâ”€â”€ backend/    # FastAPI â€” API Gateway para o GitHub
â”œâ”€â”€ frontend/   # Next.js â€” Interface cyberpunk
â””â”€â”€ terraform/  # Infraestrutura AWS Free Tier (ConfiguraÃ§Ã£o baseada em Custo $0)
```

**Diretrizes de Infraestrutura:** Leia as [Regras de Custo Zero (Free Tier)](./DIRETRIZES_AWS_CUSTO_ZERO.md) para detalhes da arquitetura.

---

## ðŸ Backend (FastAPI)

### Setup local

```powershell
cd backend

# 1. Criar ambiente virtual
python -m venv .venv

# 2. Ativar
.venv\Scripts\activate

# 3. Instalar dependÃªncias
pip install -r requirements.txt

# 4. Copiar o arquivo de env
copy .env.example .env
# Edite .env e adicione seu GITHUB_TOKEN se quiser (opcional)

# 5. Rodar o servidor
uvicorn main:app --reload --port 8000
```

Acesse a documentaÃ§Ã£o interativa em: http://localhost:8000/docs

### Endpoints

| MÃ©todo | Rota | DescriÃ§Ã£o |
|--------|------|-----------|
| GET | `/api/projects` | Lista repositÃ³rios do GitHub (RafaHop3), com featured first |
| GET | `/health` | Health check para o AWS EC2 keep-alive |

---

## âš¡ Frontend (Next.js)

### Setup local

```powershell
cd frontend

# 1. Instalar dependÃªncias
npm install

# 2. (Opcional) Conferir o .env.local â€” jÃ¡ aponta para localhost:8000
# NEXT_PUBLIC_API_URL=http://localhost:8000

# 3. Rodar em modo dev
npm run dev
```

Abra http://localhost:3000

---

## ðŸš€ Deploy

### Backend â†’ Render (Alternativa Free Tier)
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Adicione a variÃ¡vel `ALLOWED_ORIGINS` com o domÃ­nio da Vercel + `https://orbesystems.com.br`
- **ManutenÃ§Ã£o de Atividade (Keep-Alive):** Para contornar a suspensÃ£o automÃ¡tica apÃ³s 15 minutos de inatividade no ambiente EC2 AWS, **nÃ£o** utilize schedulers internos (que consomem recursos e falham se o contÃªiner jÃ¡ estiver suspenso). Utilize o **Vercel Cron Job** configurado no frontend, que aciona a rota externa de ping `/api/ping-backend` a cada 10 minutos para manter o backend ativo.

### Backend â†’ Vercel Serverless (Recomendado)
- O backend estÃ¡ totalmente preparado para ser executado como serverless no Vercel (conforme `vercel.json` na raiz da pasta `backend`). Nesta modalidade, as funÃ§Ãµes escalam para zero automaticamente e nÃ£o requerem nenhum robÃ´ de keep-alive.

### Frontend â†’ Vercel
- Conecte o repositÃ³rio no painel da Vercel.
- Configure a variÃ¡vel de ambiente:
  - `NEXT_PUBLIC_API_URL` = URL do seu backend (ex: `https://orbe-systems-fuc5.vercel.app` ou URL do seu Elastic IP).
- O Vercel detectarÃ¡ as configuraÃ§Ãµes de Cron contidas em `frontend/vercel.json` e executarÃ¡ o ping automÃ¡tico.


---

## ðŸ”’ SeguranÃ§a

- CORS restrito a origens permitidas (configurado via `.env`)
- Token do GitHub nunca exposto no frontend (passa pelo backend)
- Headers padrÃ£o do FastAPI + revisar com `securityheaders.com` apÃ³s deploy

