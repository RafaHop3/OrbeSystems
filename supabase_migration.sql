-- ════════════════════════════════════════════════════════════════════════════════
-- SUPABASE MIGRATION & SEED SCRIPT — ORBE SYSTEMS / IMORTAL
-- ════════════════════════════════════════════════════════════════════════════════
-- Este script realiza o setup do banco de dados no ambiente do Supabase (PostgreSQL),
-- garantindo a criação de índices, a sincronização de tabelas e o cadastro do IMORTAL.

-- 1. Ativar a extensão de vetores (caso queira implantar o RAG chatbot no futuro)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Garantir consistência nas colunas de projetos
ALTER TABLE projects_metadata ADD COLUMN IF NOT EXISTS deploy_url TEXT;
ALTER TABLE projects_metadata ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE projects_metadata ADD COLUMN IF NOT EXISTS repo_name TEXT;
ALTER TABLE projects_metadata ADD COLUMN IF NOT EXISTS is_premium_only BOOLEAN NOT NULL DEFAULT false;

-- 3. Criar índices para otimizar busca do Grid do Portfólio
CREATE INDEX IF NOT EXISTS ix_projects_metadata_is_featured ON projects_metadata (is_featured);
CREATE INDEX IF NOT EXISTS ix_projects_metadata_is_premium_only ON projects_metadata (is_premium_only);

-- 4. Registrar o Projeto IMORTAL como Premium e Destaque
INSERT INTO projects_metadata (id, repo_name, custom_description, deploy_url, is_featured, is_premium_only)
VALUES (
    'imortal', 
    'IMORTAL', 
    'AI-Powered Formal Verification Toolchain for Embedded Systems (Z3 Solver + Stochastic Fuzzing)', 
    '/ferramentas-premium/imortal', 
    true, 
    true
)
ON CONFLICT (id) DO UPDATE 
SET repo_name = EXCLUDED.repo_name,
    custom_description = EXCLUDED.custom_description,
    deploy_url = EXCLUDED.deploy_url,
    is_featured = EXCLUDED.is_featured,
    is_premium_only = EXCLUDED.is_premium_only;

-- 5. Helper Queries de Administração (Execute manualmente se precisar forçar plano)
--
-- Para promover um usuário a PREMIUM manualmente no Supabase:
-- UPDATE user_roles SET role_name = 'premium' WHERE user_id = 'UUID_DO_USUARIO';
-- UPDATE user_subscriptions SET subscription_status = 'active' WHERE user_id = 'UUID_DO_USUARIO';
-- UPDATE users SET role = 'premium', subscription_status = 'active' WHERE id = 'UUID_DO_USUARIO';
--
-- Para rebaixar de volta a usuário gratuito:
-- UPDATE user_roles SET role_name = 'user' WHERE user_id = 'UUID_DO_USUARIO';
-- UPDATE user_subscriptions SET subscription_status = 'canceled' WHERE user_id = 'UUID_DO_USUARIO';
-- UPDATE users SET role = 'user', subscription_status = 'none' WHERE id = 'UUID_DO_USUARIO';

-- ════════════════════════════════════════════════════════════════════════════════
-- IMOBVERSE — Tabelas do Motor Proptech
-- ════════════════════════════════════════════════════════════════════════════════

-- 6. Tabela de Imóveis
CREATE TABLE IF NOT EXISTS imob_properties (
    id               TEXT PRIMARY KEY,
    owner_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title            VARCHAR(150) NOT NULL,
    description      TEXT NOT NULL,
    price            FLOAT NOT NULL,
    deal_type        VARCHAR(20) NOT NULL DEFAULT 'aluguel',
    property_type    VARCHAR(30) NOT NULL DEFAULT 'apartamento',
    bedrooms         VARCHAR(5),
    bathrooms        VARCHAR(5),
    area_m2          FLOAT,
    city             VARCHAR(100) NOT NULL,
    neighborhood     VARCHAR(100) NOT NULL,
    street_address   VARCHAR(200),          -- SENSÍVEL: nunca expor em rotas públicas
    cover_image_url  VARCHAR(512),
    images_json      TEXT,
    reputation_score FLOAT NOT NULL DEFAULT 5.0,
    status           VARCHAR(20) NOT NULL DEFAULT 'active',
    is_published     BOOLEAN NOT NULL DEFAULT true,
    created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP,
    CONSTRAINT check_imob_reputation_range CHECK (reputation_score >= 0.0 AND reputation_score <= 5.0)
);

CREATE INDEX IF NOT EXISTS ix_imob_properties_status   ON imob_properties (status);
CREATE INDEX IF NOT EXISTS ix_imob_properties_city     ON imob_properties (city);
CREATE INDEX IF NOT EXISTS ix_imob_properties_owner_id ON imob_properties (owner_id);

-- 7. Tabela de Itens de Vistoria
CREATE TABLE IF NOT EXISTS imob_inspection_items (
    id                   TEXT PRIMARY KEY,
    property_id          TEXT NOT NULL REFERENCES imob_properties(id) ON DELETE CASCADE,
    component_name       VARCHAR(100) NOT NULL,
    owner_baseline_url   VARCHAR(512) NOT NULL,   -- IMUTÁVEL via endpoints de locatários
    checkin_url          VARCHAR(512),
    checkout_url         VARCHAR(512),
    status               VARCHAR(20) NOT NULL DEFAULT 'pending',
    analysis_log         TEXT,
    deterioration_grade  VARCHAR(20),
    created_at           TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_imob_inspection_property ON imob_inspection_items (property_id);
CREATE INDEX IF NOT EXISTS ix_imob_inspection_status   ON imob_inspection_items (status);

-- 8. Tabela de Leads
CREATE TABLE IF NOT EXISTS imob_leads (
    id              TEXT PRIMARY KEY,
    property_id     TEXT NOT NULL REFERENCES imob_properties(id) ON DELETE CASCADE,
    customer_name   VARCHAR(100) NOT NULL,
    customer_email  VARCHAR(200) NOT NULL,
    customer_phone  VARCHAR(30) NOT NULL,
    message         VARCHAR(500),
    status          VARCHAR(20) NOT NULL DEFAULT 'new',
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_imob_leads_property ON imob_leads (property_id);

-- 9. Registrar o Projeto IMOBVERSE como Premium e Destaque
INSERT INTO projects_metadata (id, repo_name, custom_description, deploy_url, is_featured, is_premium_only)
VALUES (
    'imobverse',
    'Imobverse',
    'Plataforma Proptech com Motor de Reputacao, Vistoria Fotografica Inteligente e Geracao de Leads',
    '/ferramentas-premium/imobverse',
    true,
    true
)
ON CONFLICT (id) DO UPDATE
SET repo_name          = EXCLUDED.repo_name,
    custom_description = EXCLUDED.custom_description,
    deploy_url         = EXCLUDED.deploy_url,
    is_featured        = EXCLUDED.is_featured,
    is_premium_only    = EXCLUDED.is_premium_only;

