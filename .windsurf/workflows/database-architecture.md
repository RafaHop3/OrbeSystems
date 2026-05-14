---
description: Arquitetura de Persistência - SQLite + Render Disk
---

# Arquitetura de Persistência do Orbe Systems

## Overview

O projeto Orbe Systems utiliza uma arquitetura de persistência simples e eficiente baseada em **SQLite** com **Render Disk** para garantir que os dados permaneçam salvos entre deploys e reinícios do servidor.

## Componentes

### 1. Banco de Dados: SQLite

- **Tipo**: SQLite (banco de dados em arquivo)
- **Localização**: `./data/projects.db`
- **URL**: `sqlite:///./data/projects.db`
- **ORM**: SQLAlchemy

#### Vantagens:
- ✅ Simples, não requer servidor separado
- ✅ Perfeito para projetos pequenos/médios
- ✅ Fácil backup (é um arquivo só)
- ✅ Rápido para leituras

#### Desvantagens:
- ⚠️ Não ideal para múltiplos servidores simultâneos
- ⚠️ Limitado a 1 escrita por vez
- ⚠️ Precisa de disco persistente na nuvem

### 2. Persistência: Render Disk

- **Plataforma**: Render (render.com)
- **Tipo**: Disk/Persistent Storage
- **Mount Path**: `/opt/render/project/src/data`
- **Tamanho**: 1 GB (configurável)

#### Por que é necessário?

Sem o **Render Disk**, o arquivo SQLite seria **apagado** a cada:
- Deploy de nova versão
- Reinício do servidor
- Hibernação do serviço (planos gratuitos)

Com o Disk, o arquivo `projects.db` permanece no disco físico da Render, independente do ciclo de vida do container.

## Configuração

### 1. No Render Dashboard

```
Service: OrbeSystems (Web Service)
├── Environment
│   └── DATABASE_URL=sqlite:///./data/projects.db
├── Disk
│   ├── Name: data
│   ├── Mount Path: /opt/render/project/src/data
│   └── Size: 1 GB
```

### 2. No Código (database.py)

```python
import os
from sqlalchemy import create_engine
from config import settings

# Extrai diretório do DATABASE_URL
# sqlite:///./data/projects.db → cria pasta ./data/
db_url = settings.DATABASE_URL
if db_url.startswith("sqlite"):
    db_path = db_url.replace("sqlite:///", "").replace("./", "")
    db_dir = os.path.dirname(os.path.abspath(db_path))
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)
        print(f"[Database] Created directory: {db_dir}")

engine = create_engine(db_url, connect_args={"check_same_thread": False})
```

### 3. Estrutura do Banco

```
projects.db
├── projects_metadata (tabela principal)
│   ├── id (TEXT, PK) - GitHub repo ID
│   ├── repo_name (TEXT)
│   ├── custom_description (TEXT)
│   ├── image_url (TEXT)
│   ├── video_url (TEXT)
│   ├── deploy_url (TEXT)
│   └── is_featured (BOOLEAN)
```

## Fluxo de Dados

### Salvando um novo repo (Admin Dashboard)

```
Frontend (Next.js/Vercel)
    ↓ POST /api/admin/repos/add
Backend (FastAPI/Render)
    ↓ SQLAlchemy ORM
SQLite (projects.db no Disk)
    ↓ Render Disk (persistência)
/opt/render/project/src/data/projects.db
```

### Consultando repos (Site público)

```
Frontend (Next.js/Vercel)
    ↓ GET /api/projects
Backend (FastAPI/Render)
    ↓ SQLAlchemy ORM
SQLite (projects.db)
    ↓ Retorna JSON com repos + metadados
Frontend exibe repos injetados
```

## Backup do Banco

### Manual (via Render Shell)

```bash
# No Render Dashboard → OrbeSystems → Shell
cd /opt/render/project/src/data
cp projects.db projects.db.backup.$(date +%Y%m%d)
```

### Download

1. Render Dashboard → **OrbeSystems** → **Shell**
2. Execute: `cat /opt/render/project/src/data/projects.db | base64`
3. Copie o output e salve localmente

## Troubleshooting

### Erro: "unable to open database file"

**Causa**: Diretório `./data` não existe

**Solução**: O código em `database.py` já cria automaticamente, mas verifique:
- Se `DATABASE_URL` está correto
- Se o Disk está montado no caminho correto

### Erro: "database is locked"

**Causa**: SQLite permite apenas 1 escrita simultânea

**Solução**: Normalmente resolve sozinho em segundos. Se persistir:
- Reinicie o serviço no Render
- Verifique se não há queries travadas

### Dados sumiram após deploy

**Causa**: Disk não configurado ou `DATABASE_URL` apontando para local errado

**Verifique**:
1. Render Dashboard → **Disk** deve estar configurado
2. `DATABASE_URL=sqlite:///./data/projects.db` (não caminho absoluto)
3. Mount Path: `/opt/render/project/src/data`

## Migração Futura (opcional)

Se o projeto crescer muito, considere migrar para:

| Opção | Quando usar |
|-------|-------------|
| **PostgreSQL** (Render/Supabase) | Múltiplos servidores, alta concorrência |
| **Supabase** | Quer autenticação + banco + storage integrados |
| **PlanetScale** | MySQL serverless com branching |

### Migração para PostgreSQL

1. Criar PostgreSQL no Render
2. Atualizar `DATABASE_URL` com URL do Postgres
3. Rodar migrations: `alembic upgrade head`
4. Exportar dados do SQLite e importar no PostgreSQL

## Comandos Úteis

### Verificar banco no Shell

```bash
# Acessar SQLite CLI
sqlite3 /opt/render/project/src/data/projects.db

# Listar tabelas
.tables

# Ver estrutura
.schema projects_metadata

# Contar registros
SELECT COUNT(*) FROM projects_metadata;

# Listar repos injetados
SELECT repo_name, is_featured FROM projects_metadata WHERE is_featured = 1;

# Sair
.quit
```

### Ver logs do backend

```bash
# Ver últimas 50 linhas
tail -n 50 /var/log/render.log

# Ou via Render Dashboard → Logs
```

## Resumo

| Pergunta | Resposta |
|----------|----------|
| Onde ficam os dados? | Arquivo `projects.db` no Render Disk |
| Persiste entre deploys? | ✅ Sim, graças ao Disk |
| É PostgreSQL? | ❌ Não, é SQLite |
| É Supabase? | ❌ Não |
| Precisa de backup? | ✅ Sim, periodicamente |
| Escalabilidade | ⚠️ 1 servidor só (limitação do SQLite) |

## Links Úteis

- [Render Disks Documentation](https://render.com/docs/disks)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)

---

**Última atualização**: 2026-05-08
**Autor**: Orbe Systems Team
