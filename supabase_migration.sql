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
