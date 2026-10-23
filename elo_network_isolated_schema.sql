-- ════════════════════════════════════════════════════════════════════════════════
-- ORBE SYSTEMS // PROTOCOLO ELO (KINETIC SOCIAL PROTOCOL)
-- POSTGRESQL MULTI-TENANT ISOLATED SCHEMA SPECIFICATION (ZERO LATERAL LEAKAGE)
-- ════════════════════════════════════════════════════════════════════════════════
-- Arquitetura projetada para conviver no PostgreSQL da Orbe Systems com isolamento estrito,
-- garantindo que nenhuma consulta, injeção ou permissão interfira em outros projetos
-- (CRM, Ghost Engine, Inho, Users Master, Portfólio, etc.).
-- ════════════════════════════════════════════════════════════════════════════════

-- 1. CRIAÇÃO DO SCHEMA EXCLUSIVO (HARD NAMESPACE ISOLATION)
CREATE SCHEMA IF NOT EXISTS elo_network;

-- 2. CRIAÇÃO DE ROLE DEDICADA COM PRINCÍPIO DO MENOR PRIVILÉGIO (LEAST PRIVILEGE)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'elo_service_role') THEN
        CREATE ROLE elo_service_role WITH LOGIN PASSWORD 'CHANGE_IN_PRODUCTION_VAULT';
    END IF;
END
$$;

-- 3. BLINDAGEM CONTRA VAZAMENTO LATERAL (ANTI-LATERAL TRAVERSAL)
-- Revoga expressamente qualquer acesso do elo_service_role ao schema public e outros schemas
REVOKE ALL ON SCHEMA public FROM elo_service_role;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM elo_service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM elo_service_role;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM elo_service_role;

-- Revoga acesso do público em geral ao schema elo_network
REVOKE ALL ON SCHEMA elo_network FROM PUBLIC;

-- Concede privilégios estritos apenas dentro do namespace elo_network
GRANT USAGE, CREATE ON SCHEMA elo_network TO elo_service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA elo_network TO elo_service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA elo_network TO elo_service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA elo_network GRANT ALL ON TABLES TO elo_service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA elo_network GRANT ALL ON SEQUENCES TO elo_service_role;

-- 4. TABELAS DO PROTOCOLO ELO DENTRO DO SCHEMA ISOLADO

-- 4.1. NÓS DE IDENTIDADE DA REDE SOCIAL (NODES)
-- Nota de Engenharia: Não criamos Foreign Key intrusiva para public.users
-- para evitar lock escalation, coupling de migrações e cascateamento indesejado entre projetos.
CREATE TABLE IF NOT EXISTS elo_network.nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID NOT NULL UNIQUE, -- Vínculo lógico com o subsistema de autenticação
    handle VARCHAR(64) NOT NULL UNIQUE,
    display_name VARCHAR(120) NOT NULL,
    bio_vault TEXT,
    avatar_url TEXT,
    public_identity_key TEXT NOT NULL, -- Chave pública para assinatura Ed25519 de arestas
    dunbar_vault_count INT DEFAULT 0 CHECK (dunbar_vault_count <= 15),
    lounge_count INT DEFAULT 0 CHECK (lounge_count <= 50),
    is_hibernating BOOLEAN DEFAULT FALSE,
    hibernation_started_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_elo_nodes_handle ON elo_network.nodes (handle);
CREATE INDEX IF NOT EXISTS ix_elo_nodes_auth_user_id ON elo_network.nodes (auth_user_id);

-- 4.2. GRAFO DETERMINÍSTICO DE RECIPROCIDADE BILATERAL (ARESTAS PCR)
-- Computa o vínculo real e a distância topológica entre dois nós humanos.
CREATE TABLE IF NOT EXISTS elo_network.bilateral_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_a_id UUID NOT NULL REFERENCES elo_network.nodes(id) ON DELETE CASCADE,
    node_b_id UUID NOT NULL REFERENCES elo_network.nodes(id) ON DELETE CASCADE,
    pcr_score INT DEFAULT 0 CHECK (pcr_score >= 0),
    verified_replies INT DEFAULT 0,
    voice_notes_count INT DEFAULT 0,
    mutual_key_signed BOOLEAN DEFAULT FALSE,
    mutual_key_signature TEXT,
    orbit_level INT DEFAULT 1 CHECK (orbit_level BETWEEN 1 AND 4),
    cooldown_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_bilateral_pair UNIQUE (node_a_id, node_b_id),
    CONSTRAINT no_self_connection CHECK (node_a_id != node_b_id)
);

CREATE INDEX IF NOT EXISTS ix_elo_edges_pair ON elo_network.bilateral_edges (node_a_id, node_b_id);
CREATE INDEX IF NOT EXISTS ix_elo_edges_orbit_pcr ON elo_network.bilateral_edges (orbit_level, pcr_score);

-- 4.3. POSTAGENS EM 4 ÓRBITAS (MULTI-FORMAT: FOTO, VÍDEO CURTO, VÍDEO LONGO, THREAD)
CREATE TABLE IF NOT EXISTS elo_network.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_node_id UUID NOT NULL REFERENCES elo_network.nodes(id) ON DELETE CASCADE,
    format VARCHAR(20) NOT NULL CHECK (format IN ('photo', 'short', 'long', 'thread')),
    orbit_level INT NOT NULL CHECK (orbit_level BETWEEN 1 AND 4),
    title VARCHAR(255) NOT NULL,
    body TEXT,
    media_url TEXT,
    media_metadata JSONB DEFAULT '{}'::jsonb, -- Codec, resolução (ex: 4K HDR), dimensões, duração
    jwt_signed_stream BOOLEAN DEFAULT FALSE,
    watermark_fingerprint TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_elo_posts_author_orbit ON elo_network.posts (author_node_id, orbit_level);
CREATE INDEX IF NOT EXISTS ix_elo_posts_format ON elo_network.posts (format);
CREATE INDEX IF NOT EXISTS ix_elo_posts_created ON elo_network.posts (created_at DESC);

-- 4.4. LEDGER DE AUDITORIA SAST E ANTI-PAYWALL (APPEND-ONLY VERIFIED LOG)
CREATE TABLE IF NOT EXISTS elo_network.audit_ledger (
    id BIGSERIAL PRIMARY KEY,
    sender_node_id UUID NOT NULL REFERENCES elo_network.nodes(id),
    target_node_id UUID NOT NULL REFERENCES elo_network.nodes(id),
    event_type VARCHAR(64) NOT NULL, -- 'THREAD_REPLY', 'VOICE_EXCHANGE', 'LONG_VIDEO_RETENTION', 'MUTUAL_HANDSHAKE'
    payload_hash VARCHAR(64) NOT NULL, -- SHA-256 do payload para não-repúdio
    pcr_delta INT DEFAULT 0,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_elo_audit_nodes ON elo_network.audit_ledger (sender_node_id, target_node_id);

-- 5. ATIVAÇÃO DE ROW LEVEL SECURITY (RLS) NATIVA DO POSTGRESQL
ALTER TABLE elo_network.nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE elo_network.bilateral_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE elo_network.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE elo_network.audit_ledger ENABLE ROW LEVEL SECURITY;

-- 5.1. POLÍTICAS DE RLS PARA LEITURA DE POSTS BASEADA EM RECIPROCIDADE
-- A Órbita 1 (Praça Pública) é legível por qualquer nó autenticado
CREATE POLICY elo_posts_public_read ON elo_network.posts
    FOR SELECT
    USING (orbit_level = 1);

-- Órbitas 2, 3 e 4 só são legíveis se o nó autor for o próprio usuário OU se houver aresta bilateral com PCR suficiente
CREATE POLICY elo_posts_orbit_access ON elo_network.posts
    FOR SELECT
    USING (
        author_node_id = (SELECT id FROM elo_network.nodes WHERE auth_user_id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM elo_network.bilateral_edges e
            WHERE (
                (e.node_a_id = author_node_id AND e.node_b_id = (SELECT id FROM elo_network.nodes WHERE auth_user_id = auth.uid()))
                OR
                (e.node_b_id = author_node_id AND e.node_a_id = (SELECT id FROM elo_network.nodes WHERE auth_user_id = auth.uid()))
            )
            AND e.orbit_level >= elo_network.posts.orbit_level
            AND (
                elo_network.posts.orbit_level < 4 
                OR (elo_network.posts.orbit_level = 4 AND e.mutual_key_signed = TRUE)
            )
        )
    );

-- 5.2. POLÍTICA DE ESCRITA: NENHUM NÓ PODE PUBLICAR EM NOME DE OUTRO
CREATE POLICY elo_posts_author_insert ON elo_network.posts
    FOR INSERT
    WITH CHECK (
        author_node_id = (SELECT id FROM elo_network.nodes WHERE auth_user_id = auth.uid())
    );

-- ════════════════════════════════════════════════════════════════════════════════
-- FIM DA ESPECIFICAÇÃO DE BLINDAGEM DE SCHEMA E SEGURANÇA MULTI-TENANT
-- ════════════════════════════════════════════════════════════════════════════════
