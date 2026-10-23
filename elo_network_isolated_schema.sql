-- ════════════════════════════════════════════════════════════════════════════
-- ORBE SYSTEMS // PROTOCOLO ELO — SCHEMA ISOLADO v2 (PostgreSQL 15+)
-- ════════════════════════════════════════════════════════════════════════════
-- Modelo de isolamento:
--   * Tudo vive no schema `elo_network`, de propriedade da role NOLOGIN `elo_owner`.
--   * A API conecta com a role `elo_app`, que:
--       - não tem nenhum GRANT em `public` (nem em outros schemas de outros projetos);
--       - não pode INSERT/UPDATE/DELETE em tabela alguma — só SELECT filtrado por RLS
--         e EXECUTE nas funções de negócio (SECURITY DEFINER);
--       - não lê `audit_ledger` nem a coluna `nodes.auth_user_id`.
--   * Identidade por transação: a API autentica o usuário e executa
--       SELECT set_config('elo.node_id', '<uuid>', true);
--     antes de chamar as funções. Sem isso, toda função recusa com 42501.
--   * Senha da `elo_app` NÃO fica neste arquivo: definir via vault/CI com
--       ALTER ROLE elo_app PASSWORD '...';
--
-- Regras de negócio aplicadas no banco (não só na UI):
--   * PCR só é concedido quando o autor responde (reciprocidade bilateral).
--   * Likes nunca pontuam. Anti-farm: >5 interações/min (ou >10 likes/min)
--     do mesmo remetente para o mesmo autor são recusadas e auditadas.
--   * Órbitas: 2 ≥ 50 PCR · 3 ≥ 100 PCR · 4 ≥ 160 PCR + chave mútua.
--   * Dunbar: máx. 15 vínculos no nível 4 e 50 no nível 3, por nó.
--   * Revogar uma chave mútua impõe 30 dias sem novos vínculos nível 4.
--   * Anti-paywall: posts nas órbitas 2–4 com termos de cobrança são recusados.
--   * Decaimento de 10 PCR por semana sem troca, exceto se um dos nós hiberna.
--   * Ledger de auditoria append-only com encadeamento SHA-256.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'elo_owner') THEN
        CREATE ROLE elo_owner NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'elo_app') THEN
        CREATE ROLE elo_app LOGIN NOINHERIT;
    END IF;
END
$$;

GRANT elo_owner TO CURRENT_USER;

CREATE SCHEMA IF NOT EXISTS elo_network AUTHORIZATION elo_owner;
REVOKE ALL ON SCHEMA elo_network FROM PUBLIC;
GRANT USAGE ON SCHEMA elo_network TO elo_app;

-- A role da ELO não recebe nada em `public`. (Privilégios herdados de PUBLIC
-- são verificados pela suíte de testes: SELECT/CREATE em public devem falhar.)
REVOKE ALL ON SCHEMA public FROM elo_app;

SET LOCAL ROLE elo_owner;
SET LOCAL search_path = elo_network, pg_temp;

-- ─── TABELAS ────────────────────────────────────────────────────────────────

CREATE TABLE elo_network.nodes (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id         uuid NOT NULL UNIQUE,      -- vínculo lógico, sem FK para outros schemas
    handle               varchar(32) NOT NULL UNIQUE CHECK (handle ~ '^[a-z0-9_]{3,32}$'),
    display_name         varchar(120) NOT NULL,
    public_identity_key  text NOT NULL,
    is_hibernating       boolean NOT NULL DEFAULT false,
    vault_cooldown_until timestamptz,
    created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE elo_network.posts (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    author_node_id uuid NOT NULL REFERENCES elo_network.nodes(id) ON DELETE CASCADE,
    format         text NOT NULL CHECK (format IN ('photo', 'short', 'long', 'thread')),
    orbit_level    smallint NOT NULL CHECK (orbit_level BETWEEN 1 AND 4),
    title          varchar(255) NOT NULL,
    body           text,
    media_url      text,
    created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_elo_posts_author_orbit ON elo_network.posts (author_node_id, orbit_level);

-- Aresta canônica: (node_low < node_high) impede par duplicado e auto-conexão.
CREATE TABLE elo_network.edges (
    node_low           uuid NOT NULL REFERENCES elo_network.nodes(id) ON DELETE CASCADE,
    node_high          uuid NOT NULL REFERENCES elo_network.nodes(id) ON DELETE CASCADE,
    pcr_score          integer NOT NULL DEFAULT 0 CHECK (pcr_score >= 0),
    verified_exchanges integer NOT NULL DEFAULT 0,
    mutual_key_signed  boolean NOT NULL DEFAULT false,
    orbit_level        smallint NOT NULL DEFAULT 1 CHECK (orbit_level BETWEEN 1 AND 4),
    last_exchange_at   timestamptz,
    updated_at         timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (node_low, node_high),
    CHECK (node_low < node_high)
);
CREATE INDEX ix_elo_edges_high ON elo_network.edges (node_high);

CREATE TABLE elo_network.interactions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id         uuid NOT NULL REFERENCES elo_network.posts(id) ON DELETE CASCADE,
    sender_node_id  uuid NOT NULL REFERENCES elo_network.nodes(id) ON DELETE CASCADE,
    kind            text NOT NULL CHECK (kind IN ('like', 'comment', 'voice_note', 'long_video_reflection')),
    content         text,
    status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reciprocated', 'no_score')),
    created_at      timestamptz NOT NULL DEFAULT clock_timestamp(),
    reciprocated_at timestamptz
);
CREATE INDEX ix_elo_interactions_sender_time ON elo_network.interactions (sender_node_id, created_at DESC);

CREATE TABLE elo_network.handshakes (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_node_id   uuid NOT NULL REFERENCES elo_network.nodes(id) ON DELETE CASCADE,
    target_node_id      uuid NOT NULL REFERENCES elo_network.nodes(id) ON DELETE CASCADE,
    requester_signature text NOT NULL,
    target_signature    text,
    status              text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at          timestamptz NOT NULL DEFAULT now(),
    resolved_at         timestamptz,
    CHECK (requester_node_id <> target_node_id)
);
CREATE UNIQUE INDEX ux_elo_handshake_pending
    ON elo_network.handshakes (LEAST(requester_node_id, target_node_id), GREATEST(requester_node_id, target_node_id))
    WHERE status = 'pending';

CREATE TABLE elo_network.audit_ledger (
    id             bigserial PRIMARY KEY,
    actor_node_id  uuid,
    target_node_id uuid,
    event_type     text NOT NULL,
    pcr_delta      integer NOT NULL DEFAULT 0,
    detail         jsonb NOT NULL DEFAULT '{}'::jsonb,
    prev_hash      text,
    entry_hash     text NOT NULL,
    created_at     timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE FUNCTION elo_network._ledger_append_only() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'ELO_LEDGER: audit_ledger é append-only (% bloqueado)', TG_OP USING ERRCODE = '42501';
END $$;

CREATE TRIGGER trg_elo_ledger_append_only
    BEFORE UPDATE OR DELETE ON elo_network.audit_ledger
    FOR EACH ROW EXECUTE FUNCTION elo_network._ledger_append_only();

CREATE TRIGGER trg_elo_ledger_no_truncate
    BEFORE TRUNCATE ON elo_network.audit_ledger
    FOR EACH STATEMENT EXECUTE FUNCTION elo_network._ledger_append_only();

-- ─── HELPERS INTERNOS ───────────────────────────────────────────────────────

CREATE FUNCTION elo_network.current_node_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
    SELECT NULLIF(current_setting('elo.node_id', true), '')::uuid
$$;

CREATE FUNCTION elo_network._require_node() RETURNS uuid
LANGUAGE plpgsql STABLE AS $$
DECLARE v uuid := elo_network.current_node_id();
BEGIN
    IF v IS NULL OR NOT EXISTS (SELECT 1 FROM elo_network.nodes WHERE id = v) THEN
        RAISE EXCEPTION 'ELO_AUTH: sessão sem nó autenticado' USING ERRCODE = '42501';
    END IF;
    RETURN v;
END $$;

CREATE FUNCTION elo_network._log(p_actor uuid, p_target uuid, p_event text, p_delta integer, p_detail jsonb)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_prev text; v_hash text;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext('elo_network.audit_ledger'));
    SELECT entry_hash INTO v_prev FROM elo_network.audit_ledger ORDER BY id DESC LIMIT 1;
    v_hash := encode(sha256(convert_to(
        coalesce(v_prev, 'GENESIS') || '|' || coalesce(p_actor::text, '') || '|' ||
        coalesce(p_target::text, '') || '|' || p_event || '|' || p_delta::text || '|' ||
        coalesce(p_detail, '{}'::jsonb)::text, 'UTF8')), 'hex');
    INSERT INTO elo_network.audit_ledger (actor_node_id, target_node_id, event_type, pcr_delta, detail, prev_hash, entry_hash)
    VALUES (p_actor, p_target, p_event, p_delta, coalesce(p_detail, '{}'::jsonb), v_prev, v_hash);
END $$;

CREATE FUNCTION elo_network._count_level(p_node uuid, p_level smallint) RETURNS integer
LANGUAGE sql STABLE AS $$
    SELECT count(*)::int FROM elo_network.edges
    WHERE (node_low = p_node OR node_high = p_node) AND orbit_level = p_level
$$;

CREATE FUNCTION elo_network._recompute_edge(p_low uuid, p_high uuid) RETURNS smallint
LANGUAGE plpgsql AS $$
DECLARE
    e        elo_network.edges%ROWTYPE;
    v_target smallint := 1;
    v_reason text;
BEGIN
    SELECT * INTO e FROM elo_network.edges WHERE node_low = p_low AND node_high = p_high FOR UPDATE;
    IF NOT FOUND THEN RETURN 1; END IF;

    IF e.pcr_score >= 50  THEN v_target := 2; END IF;
    IF e.pcr_score >= 100 THEN v_target := 3; END IF;
    IF e.pcr_score >= 160 AND e.mutual_key_signed THEN v_target := 4; END IF;

    IF v_target = 4 AND e.orbit_level < 4 THEN
        IF EXISTS (SELECT 1 FROM elo_network.nodes
                   WHERE id IN (p_low, p_high) AND vault_cooldown_until > now()) THEN
            v_target := 3; v_reason := 'VAULT_COOLDOWN_30D';
        ELSIF elo_network._count_level(p_low, 4::smallint) >= 15
           OR elo_network._count_level(p_high, 4::smallint) >= 15 THEN
            v_target := 3; v_reason := 'DUNBAR_VAULT_CAP_15';
        END IF;
    END IF;

    IF v_target = 3 AND e.orbit_level < 3 THEN
        IF elo_network._count_level(p_low, 3::smallint) >= 50
           OR elo_network._count_level(p_high, 3::smallint) >= 50 THEN
            v_target := 2; v_reason := coalesce(v_reason || '+', '') || 'LOUNGE_CAP_50';
        END IF;
    END IF;

    IF v_target <> e.orbit_level THEN
        UPDATE elo_network.edges SET orbit_level = v_target, updated_at = now()
        WHERE node_low = p_low AND node_high = p_high;
        PERFORM elo_network._log(p_low, p_high, 'ORBIT_CHANGED', 0,
            jsonb_build_object('from', e.orbit_level, 'to', v_target, 'pcr', e.pcr_score));
    END IF;
    IF v_reason IS NOT NULL THEN
        PERFORM elo_network._log(p_low, p_high, 'ORBIT_CAP_ENFORCED', 0,
            jsonb_build_object('reason', v_reason, 'pcr', e.pcr_score, 'held_at', v_target));
    END IF;
    RETURN v_target;
END $$;

-- Nível do espectador atual em relação a um autor (usado pela RLS de posts).
CREATE FUNCTION elo_network.viewer_level(p_author uuid) RETURNS smallint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = elo_network, pg_temp AS $$
    SELECT CASE
        WHEN elo_network.current_node_id() IS NULL THEN 0::smallint
        WHEN elo_network.current_node_id() = p_author THEN 4::smallint
        ELSE coalesce((
            SELECT orbit_level FROM elo_network.edges
            WHERE node_low  = LEAST(elo_network.current_node_id(), p_author)
              AND node_high = GREATEST(elo_network.current_node_id(), p_author)
        ), 1::smallint)
    END
$$;

-- ─── API DE NEGÓCIO (SECURITY DEFINER) ──────────────────────────────────────

CREATE FUNCTION elo_network.register_node(p_auth_user_id uuid, p_handle text, p_display_name text, p_public_key text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = elo_network, pg_temp AS $$
DECLARE v_id uuid;
BEGIN
    INSERT INTO elo_network.nodes (auth_user_id, handle, display_name, public_identity_key)
    VALUES (p_auth_user_id, lower(p_handle), p_display_name, p_public_key)
    RETURNING id INTO v_id;
    PERFORM elo_network._log(v_id, NULL, 'NODE_REGISTERED', 0, jsonb_build_object('handle', lower(p_handle)));
    RETURN v_id;
END $$;

CREATE FUNCTION elo_network.create_post(p_format text, p_orbit smallint, p_title text, p_body text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = elo_network, pg_temp AS $$
DECLARE
    v_me uuid := elo_network._require_node();
    v_id uuid;
    v_text text := lower(coalesce(p_title, '') || ' ' || coalesce(p_body, ''));
BEGIN
    IF p_orbit >= 2 AND v_text ~ '(chave\s*pix|\mpix\M|r\$\s*\d|\mpague|pagamento|assinatura|mensalidade|picpay|mercado\s*pago|paypal|stripe\.com|onlyfans|privacy\.com|link\s+de\s+compra)' THEN
        PERFORM elo_network._log(v_me, NULL, 'ANTI_PAYWALL_BLOCK', 0,
            jsonb_build_object('orbit', p_orbit, 'title', left(p_title, 80)));
        RETURN jsonb_build_object('ok', false, 'code', 'ANTI_PAYWALL_BLOCK');
    END IF;

    INSERT INTO elo_network.posts (author_node_id, format, orbit_level, title, body)
    VALUES (v_me, p_format, p_orbit, p_title, p_body)
    RETURNING id INTO v_id;
    PERFORM elo_network._log(v_me, NULL, 'POST_CREATED', 0, jsonb_build_object('post', v_id, 'orbit', p_orbit, 'format', p_format));
    RETURN jsonb_build_object('ok', true, 'post_id', v_id);
END $$;

CREATE FUNCTION elo_network.interact(p_post_id uuid, p_kind text, p_content text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = elo_network, pg_temp AS $$
DECLARE
    v_me     uuid := elo_network._require_node();
    v_post   elo_network.posts%ROWTYPE;
    v_level  smallint;
    v_recent integer;
    v_limit  integer;
    v_id     uuid;
BEGIN
    SELECT * INTO v_post FROM elo_network.posts WHERE id = p_post_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'code', 'POST_NOT_FOUND');
    END IF;
    IF v_post.author_node_id = v_me THEN
        RETURN jsonb_build_object('ok', false, 'code', 'SELF_INTERACTION');
    END IF;

    SELECT coalesce((SELECT orbit_level FROM elo_network.edges
                     WHERE node_low = LEAST(v_me, v_post.author_node_id)
                       AND node_high = GREATEST(v_me, v_post.author_node_id)), 1::smallint)
      INTO v_level;
    IF v_post.orbit_level > v_level THEN
        -- Mesmo resultado de "não existe": não revela a existência do post restrito.
        RETURN jsonb_build_object('ok', false, 'code', 'POST_NOT_FOUND');
    END IF;

    IF p_kind = 'long_video_reflection' AND v_post.format <> 'long' THEN
        RETURN jsonb_build_object('ok', false, 'code', 'KIND_FORMAT_MISMATCH');
    END IF;
    IF p_kind = 'comment' AND length(coalesce(trim(p_content), '')) < 20 THEN
        RETURN jsonb_build_object('ok', false, 'code', 'LOW_EFFORT_COMMENT');
    END IF;

    v_limit := CASE WHEN p_kind = 'like' THEN 10 ELSE 5 END;
    SELECT count(*) INTO v_recent
      FROM elo_network.interactions i
      JOIN elo_network.posts p ON p.id = i.post_id
     WHERE i.sender_node_id = v_me
       AND p.author_node_id = v_post.author_node_id
       AND (i.kind = 'like') = (p_kind = 'like')
       AND i.created_at > clock_timestamp() - interval '60 seconds';
    IF v_recent >= v_limit THEN
        PERFORM elo_network._log(v_me, v_post.author_node_id, 'ANTI_FARM_RATE_LIMIT', 0,
            jsonb_build_object('kind', p_kind, 'recent', v_recent, 'limit', v_limit));
        RETURN jsonb_build_object('ok', false, 'code', 'ANTI_FARM_RATE_LIMIT');
    END IF;

    INSERT INTO elo_network.interactions (post_id, sender_node_id, kind, content, status)
    VALUES (p_post_id, v_me, p_kind, p_content, CASE WHEN p_kind = 'like' THEN 'no_score' ELSE 'pending' END)
    RETURNING id INTO v_id;
    PERFORM elo_network._log(v_me, v_post.author_node_id, 'INTERACTION_SENT', 0,
        jsonb_build_object('interaction', v_id, 'kind', p_kind));
    RETURN jsonb_build_object('ok', true, 'interaction_id', v_id,
                              'status', CASE WHEN p_kind = 'like' THEN 'no_score' ELSE 'pending' END);
END $$;

CREATE FUNCTION elo_network.reply_to_interaction(p_interaction_id uuid, p_reply text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = elo_network, pg_temp AS $$
DECLARE
    v_me    uuid := elo_network._require_node();
    v_int   elo_network.interactions%ROWTYPE;
    v_auth  uuid;
    v_delta integer;
    v_low   uuid;
    v_high  uuid;
    v_lvl   smallint;
    v_pcr   integer;
BEGIN
    SELECT * INTO v_int FROM elo_network.interactions WHERE id = p_interaction_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'code', 'INTERACTION_NOT_FOUND');
    END IF;
    SELECT author_node_id INTO v_auth FROM elo_network.posts WHERE id = v_int.post_id;
    IF v_auth <> v_me THEN
        PERFORM elo_network._log(v_me, v_auth, 'RECIPROCITY_FORGERY_ATTEMPT', 0,
            jsonb_build_object('interaction', p_interaction_id));
        RETURN jsonb_build_object('ok', false, 'code', 'NOT_POST_AUTHOR');
    END IF;
    IF v_int.status <> 'pending' THEN
        RETURN jsonb_build_object('ok', false, 'code', 'NOT_RECIPROCABLE', 'status', v_int.status);
    END IF;
    IF length(coalesce(trim(p_reply), '')) < 2 THEN
        RETURN jsonb_build_object('ok', false, 'code', 'EMPTY_REPLY');
    END IF;

    v_delta := CASE v_int.kind
        WHEN 'comment' THEN 20
        WHEN 'voice_note' THEN 30
        WHEN 'long_video_reflection' THEN 35
        ELSE 0 END;

    UPDATE elo_network.interactions SET status = 'reciprocated', reciprocated_at = now()
    WHERE id = p_interaction_id;

    v_low := LEAST(v_me, v_int.sender_node_id);
    v_high := GREATEST(v_me, v_int.sender_node_id);
    INSERT INTO elo_network.edges (node_low, node_high, pcr_score, verified_exchanges, last_exchange_at)
    VALUES (v_low, v_high, v_delta, 1, now())
    ON CONFLICT (node_low, node_high) DO UPDATE
        SET pcr_score = elo_network.edges.pcr_score + EXCLUDED.pcr_score,
            verified_exchanges = elo_network.edges.verified_exchanges + 1,
            last_exchange_at = now(),
            updated_at = now();

    PERFORM elo_network._log(v_int.sender_node_id, v_me, 'PCR_AWARDED', v_delta,
        jsonb_build_object('interaction', p_interaction_id, 'kind', v_int.kind));
    v_lvl := elo_network._recompute_edge(v_low, v_high);
    SELECT pcr_score INTO v_pcr FROM elo_network.edges WHERE node_low = v_low AND node_high = v_high;
    RETURN jsonb_build_object('ok', true, 'pcr_delta', v_delta, 'pcr', v_pcr, 'orbit_level', v_lvl);
END $$;

CREATE FUNCTION elo_network.request_handshake(p_target uuid, p_signature text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = elo_network, pg_temp AS $$
DECLARE
    v_me uuid := elo_network._require_node();
    e    elo_network.edges%ROWTYPE;
    v_id uuid;
BEGIN
    IF p_target = v_me THEN
        RETURN jsonb_build_object('ok', false, 'code', 'SELF_HANDSHAKE');
    END IF;
    SELECT * INTO e FROM elo_network.edges
     WHERE node_low = LEAST(v_me, p_target) AND node_high = GREATEST(v_me, p_target);
    IF NOT FOUND OR e.pcr_score < 100 THEN
        RETURN jsonb_build_object('ok', false, 'code', 'HANDSHAKE_REQUIRES_100_PCR');
    END IF;
    IF e.mutual_key_signed THEN
        RETURN jsonb_build_object('ok', false, 'code', 'KEY_ALREADY_SIGNED');
    END IF;
    IF length(coalesce(p_signature, '')) < 16 THEN
        RETURN jsonb_build_object('ok', false, 'code', 'INVALID_SIGNATURE');
    END IF;
    BEGIN
        INSERT INTO elo_network.handshakes (requester_node_id, target_node_id, requester_signature)
        VALUES (v_me, p_target, p_signature) RETURNING id INTO v_id;
    EXCEPTION WHEN unique_violation THEN
        RETURN jsonb_build_object('ok', false, 'code', 'HANDSHAKE_ALREADY_PENDING');
    END;
    PERFORM elo_network._log(v_me, p_target, 'HANDSHAKE_REQUESTED', 0, jsonb_build_object('handshake', v_id));
    RETURN jsonb_build_object('ok', true, 'handshake_id', v_id);
END $$;

CREATE FUNCTION elo_network.accept_handshake(p_handshake_id uuid, p_signature text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = elo_network, pg_temp AS $$
DECLARE
    v_me   uuid := elo_network._require_node();
    h      elo_network.handshakes%ROWTYPE;
    v_low  uuid;
    v_high uuid;
    v_lvl  smallint;
    v_pcr  integer;
BEGIN
    SELECT * INTO h FROM elo_network.handshakes WHERE id = p_handshake_id FOR UPDATE;
    IF NOT FOUND OR h.target_node_id <> v_me THEN
        RETURN jsonb_build_object('ok', false, 'code', 'HANDSHAKE_NOT_FOUND');
    END IF;
    IF h.status <> 'pending' THEN
        RETURN jsonb_build_object('ok', false, 'code', 'HANDSHAKE_NOT_PENDING');
    END IF;
    IF length(coalesce(p_signature, '')) < 16 THEN
        RETURN jsonb_build_object('ok', false, 'code', 'INVALID_SIGNATURE');
    END IF;
    IF EXISTS (SELECT 1 FROM elo_network.nodes
               WHERE id IN (h.requester_node_id, h.target_node_id) AND vault_cooldown_until > now()) THEN
        UPDATE elo_network.handshakes SET status = 'rejected', resolved_at = now() WHERE id = h.id;
        PERFORM elo_network._log(v_me, h.requester_node_id, 'HANDSHAKE_BLOCKED_COOLDOWN', 0,
            jsonb_build_object('handshake', h.id));
        RETURN jsonb_build_object('ok', false, 'code', 'VAULT_COOLDOWN_30D');
    END IF;

    UPDATE elo_network.handshakes
       SET status = 'accepted', target_signature = p_signature, resolved_at = now()
     WHERE id = h.id;

    v_low := LEAST(h.requester_node_id, h.target_node_id);
    v_high := GREATEST(h.requester_node_id, h.target_node_id);
    UPDATE elo_network.edges
       SET mutual_key_signed = true, pcr_score = pcr_score + 45, last_exchange_at = now(), updated_at = now()
     WHERE node_low = v_low AND node_high = v_high;

    PERFORM elo_network._log(h.requester_node_id, h.target_node_id, 'MUTUAL_KEY_SIGNED', 45,
        jsonb_build_object('handshake', h.id));
    v_lvl := elo_network._recompute_edge(v_low, v_high);
    SELECT pcr_score INTO v_pcr FROM elo_network.edges WHERE node_low = v_low AND node_high = v_high;
    RETURN jsonb_build_object('ok', true, 'pcr', v_pcr, 'orbit_level', v_lvl);
END $$;

CREATE FUNCTION elo_network.revoke_mutual_key(p_other uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = elo_network, pg_temp AS $$
DECLARE
    v_me   uuid := elo_network._require_node();
    v_low  uuid := LEAST(v_me, p_other);
    v_high uuid := GREATEST(v_me, p_other);
    v_lvl  smallint;
BEGIN
    UPDATE elo_network.edges SET mutual_key_signed = false, updated_at = now()
     WHERE node_low = v_low AND node_high = v_high AND mutual_key_signed;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'code', 'NO_SIGNED_KEY');
    END IF;
    UPDATE elo_network.nodes SET vault_cooldown_until = now() + interval '30 days' WHERE id = v_me;
    PERFORM elo_network._log(v_me, p_other, 'MUTUAL_KEY_REVOKED', 0, jsonb_build_object('cooldown_days', 30));
    v_lvl := elo_network._recompute_edge(v_low, v_high);
    RETURN jsonb_build_object('ok', true, 'orbit_level', v_lvl);
END $$;

CREATE FUNCTION elo_network.set_hibernation(p_on boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = elo_network, pg_temp AS $$
DECLARE v_me uuid := elo_network._require_node();
BEGIN
    UPDATE elo_network.nodes SET is_hibernating = p_on WHERE id = v_me;
    PERFORM elo_network._log(v_me, NULL, CASE WHEN p_on THEN 'HIBERNATION_ON' ELSE 'HIBERNATION_OFF' END, 0, '{}'::jsonb);
    RETURN jsonb_build_object('ok', true, 'hibernating', p_on);
END $$;

-- Rodar via cron com a role elo_owner (não exposto para elo_app).
CREATE FUNCTION elo_network.apply_decay()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = elo_network, pg_temp AS $$
DECLARE r record; n integer := 0;
BEGIN
    FOR r IN
        SELECT e.node_low, e.node_high, e.pcr_score
          FROM elo_network.edges e
          JOIN elo_network.nodes a ON a.id = e.node_low
          JOIN elo_network.nodes b ON b.id = e.node_high
         WHERE e.last_exchange_at < now() - interval '7 days'
           AND e.pcr_score > 0
           AND NOT a.is_hibernating AND NOT b.is_hibernating
         FOR UPDATE OF e
    LOOP
        UPDATE elo_network.edges
           SET pcr_score = greatest(0, pcr_score - 10),
               last_exchange_at = now(),
               updated_at = now()
         WHERE node_low = r.node_low AND node_high = r.node_high;
        PERFORM elo_network._log(r.node_low, r.node_high, 'PCR_DECAY', -least(10, r.pcr_score), '{}'::jsonb);
        PERFORM elo_network._recompute_edge(r.node_low, r.node_high);
        n := n + 1;
    END LOOP;
    RETURN n;
END $$;

-- ─── ROW LEVEL SECURITY ─────────────────────────────────────────────────────

ALTER TABLE elo_network.nodes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE elo_network.posts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE elo_network.edges        ENABLE ROW LEVEL SECURITY;
ALTER TABLE elo_network.interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE elo_network.handshakes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE elo_network.audit_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY elo_nodes_read ON elo_network.nodes FOR SELECT TO elo_app
    USING (elo_network.current_node_id() IS NOT NULL);

CREATE POLICY elo_posts_read ON elo_network.posts FOR SELECT TO elo_app
    USING (orbit_level <= elo_network.viewer_level(author_node_id));

CREATE POLICY elo_edges_read ON elo_network.edges FOR SELECT TO elo_app
    USING (elo_network.current_node_id() IN (node_low, node_high));

CREATE POLICY elo_interactions_read ON elo_network.interactions FOR SELECT TO elo_app
    USING (
        sender_node_id = elo_network.current_node_id()
        OR EXISTS (SELECT 1 FROM elo_network.posts p
                   WHERE p.id = post_id AND p.author_node_id = elo_network.current_node_id())
    );

CREATE POLICY elo_handshakes_read ON elo_network.handshakes FOR SELECT TO elo_app
    USING (elo_network.current_node_id() IN (requester_node_id, target_node_id));

-- audit_ledger: nenhuma policy e nenhum GRANT para elo_app.

-- ─── PRIVILÉGIOS ────────────────────────────────────────────────────────────

REVOKE ALL ON ALL TABLES    IN SCHEMA elo_network FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA elo_network FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA elo_network FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE elo_owner IN SCHEMA elo_network REVOKE ALL ON FUNCTIONS FROM PUBLIC;

-- Leitura (filtrada por RLS). `auth_user_id` fica fora: não vaza o vínculo com a conta master.
GRANT SELECT (id, handle, display_name, public_identity_key, is_hibernating, created_at)
    ON elo_network.nodes TO elo_app;
GRANT SELECT ON elo_network.posts, elo_network.edges, elo_network.interactions, elo_network.handshakes TO elo_app;

-- Escrita somente pelas funções de negócio.
GRANT EXECUTE ON FUNCTION
    elo_network.current_node_id(),
    elo_network.viewer_level(uuid),
    elo_network.register_node(uuid, text, text, text),
    elo_network.create_post(text, smallint, text, text),
    elo_network.interact(uuid, text, text),
    elo_network.reply_to_interaction(uuid, text),
    elo_network.request_handshake(uuid, text),
    elo_network.accept_handshake(uuid, text),
    elo_network.revoke_mutual_key(uuid),
    elo_network.set_hibernation(boolean)
TO elo_app;

COMMIT;
