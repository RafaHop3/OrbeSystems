-- ════════════════════════════════════════════════════════════════════════════════
-- SUPABASE MIGRATION & SEED SCRIPT — ORBE SYSTEMS / IMORTAL / IMOBVERSE
-- ════════════════════════════════════════════════════════════════════════════════
-- Este script realiza o setup do banco de dados no ambiente do Supabase (PostgreSQL),
-- garantindo a criação de tabelas, índices, a sincronização de tabelas e o cadastro do IMORTAL e IMOBVERSE.

-- 1. Ativar a extensão de vetores (caso queira implantar o RAG chatbot no futuro)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Criar a tabela projects_metadata se não existir
CREATE TABLE IF NOT EXISTS projects_metadata (
    id TEXT PRIMARY KEY,
    repo_name TEXT,
    custom_description TEXT,
    image_url TEXT,
    video_url TEXT,
    deploy_url TEXT,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    is_premium_only BOOLEAN NOT NULL DEFAULT false
);

-- 3. Garantir consistência nas colunas de projetos
ALTER TABLE projects_metadata ADD COLUMN IF NOT EXISTS deploy_url TEXT;
ALTER TABLE projects_metadata ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE projects_metadata ADD COLUMN IF NOT EXISTS repo_name TEXT;
ALTER TABLE projects_metadata ADD COLUMN IF NOT EXISTS is_premium_only BOOLEAN NOT NULL DEFAULT false;

-- 4. Criar índices para otimizar busca do Grid do Portfólio
CREATE INDEX IF NOT EXISTS ix_projects_metadata_is_featured ON projects_metadata (is_featured);
CREATE INDEX IF NOT EXISTS ix_projects_metadata_is_premium_only ON projects_metadata (is_premium_only);

-- 5. Criar tabelas de RBAC (roles) e Subscrições se não existirem
CREATE TABLE IF NOT EXISTS user_roles (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    role_name TEXT NOT NULL DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS user_subscriptions (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    stripe_customer_id TEXT,
    subscription_status TEXT NOT NULL DEFAULT 'none'
);

CREATE INDEX IF NOT EXISTS ix_user_subscriptions_stripe_customer_id ON user_subscriptions (stripe_customer_id);

-- 6. Migrar dados existentes de users para as tabelas de RBAC/Subscrições
INSERT INTO user_roles (id, user_id, role_name)
SELECT 
    gen_random_uuid()::text, 
    id, 
    role::text 
FROM users
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_subscriptions (id, user_id, subscription_status)
SELECT 
    gen_random_uuid()::text, 
    id, 
    CASE WHEN role::text = 'premium' THEN 'active' ELSE 'none' END
FROM users
ON CONFLICT (user_id) DO NOTHING;

-- 6.1. Criar a função de sincronização automática para o SGBD
CREATE OR REPLACE FUNCTION sync_user_rbac_and_subscriptions()
RETURNS TRIGGER AS $$
BEGIN
    -- Se for INSERT, gera registros correspondentes nas tabelas secundárias
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO user_roles (id, user_id, role_name)
        VALUES (gen_random_uuid()::text, NEW.id, COALESCE(NEW.role, 'user'))
        ON CONFLICT (user_id) DO UPDATE 
        SET role_name = EXCLUDED.role_name;

        INSERT INTO user_subscriptions (id, user_id, subscription_status)
        VALUES (
            gen_random_uuid()::text, 
            NEW.id, 
            CASE WHEN NEW.role = 'premium' THEN 'active' ELSE COALESCE(NEW.subscription_status, 'none') END
        )
        ON CONFLICT (user_id) DO UPDATE 
        SET subscription_status = EXCLUDED.subscription_status;

    -- Se for UPDATE, sincroniza as colunas atualizadas
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Se a coluna role legada foi atualizada na tabela users
        IF (NEW.role IS DISTINCT FROM OLD.role) THEN
            INSERT INTO user_roles (id, user_id, role_name)
            VALUES (gen_random_uuid()::text, NEW.id, NEW.role)
            ON CONFLICT (user_id) DO UPDATE 
            SET role_name = EXCLUDED.role_name;

            -- Sincronizar subscription se o papel virou premium
            IF (NEW.role = 'premium') THEN
                INSERT INTO user_subscriptions (id, user_id, subscription_status)
                VALUES (gen_random_uuid()::text, NEW.id, 'active')
                ON CONFLICT (user_id) DO UPDATE 
                SET subscription_status = 'active';
            ELSIF (NEW.role = 'user' AND OLD.role = 'premium') THEN
                INSERT INTO user_subscriptions (id, user_id, subscription_status)
                VALUES (gen_random_uuid()::text, NEW.id, 'none')
                ON CONFLICT (user_id) DO UPDATE 
                SET subscription_status = 'none';
            END IF;
        END IF;

        -- Se a coluna subscription_status legada foi atualizada na tabela users
        IF (NEW.subscription_status IS DISTINCT FROM OLD.subscription_status) THEN
            INSERT INTO user_subscriptions (id, user_id, subscription_status)
            VALUES (gen_random_uuid()::text, NEW.id, NEW.subscription_status)
            ON CONFLICT (user_id) DO UPDATE 
            SET subscription_status = EXCLUDED.subscription_status;

            -- Sincronizar role se a subscription virou active
            IF (NEW.subscription_status = 'active') THEN
                INSERT INTO user_roles (id, user_id, role_name)
                VALUES (gen_random_uuid()::text, NEW.id, 'premium')
                ON CONFLICT (user_id) DO UPDATE 
                SET role_name = 'premium';
            ELSIF (NEW.subscription_status = 'none' OR NEW.subscription_status = 'canceled') THEN
                INSERT INTO user_roles (id, user_id, role_name)
                VALUES (gen_random_uuid()::text, NEW.id, 'user')
                ON CONFLICT (user_id) DO UPDATE 
                SET role_name = 'user';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6.2. Declarar o Trigger na tabela users
DROP TRIGGER IF EXISTS trigger_sync_user_rbac_and_subscriptions ON users;
CREATE TRIGGER trigger_sync_user_rbac_and_subscriptions
AFTER INSERT OR UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION sync_user_rbac_and_subscriptions();

-- 7. Registrar o Projeto IMORTAL como Premium e Destaque
INSERT INTO projects_metadata (id, repo_name, custom_description, deploy_url, is_featured, is_premium_only)
VALUES (
    'imortal', 
    'IMORTAL', 
    'AI-Powered Formal Verification Toolchain for Embedded Systems (Z3 Solver + Stochastic Fuzzing)', 
    '/imortal', 
    true, 
    true
)
ON CONFLICT (id) DO UPDATE 
SET repo_name = EXCLUDED.repo_name,
    custom_description = EXCLUDED.custom_description,
    deploy_url = EXCLUDED.deploy_url,
    is_featured = EXCLUDED.is_featured,
    is_premium_only = EXCLUDED.is_premium_only;

-- ════════════════════════════════════════════════════════════════════════════════
-- IMOBVERSE — Tabelas do Motor Proptech
-- ════════════════════════════════════════════════════════════════════════════════

-- 8. Tabela de Imóveis
CREATE TABLE IF NOT EXISTS imob_properties (
    id               TEXT PRIMARY KEY,
    owner_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

-- 9. Tabela de Itens de Vistoria
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

-- 10. Tabela de Leads
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

-- 11. Registrar o Projeto IMOBVERSE como Premium e Destaque
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

-- ════════════════════════════════════════════════════════════════════════════════
-- PÓS-MIGRAÇÃO OBRIGATÓRIA (SEGURANÇA)
-- ════════════════════════════════════════════════════════════════════════════════
-- Após este script, execute o lockdown de RLS para bloquear acesso via chave anon:
--   python run_migration.py "DATABASE_URL" --rls
