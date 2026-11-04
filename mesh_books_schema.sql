-- ORBE SYSTEMS // MESH SOCIAL BOOKS (Manual 11, secao 5 / Fase 3-4)
-- ISOLAMENTO: so cria objetos NOVOS em schema proprio (mesh_books). Nao altera public.*, inho.* nem mesh_network.
-- Idempotente (pode rodar mais de uma vez). Aplicar via scripts/apply_mesh_books.py (dry-run por padrao).
-- Todas as chaves sao UUID (Manual 02). RLS ativo. Localizacao apenas como celula H3.

DO $$
BEGIN
    IF to_regclass('mesh_network.nodes') IS NULL THEN
        RAISE EXCEPTION 'Pre-requisito ausente: aplique mesh_social_isolated_schema.sql (mesh_network.nodes)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mesh_service_role') THEN
        RAISE EXCEPTION 'Pre-requisito ausente: role mesh_service_role';
    END IF;
END $$;
CREATE SCHEMA IF NOT EXISTS mesh_books;
REVOKE ALL ON SCHEMA mesh_books FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA mesh_books TO mesh_service_role;

-- Cache local do catalogo (Google Books / OpenLibrary)
CREATE TABLE IF NOT EXISTS mesh_books.catalog_works (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    isbn13 CHAR(13) NOT NULL UNIQUE CHECK (isbn13 ~ '^[0-9]{13}$'),
    title VARCHAR(500) NOT NULL,
    authors TEXT[] NOT NULL DEFAULT '{}',
    cover_url TEXT,
    source VARCHAR(20) NOT NULL CHECK (source IN ('google_books','openlibrary','manual')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Exemplar fisico com politica de circulacao
CREATE TABLE IF NOT EXISTS mesh_books.physical_copies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_id UUID NOT NULL REFERENCES mesh_books.catalog_works(id),
    owner_node_id UUID NOT NULL REFERENCES mesh_network.nodes(id) ON DELETE CASCADE,
    circulation_policy VARCHAR(16) NOT NULL DEFAULT 'display_only'
        CHECK (circulation_policy IN ('display_only','first_degree','second_degree','local_mesh')),
    h3_cell VARCHAR(16),  -- resolucao de bairro; sem coordenadas exatas
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_copies_owner ON mesh_books.physical_copies (owner_node_id);
CREATE INDEX IF NOT EXISTS ix_copies_h3 ON mesh_books.physical_copies (h3_cell);

-- Emprestimo P2P com handshake por QR dinamico assinado
CREATE TABLE IF NOT EXISTS mesh_books.p2p_loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    copy_id UUID NOT NULL REFERENCES mesh_books.physical_copies(id),
    borrower_node_id UUID NOT NULL REFERENCES mesh_network.nodes(id),
    status VARCHAR(16) NOT NULL DEFAULT 'requested'
        CHECK (status IN ('requested','handed_over','returned','late','cancelled')),
    due_at TIMESTAMPTZ,
    handover_signature TEXT,
    return_signature TEXT,
    idempotency_key UUID NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Passaporte imutavel do exemplar (append-only)
CREATE TABLE IF NOT EXISTS mesh_books.copy_passport (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    copy_id UUID NOT NULL REFERENCES mesh_books.physical_copies(id),
    reader_node_id UUID NOT NULL REFERENCES mesh_network.nodes(id),
    dedication TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Marginalia com bloqueio anti-spoiler: progress_threshold e OBRIGATORIO
CREATE TABLE IF NOT EXISTS mesh_books.marginalia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_id UUID NOT NULL REFERENCES mesh_books.catalog_works(id),
    author_node_id UUID NOT NULL REFERENCES mesh_network.nodes(id) ON DELETE CASCADE,
    epub_cfi TEXT NOT NULL,
    progress_threshold NUMERIC(5,2) NOT NULL CHECK (progress_threshold BETWEEN 0 AND 100),
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Clubes de leitura
CREATE TABLE IF NOT EXISTS mesh_books.mesh_clubs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_id UUID NOT NULL REFERENCES mesh_books.catalog_works(id),
    owner_node_id UUID NOT NULL REFERENCES mesh_network.nodes(id),
    name VARCHAR(120) NOT NULL,
    chapter_schedule JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Obras digitais: apenas dominio publico / CC / autor verificado (Lei 9.610/98)
CREATE TABLE IF NOT EXISTS mesh_books.digital_works (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_id UUID NOT NULL REFERENCES mesh_books.catalog_works(id),
    license VARCHAR(24) NOT NULL CHECK (license IN ('public_domain','creative_commons','verified_author')),
    file_sha256 CHAR(64) NOT NULL UNIQUE,
    takedown_status VARCHAR(12) NOT NULL DEFAULT 'active' CHECK (takedown_status IN ('active','under_review','removed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE mesh_books.catalog_works   ENABLE ROW LEVEL SECURITY;
ALTER TABLE mesh_books.physical_copies ENABLE ROW LEVEL SECURITY;
ALTER TABLE mesh_books.p2p_loans       ENABLE ROW LEVEL SECURITY;
ALTER TABLE mesh_books.copy_passport   ENABLE ROW LEVEL SECURITY;
ALTER TABLE mesh_books.marginalia      ENABLE ROW LEVEL SECURITY;
ALTER TABLE mesh_books.mesh_clubs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE mesh_books.digital_works   ENABLE ROW LEVEL SECURITY;

-- Politicas minimas (o backend usa mesh_service_role; clientes via Supabase usam auth.uid()).
DROP POLICY IF EXISTS books_catalog_read ON mesh_books.catalog_works;
CREATE POLICY books_catalog_read ON mesh_books.catalog_works FOR SELECT USING (true);
DROP POLICY IF EXISTS books_digital_read ON mesh_books.digital_works;
CREATE POLICY books_digital_read ON mesh_books.digital_works FOR SELECT USING (takedown_status = 'active');
DROP POLICY IF EXISTS books_copies_owner ON mesh_books.physical_copies;
CREATE POLICY books_copies_owner ON mesh_books.physical_copies FOR ALL
    USING (owner_node_id = (SELECT id FROM mesh_network.nodes WHERE auth_user_id = auth.uid()));
DROP POLICY IF EXISTS books_marginalia_author ON mesh_books.marginalia;
CREATE POLICY books_marginalia_author ON mesh_books.marginalia FOR ALL
    USING (author_node_id = (SELECT id FROM mesh_network.nodes WHERE auth_user_id = auth.uid()));
-- Leitura de marginalia alheia e filtrada por progresso na camada de API (mascara de spoiler).

GRANT ALL ON ALL TABLES IN SCHEMA mesh_books TO mesh_service_role;
