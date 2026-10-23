-- ════════════════════════════════════════════════════════════════════════════════
-- ORBE SYSTEMS // MESH SOCIAL (KINETIC GRAPH PROTOCOL)
-- POSTGRESQL MULTI-TENANT ISOLATED SCHEMA SPECIFICATION (ZERO LATERAL LEAKAGE)
-- ════════════════════════════════════════════════════════════════════════════════
-- Arquitetura projetada para conviver no PostgreSQL da Orbe Systems com isolamento estrito,
-- garantindo que nenhuma consulta, injeção ou permissão interfira em outros projetos
-- (CRM, Ghost Engine, Inho, Users Master, Portfólio, etc.).
-- ════════════════════════════════════════════════════════════════════════════════

CREATE SCHEMA IF NOT EXISTS mesh_network;

-- ROLE DEDICADA COM PRINCÍPIO DO MENOR PRIVILÉGIO
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'mesh_service_role') THEN
        CREATE ROLE mesh_service_role WITH LOGIN PASSWORD 'CHANGE_IN_PRODUCTION_VAULT';
    END IF;
END
$$;

-- BLINDAGEM CONTRA VAZAMENTO LATERAL (ANTI-LATERAL TRAVERSAL)
REVOKE ALL ON SCHEMA public FROM mesh_service_role;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM mesh_service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM mesh_service_role;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM mesh_service_role;

REVOKE ALL ON SCHEMA mesh_network FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA mesh_network TO mesh_service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA mesh_network TO mesh_service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA mesh_network TO mesh_service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA mesh_network GRANT ALL ON TABLES TO mesh_service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA mesh_network GRANT ALL ON SEQUENCES TO mesh_service_role;

-- 1. NÓS DE IDENTIDADE DA REDE SOCIAL (NODES)
CREATE TABLE IF NOT EXISTS mesh_network.nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID NOT NULL UNIQUE, -- Vínculo lógico sem FK intrusiva
    handle VARCHAR(64) NOT NULL UNIQUE,
    display_name VARCHAR(120) NOT NULL,
    bio_vault TEXT,
    avatar_url TEXT,
    public_identity_key TEXT NOT NULL,
    dunbar_vault_count INT DEFAULT 0 CHECK (dunbar_vault_count <= 15),
    lounge_count INT DEFAULT 0 CHECK (lounge_count <= 50),
    is_hibernating BOOLEAN DEFAULT FALSE,
    hibernation_started_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_mesh_nodes_handle ON mesh_network.nodes (handle);
CREATE INDEX IF NOT EXISTS ix_mesh_nodes_auth_user_id ON mesh_network.nodes (auth_user_id);

-- 2. GRAFO DETERMINÍSTICO DE RECIPROCIDADE BILATERAL (ARESTAS PCR)
CREATE TABLE IF NOT EXISTS mesh_network.bilateral_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_a_id UUID NOT NULL REFERENCES mesh_network.nodes(id) ON DELETE CASCADE,
    node_b_id UUID NOT NULL REFERENCES mesh_network.nodes(id) ON DELETE CASCADE,
    pcr_score INT DEFAULT 0 CHECK (pcr_score >= 0),
    verified_replies INT DEFAULT 0,
    voice_notes_count INT DEFAULT 0,
    mutual_key_signed BOOLEAN DEFAULT FALSE,
    mutual_key_signature TEXT,
    orbit_level INT DEFAULT 1 CHECK (orbit_level BETWEEN 1 AND 4),
    cooldown_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_mesh_bilateral_pair UNIQUE (node_a_id, node_b_id),
    CONSTRAINT no_mesh_self_connection CHECK (node_a_id != node_b_id)
);

CREATE INDEX IF NOT EXISTS ix_mesh_edges_pair ON mesh_network.bilateral_edges (node_a_id, node_b_id);
CREATE INDEX IF NOT EXISTS ix_mesh_edges_orbit_pcr ON mesh_network.bilateral_edges (orbit_level, pcr_score);

-- 3. POSTAGENS EM 4 ÓRBITAS (MULTI-FORMAT: FOTO, VÍDEO CURTO, VÍDEO LONGO, THREAD)
CREATE TABLE IF NOT EXISTS mesh_network.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_node_id UUID NOT NULL REFERENCES mesh_network.nodes(id) ON DELETE CASCADE,
    format VARCHAR(20) NOT NULL CHECK (format IN ('photo', 'short', 'long', 'thread')),
    orbit_level INT NOT NULL CHECK (orbit_level BETWEEN 1 AND 4),
    title VARCHAR(255) NOT NULL,
    body TEXT,
    media_url TEXT,
    media_metadata JSONB DEFAULT '{}'::jsonb,
    jwt_signed_stream BOOLEAN DEFAULT FALSE,
    watermark_fingerprint TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_mesh_posts_author_orbit ON mesh_network.posts (author_node_id, orbit_level);
CREATE INDEX IF NOT EXISTS ix_mesh_posts_format ON mesh_network.posts (format);
CREATE INDEX IF NOT EXISTS ix_mesh_posts_created ON mesh_network.posts (created_at DESC);

-- 4. LEDGER DE AUDITORIA SAST E ANTI-PAYWALL (APPEND-ONLY VERIFIED LOG)
CREATE TABLE IF NOT EXISTS mesh_network.audit_ledger (
    id BIGSERIAL PRIMARY KEY,
    sender_node_id UUID NOT NULL REFERENCES mesh_network.nodes(id),
    target_node_id UUID NOT NULL REFERENCES mesh_network.nodes(id),
    event_type VARCHAR(64) NOT NULL,
    payload_hash VARCHAR(64) NOT NULL,
    pcr_delta INT DEFAULT 0,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. ATIVAÇÃO DE ROW LEVEL SECURITY (RLS) NATIVA DO POSTGRESQL
ALTER TABLE mesh_network.nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mesh_network.bilateral_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE mesh_network.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mesh_network.audit_ledger ENABLE ROW LEVEL SECURITY;

-- 5.1. POLÍTICAS DE RLS PARA LEITURA DE POSTS BASEADA EM RECIPROCIDADE
CREATE POLICY mesh_posts_public_read ON mesh_network.posts
    FOR SELECT
    USING (orbit_level = 1);

CREATE POLICY mesh_posts_orbit_access ON mesh_network.posts
    FOR SELECT
    USING (
        author_node_id = (SELECT id FROM mesh_network.nodes WHERE auth_user_id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM mesh_network.bilateral_edges e
            WHERE (
                (e.node_a_id = author_node_id AND e.node_b_id = (SELECT id FROM mesh_network.nodes WHERE auth_user_id = auth.uid()))
                OR
                (e.node_b_id = author_node_id AND e.node_a_id = (SELECT id FROM mesh_network.nodes WHERE auth_user_id = auth.uid()))
            )
            AND e.orbit_level >= mesh_network.posts.orbit_level
            AND (
                mesh_network.posts.orbit_level < 4 
                OR (mesh_network.posts.orbit_level = 4 AND e.mutual_key_signed = TRUE)
            )
        )
    );

CREATE POLICY mesh_posts_author_insert ON mesh_network.posts
    FOR INSERT
    WITH CHECK (
        author_node_id = (SELECT id FROM mesh_network.nodes WHERE auth_user_id = auth.uid())
    );
