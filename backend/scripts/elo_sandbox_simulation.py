"""
Protocolo ELO — simulação ponta a ponta em sandbox PostgreSQL efêmero.

O que faz:
  1. Sobe um PostgreSQL 16 descartável em Docker (127.0.0.1:55432) — NÃO toca em
     nenhum banco real da Orbe (Supabase/Neon/AWS).
  2. Cria tabelas falsas em `public` simulando outros projetos (users, optout_requests,
     user_subscriptions) e tira um fingerprint delas.
  3. Aplica `elo_network_isolated_schema.sql` exatamente como seria aplicado em produção.
  4. Cria 21 contas de teste e executa cenários reais via role `elo_app`
     (a mesma que a API usaria), checando regras de negócio, RLS e isolamento.
  5. Gera relatório JSON e remove o container (use --keep para mantê-lo).

Uso:
  python backend/scripts/elo_sandbox_simulation.py [--keep] [--report caminho.json]
"""
from __future__ import annotations

import argparse
import json
import secrets
import subprocess
import sys
import time
import uuid
from pathlib import Path

import psycopg2

ROOT = Path(__file__).resolve().parents[2]
SCHEMA_FILE = ROOT / "elo_network_isolated_schema.sql"
CONTAINER = "elo-sandbox-pg"
IMAGE = "postgres:16-alpine"
PORT = 55432

RESULTS: list[dict] = []


def check(section: str, name: str, cond: bool, detail: object = "") -> bool:
    RESULTS.append({"section": section, "name": name, "ok": bool(cond), "detail": str(detail)})
    print(f"[{'PASS' if cond else 'FAIL'}] {section} | {name} | {detail}")
    return bool(cond)


def sh(cmd: list[str], check_rc: bool = True) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=True, check=check_rc)


# ─── Infra ──────────────────────────────────────────────────────────────────

def start_container(su_password: str) -> None:
    sh(["docker", "rm", "-f", CONTAINER], check_rc=False)
    sh(["docker", "run", "-d", "--name", CONTAINER,
        "-e", f"POSTGRES_PASSWORD={su_password}",
        "-p", f"127.0.0.1:{PORT}:5432", IMAGE])
    deadline = time.time() + 90
    while time.time() < deadline:
        try:
            psycopg2.connect(host="127.0.0.1", port=PORT, user="postgres",
                             password=su_password, dbname="postgres", connect_timeout=2).close()
            time.sleep(1)  # imagem oficial reinicia após o init; confirma de novo
            psycopg2.connect(host="127.0.0.1", port=PORT, user="postgres",
                             password=su_password, dbname="postgres", connect_timeout=2).close()
            return
        except psycopg2.OperationalError:
            time.sleep(1)
    raise RuntimeError("PostgreSQL do sandbox não ficou pronto a tempo")


class Session:
    """Conexão que imita a API: identidade por transação via set_config('elo.node_id')."""

    def __init__(self, **dsn):
        self.conn = psycopg2.connect(**dsn)

    def _run(self, node, sql, params=(), fetch="one"):
        cur = self.conn.cursor()
        try:
            cur.execute("SELECT set_config('elo.node_id', %s, true)", (str(node) if node else "",))
            cur.execute(sql, params)
            out = cur.fetchone() if fetch == "one" else cur.fetchall()
            self.conn.commit()
            return out
        except Exception:
            self.conn.rollback()
            raise

    def fn(self, node, sql, params=()):
        return self._run(node, sql, params, "one")[0]

    def rows(self, node, sql, params=()):
        return self._run(node, sql, params, "all")

    def denied(self, node, sql, params=()):
        try:
            self._run(node, sql, params, "all")
            return False, "executou sem erro"
        except psycopg2.Error as exc:
            return True, f"{exc.pgcode}: {(exc.pgerror or '').strip().splitlines()[0]}"


# ─── Simulação ──────────────────────────────────────────────────────────────

def run(keep: bool, report_path: Path) -> int:
    su_pw = secrets.token_urlsafe(18)
    app_pw = secrets.token_urlsafe(18)
    backend_pw = secrets.token_urlsafe(18)

    print(f"» Subindo sandbox {IMAGE} em 127.0.0.1:{PORT} ...")
    start_container(su_pw)

    try:
        boot = psycopg2.connect(host="127.0.0.1", port=PORT, user="postgres", password=su_pw, dbname="postgres")
        boot.autocommit = True
        boot.cursor().execute("CREATE DATABASE elo_sandbox")
        boot.close()

        su = psycopg2.connect(host="127.0.0.1", port=PORT, user="postgres", password=su_pw, dbname="elo_sandbox")
        su.autocommit = True
        sc = su.cursor()

        def su_one(sql, params=()):
            sc.execute(sql, params)
            return sc.fetchone()

        # 1) Outros projetos da Orbe (emulados) em `public`
        sc.execute(f"""
            CREATE ROLE orbe_backend LOGIN PASSWORD '{backend_pw}';
            CREATE TABLE public.users (id uuid PRIMARY KEY, email text NOT NULL, password_hash text NOT NULL);
            CREATE TABLE public.optout_requests (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id uuid NOT NULL, cpf_encrypted text NOT NULL, status text NOT NULL DEFAULT 'PENDING');
            CREATE TABLE public.user_subscriptions (user_id uuid PRIMARY KEY, stripe_customer_id text, status text);
            GRANT SELECT, INSERT, UPDATE, DELETE ON public.users, public.optout_requests,
                public.user_subscriptions TO orbe_backend;
        """)
        other_tables = ["public.users", "public.optout_requests", "public.user_subscriptions"]

        def fingerprint():
            out = {}
            for t in other_tables:
                out[t] = su_one(f"SELECT count(*) || ':' || coalesce(md5(string_agg(x::text, ',' ORDER BY x::text)), '-') FROM {t} x")[0]
            return out

        # 2) Aplica o schema da ELO
        sc.execute(SCHEMA_FILE.read_text(encoding="utf-8"))
        sc.execute(f"ALTER ROLE elo_app PASSWORD '{app_pw}'")
        check("Setup", "Schema elo_network aplicado", su_one(
            "SELECT count(*) FROM pg_tables WHERE schemaname = 'elo_network'")[0] == 6, "6 tabelas")

        app = Session(host="127.0.0.1", port=PORT, user="elo_app", password=app_pw, dbname="elo_sandbox")
        backend = Session(host="127.0.0.1", port=PORT, user="orbe_backend", password=backend_pw, dbname="elo_sandbox")

        # 3) Contas de teste (conta master em public.users + nó isolado na ELO)
        handles = {
            "marina_costa": "Marina Costa", "lucas_amaral": "Lucas Amaral", "bia_nunes": "Bia Nunes",
            "spam_bot_x": "Spam Bot", "vendedor_vip": "Vendedor VIP", "curioso_anon": "Curioso",
        }
        handles.update({f"nucleo_{i:02d}": f"Núcleo {i:02d}" for i in range(1, 16)})
        N: dict[str, str] = {}
        for h, name in handles.items():
            auth_id = str(uuid.uuid4())
            sc.execute("INSERT INTO public.users (id, email, password_hash) VALUES (%s, %s, %s)",
                       (auth_id, f"{h}@teste.orbesystems.com.br", "argon2$" + secrets.token_hex(8)))
            if h in ("lucas_amaral", "bia_nunes"):
                sc.execute("INSERT INTO public.optout_requests (user_id, cpf_encrypted) VALUES (%s, %s)",
                           (auth_id, "gAAAAA" + secrets.token_hex(16)))
                sc.execute("INSERT INTO public.user_subscriptions VALUES (%s, %s, 'active')",
                           (auth_id, "cus_" + secrets.token_hex(6)))
            N[h] = str(app.fn(None, "SELECT elo_network.register_node(%s, %s, %s, %s)",
                                (auth_id, h, name, "ed25519:" + secrets.token_hex(32))))
        before = fingerprint()
        check("Contas", "21 contas de teste registradas", len(N) == 21 and su_one(
            "SELECT count(*) FROM elo_network.nodes")[0] == 21, ", ".join(list(N)[:6]) + ", nucleo_01..15")

        def sig():
            return "ed25519sig:" + secrets.token_hex(32)

        def post(node, fmt, orbit, title, body):
            return app.fn(N[node], "SELECT elo_network.create_post(%s, %s::smallint, %s, %s)", (fmt, orbit, title, body))

        def interact(node, post_id, kind, content=None):
            return app.fn(N[node], "SELECT elo_network.interact(%s, %s, %s)", (post_id, kind, content))

        def reply(node, interaction_id, text="Valeu pela troca, faz todo sentido!"):
            return app.fn(N[node], "SELECT elo_network.reply_to_interaction(%s, %s)", (interaction_id, text))

        def edge(a, b):
            r = su_one("""SELECT pcr_score, orbit_level, mutual_key_signed FROM elo_network.edges
                          WHERE node_low = LEAST(%s::uuid, %s::uuid) AND node_high = GREATEST(%s::uuid, %s::uuid)""",
                       (N[a], N[b], N[a], N[b]))
            return {"pcr": r[0], "level": r[1], "key": r[2]} if r else {"pcr": 0, "level": 1, "key": False}

        def visible_levels(viewer, author="marina_costa"):
            return sorted(r[0] for r in app.rows(N[viewer] if viewer else None,
                          "SELECT orbit_level FROM elo_network.posts WHERE author_node_id = %s", (N[author],)))

        long_comment = "Concordo: o feed algorítmico trocou conversa real por retenção de desconhecidos."

        # 4) Posts da Marina nas 4 órbitas
        P = {}
        for key, fmt, orbit, title in [
            ("thread", "thread", 1, "Por que as redes trocaram conexão real por retenção forçada?"),
            ("short", "short", 1, "Estudo de luz natural no estúdio novo"),
            ("pub_long", "long", 1, "Ensaio público: meu processo criativo"),
            ("l2_photo", "photo", 2, "Bastidores da mudança e bancada de trabalho"),
            ("l3_long", "long", 3, "Por que recusei a proposta da agência"),
            ("l4_vault", "photo", 4, "Arquivo de família na serra"),
        ]:
            r = post("marina_costa", fmt, orbit, title, "Conteúdo de teste da simulação ELO.")
            P[key] = r.get("post_id")
        check("Posts", "6 posts da Marina criados (órbitas 1–4)", all(P.values()), {k: v[:8] for k, v in P.items()})

        S = "Reciprocidade (Lucas)"
        r = interact("lucas_amaral", P["thread"], "comment", long_comment)
        check(S, "Comentário fica pendente até o autor responder", r["status"] == "pending" and edge("lucas_amaral", "marina_costa")["pcr"] == 0, r)
        r = reply("marina_costa", r["interaction_id"])
        check(S, "Resposta da autora concede +20 PCR", r["pcr"] == 20 and r["orbit_level"] == 1, r)
        last_lucas = r
        r = interact("lucas_amaral", P["short"], "voice_note", "audio://1min")
        r = reply("marina_costa", r["interaction_id"])
        check(S, "Nota de voz recíproca: 50 PCR → Órbita 2", r["pcr"] == 50 and r["orbit_level"] == 2, r)
        check(S, "Lucas passa a ver posts da Órbita 2", visible_levels("lucas_amaral") == [1, 1, 1, 2], visible_levels("lucas_amaral"))
        r = interact("lucas_amaral", P["pub_long"], "long_video_reflection", "Reflexão sobre o ensaio")
        r = reply("marina_costa", r["interaction_id"])
        check(S, "Reflexão de vídeo longo: +35 PCR", r["pcr"] == 85, r)
        r = interact("lucas_amaral", P["l2_photo"], "comment", "Que bancada! O servidor local ficou muito bem organizado.")
        r = reply("marina_costa", r["interaction_id"])
        check(S, "105 PCR → Órbita 3 (Sala de Estar)", r["pcr"] == 105 and r["orbit_level"] == 3, r)
        h = app.fn(N["lucas_amaral"], "SELECT elo_network.request_handshake(%s, %s)", (N["marina_costa"], sig()))
        r = app.fn(N["marina_costa"], "SELECT elo_network.accept_handshake(%s, %s)", (h["handshake_id"], sig()))
        check(S, "Handshake bilateral: +45 PCR e chave mútua (150 PCR, ainda Órbita 3)",
              r["ok"] and r["pcr"] == 150 and r["orbit_level"] == 3 and edge("lucas_amaral", "marina_costa")["key"], r)
        r = interact("lucas_amaral", P["l3_long"], "long_video_reflection", "Assisti o vlog inteiro")
        first_l3 = r["interaction_id"]
        r = reply("marina_costa", first_l3)
        check(S, "185 PCR + chave → Órbita 4 (Cofre Íntimo)", r["pcr"] == 185 and r["orbit_level"] == 4, r)
        check(S, "Lucas vê as 4 órbitas", visible_levels("lucas_amaral") == [1, 1, 1, 2, 3, 4], visible_levels("lucas_amaral"))
        r = app.fn(N["lucas_amaral"], "SELECT elo_network.reply_to_interaction(%s, %s)", (first_l3, "auto-resposta"))
        check(S, "Falsificação: remetente não pode 'responder' a si mesmo", r["code"] == "NOT_POST_AUTHOR", r)
        r = reply("marina_costa", first_l3)
        check(S, "Mesma interação não pontua duas vezes", r["code"] == "NOT_RECIPROCABLE", r)

        S = "Interação unilateral (Bia)"
        r = interact("bia_nunes", P["thread"], "comment", "Esse texto resume bem o problema do colapso de contexto.")
        check(S, "Sem resposta da autora = 0 PCR", edge("bia_nunes", "marina_costa")["pcr"] == 0, r)
        bia_pending = r["interaction_id"]
        r = interact("bia_nunes", P["thread"], "comment", "top!")
        check(S, "Comentário vazio/curto é recusado", r["code"] == "LOW_EFFORT_COMMENT", r)
        r = interact("bia_nunes", P["thread"], "long_video_reflection", "?")
        check(S, "Reflexão de vídeo longo só vale em post 'long'", r["code"] == "KIND_FORMAT_MISMATCH", r)
        r = interact("bia_nunes", P["l3_long"], "comment", "Tentando comentar num post restrito da órbita 3")
        check(S, "Post de órbita superior responde 'não encontrado' (não vaza existência)", r["code"] == "POST_NOT_FOUND", r)
        reply("marina_costa", bia_pending)
        r = interact("bia_nunes", P["short"], "voice_note", "audio://1min")
        r = reply("marina_costa", r["interaction_id"])
        check(S, "Depois da reciprocidade: 50 PCR → Órbita 2", r["pcr"] == 50 and r["orbit_level"] == 2, r)

        S = "Anti-farm (Spam Bot)"
        likes = [interact("spam_bot_x", P["thread"], "like") for _ in range(15)]
        ok_likes = sum(1 for x in likes if x["ok"])
        check(S, "15 likes em sequência: 10 aceitos, 5 bloqueados", ok_likes == 10 and
              sum(1 for x in likes if x.get("code") == "ANTI_FARM_RATE_LIMIT") == 5, f"aceitos={ok_likes}")
        check(S, "Likes não geram PCR", edge("spam_bot_x", "marina_costa")["pcr"] == 0)
        r = reply("marina_costa", likes[0]["interaction_id"])
        check(S, "Like não pode ser 'reciprocado'", r["code"] == "NOT_RECIPROCABLE", r)
        comments = [interact("spam_bot_x", P["thread"], "comment", f"Comentário automático número {i:02d} gerado em massa") for i in range(7)]
        check(S, "7 comentários em sequência: 5 aceitos, 2 bloqueados",
              sum(1 for x in comments if x["ok"]) == 5 and sum(1 for x in comments if x.get("code") == "ANTI_FARM_RATE_LIMIT") == 2)
        n_farm = su_one("SELECT count(*) FROM elo_network.audit_ledger WHERE event_type = 'ANTI_FARM_RATE_LIMIT'")[0]
        check(S, "Bloqueios registrados no ledger", n_farm == 7, f"{n_farm} eventos")

        S = "Anti-paywall (Vendedor)"
        r = post("vendedor_vip", "photo", 3, "Acesso VIP ao meu cofre", "Manda R$ 50 na chave pix que eu libero")
        check(S, "Cobrança em órbita privada é recusada", r["code"] == "ANTI_PAYWALL_BLOCK", r)
        r = post("vendedor_vip", "photo", 1, "Parceria: loja de café", "Cupom de R$ 5 na loja parceira")
        check(S, "Patrocínio na Praça Pública (órbita 1) é permitido", r["ok"], r)
        r = app.fn(N["vendedor_vip"], "SELECT elo_network.request_handshake(%s, %s)", (N["marina_costa"], sig()))
        check(S, "Handshake sem 100 PCR é recusado", r["code"] == "HANDSHAKE_REQUIRES_100_PCR", r)
        ok, d = app.denied(N["vendedor_vip"], "UPDATE elo_network.edges SET orbit_level = 4")
        check(S, "'Comprar' nível via UPDATE direto: negado", ok, d)
        ok, d = app.denied(N["vendedor_vip"], "INSERT INTO elo_network.edges (node_low, node_high, pcr_score) VALUES (%s, %s, 999)",
                           (min(N["vendedor_vip"], N["marina_costa"]), max(N["vendedor_vip"], N["marina_costa"])))
        check(S, "Forjar aresta via INSERT direto: negado", ok, d)
        ok, d = app.denied(N["vendedor_vip"], "INSERT INTO elo_network.posts (author_node_id, format, orbit_level, title) VALUES (%s, 'photo', 1, 'x')", (N["marina_costa"],))
        check(S, "Publicar em nome de outro via INSERT direto: negado", ok, d)

        S = "Visibilidade e RLS"
        check(S, "Desconhecido vê só a Praça Pública da Marina", visible_levels("curioso_anon") == [1, 1, 1], visible_levels("curioso_anon"))
        check(S, "Bia (Órbita 2) vê órbitas 1–2", visible_levels("bia_nunes") == [1, 1, 1, 2], visible_levels("bia_nunes"))
        check(S, "Sessão sem identidade não vê nenhum post", visible_levels(None) == [], visible_levels(None))
        ok, d = app.denied(None, "SELECT elo_network.create_post('photo', 1::smallint, 't', 'b')")
        check(S, "Sessão sem identidade não executa funções", ok, d)
        check(S, "Desconhecido não enxerga arestas alheias",
              app.rows(N["curioso_anon"], "SELECT count(*) FROM elo_network.edges")[0][0] == 0)
        check(S, "Desconhecido não enxerga interações alheias",
              app.rows(N["curioso_anon"], "SELECT count(*) FROM elo_network.interactions")[0][0] == 0)
        check(S, "Marina vê as interações recebidas nos próprios posts",
              app.rows(N["marina_costa"], "SELECT count(*) FROM elo_network.interactions")[0][0] > 0)
        ok, d = app.denied(N["curioso_anon"], "SELECT auth_user_id FROM elo_network.nodes")
        check(S, "Coluna auth_user_id (vínculo com conta master) é ilegível", ok, d)
        ok, d = app.denied(N["curioso_anon"], "SELECT * FROM elo_network.audit_ledger")
        check(S, "audit_ledger ilegível pela API", ok, d)
        ok, d = app.denied(N["curioso_anon"], "SELECT elo_network._log(NULL, NULL, 'FAKE', 999, '{}'::jsonb)")
        check(S, "Funções internas (_log) não executáveis", ok, d)
        ok, d = app.denied(N["curioso_anon"], "SELECT elo_network.apply_decay()")
        check(S, "Job de decaimento não executável pela API", ok, d)

        S = "Dunbar ≤15 e cooldown"
        for i in range(1, 16):
            h_ = f"nucleo_{i:02d}"
            for _ in range(3):
                x = interact(h_, P["pub_long"], "long_video_reflection", "Reflexão")
                reply("marina_costa", x["interaction_id"])
            hs = app.fn(N[h_], "SELECT elo_network.request_handshake(%s, %s)", (N["marina_costa"], sig()))
            app.fn(N["marina_costa"], "SELECT elo_network.accept_handshake(%s, %s)", (hs["handshake_id"], sig()))
            x = interact(h_, P["thread"], "comment", long_comment)
            last = reply("marina_costa", x["interaction_id"])
        vault = su_one("SELECT elo_network._count_level(%s::uuid, 4::smallint)", (N["marina_costa"],))[0]
        check(S, "Marina chega a exatamente 15 vínculos no Cofre (Lucas + 14)", vault == 15, f"{vault} vínculos nível 4")
        e15 = edge("nucleo_15", "marina_costa")
        check(S, "16º vínculo é retido na Órbita 3 mesmo com 170 PCR + chave",
              e15["level"] == 3 and e15["pcr"] >= 160 and e15["key"], e15)
        check(S, "16º vínculo não vê o Cofre Íntimo", 4 not in visible_levels("nucleo_15"), visible_levels("nucleo_15"))
        n_cap = su_one("SELECT count(*) FROM elo_network.audit_ledger WHERE event_type = 'ORBIT_CAP_ENFORCED' AND detail->>'reason' = 'DUNBAR_VAULT_CAP_15'")[0]
        check(S, "Retenção registrada no ledger (DUNBAR_VAULT_CAP_15)", n_cap >= 1, f"{n_cap} eventos")
        r = app.fn(N["marina_costa"], "SELECT elo_network.revoke_mutual_key(%s)", (N["nucleo_03"],))
        check(S, "Marina revoga a chave do nucleo_03 → volta à Órbita 3", r["ok"] and r["orbit_level"] == 3, r)
        x = interact("nucleo_15", P["short"], "voice_note", "audio://1min")
        r = reply("marina_costa", x["interaction_id"])
        check(S, "Vaga liberada não é reocupada durante cooldown de 30 dias", r["orbit_level"] == 3, r)
        hs = app.fn(N["nucleo_03"], "SELECT elo_network.request_handshake(%s, %s)", (N["marina_costa"], sig()))
        r = app.fn(N["marina_costa"], "SELECT elo_network.accept_handshake(%s, %s)", (hs["handshake_id"], sig()))
        check(S, "Nova chave durante cooldown é recusada (anti-rotação/venda de vaga)", r["code"] == "VAULT_COOLDOWN_30D", r)

        S = "Decaimento e hibernação"
        sc.execute("""UPDATE elo_network.edges SET last_exchange_at = now() - interval '10 days'
                      WHERE node_low = LEAST(%s::uuid, %s::uuid) AND node_high = GREATEST(%s::uuid, %s::uuid)""",
                   (N["bia_nunes"], N["marina_costa"], N["bia_nunes"], N["marina_costa"]))
        decayed = su_one("SELECT elo_network.apply_decay()")[0]
        e = edge("bia_nunes", "marina_costa")
        check(S, "10 dias sem troca: −10 PCR e queda para Órbita 1", decayed == 1 and e["pcr"] == 40 and e["level"] == 1, e)
        app.fn(N["bia_nunes"], "SELECT elo_network.set_hibernation(true)")
        sc.execute("""UPDATE elo_network.edges SET last_exchange_at = now() - interval '10 days'
                      WHERE node_low = LEAST(%s::uuid, %s::uuid) AND node_high = GREATEST(%s::uuid, %s::uuid)""",
                   (N["bia_nunes"], N["marina_costa"], N["bia_nunes"], N["marina_costa"]))
        decayed = su_one("SELECT elo_network.apply_decay()")[0]
        e = edge("bia_nunes", "marina_costa")
        check(S, "Em hibernação o vínculo não decai", decayed == 0 and e["pcr"] == 40, e)

        S = "Ledger de auditoria"
        total, broken = su_one("""
            WITH c AS (
              SELECT id, entry_hash, prev_hash, lag(entry_hash) OVER (ORDER BY id) AS expected_prev,
                     encode(sha256(convert_to(coalesce(prev_hash, 'GENESIS') || '|' || coalesce(actor_node_id::text, '') || '|' ||
                        coalesce(target_node_id::text, '') || '|' || event_type || '|' || pcr_delta::text || '|' || detail::text, 'UTF8')), 'hex') AS recomputed
              FROM elo_network.audit_ledger)
            SELECT count(*), count(*) FILTER (WHERE recomputed <> entry_hash OR prev_hash IS DISTINCT FROM expected_prev) FROM c""")
        check(S, "Cadeia SHA-256 íntegra", broken == 0, f"{total} eventos, {broken} quebrados")
        for op, stmt in [("UPDATE", "UPDATE elo_network.audit_ledger SET pcr_delta = 999"),
                         ("DELETE", "DELETE FROM elo_network.audit_ledger"),
                         ("TRUNCATE", "TRUNCATE elo_network.audit_ledger")]:
            try:
                sc.execute(stmt)
                check(S, f"{op} no ledger bloqueado até para superusuário", False, "executou")
            except psycopg2.Error as exc:
                check(S, f"{op} no ledger bloqueado até para superusuário", True, (exc.pgerror or "").strip().splitlines()[0])

        S = "Isolamento (zero vazamento lateral)"
        for t in other_tables:
            ok, d = app.denied(N["lucas_amaral"], f"SELECT * FROM {t}")
            check(S, f"elo_app não lê {t}", ok, d)
        ok, d = app.denied(N["lucas_amaral"], "CREATE TABLE public.elo_intrusao (x int)")
        check(S, "elo_app não cria tabelas em public", ok, d)
        ok, d = app.denied(N["lucas_amaral"], "UPDATE public.users SET email = 'x'")
        check(S, "elo_app não altera public.users", ok, d)
        ok, d = backend.denied(None, "SELECT * FROM elo_network.posts")
        check(S, "Backend de outro projeto não lê dados da ELO", ok, d)
        ok, d = backend.denied(None, "SELECT elo_network.register_node(gen_random_uuid(), 'intruso', 'x', 'k')")
        check(S, "Backend de outro projeto não executa funções da ELO", ok, d)
        after = fingerprint()
        check(S, "Tabelas dos outros projetos intactas após toda a simulação", before == after,
              {k.split('.')[1]: v.split(':')[0] + " linhas" for k, v in after.items()})

        stats = su_one("""SELECT (SELECT count(*) FROM elo_network.nodes), (SELECT count(*) FROM elo_network.posts),
                                 (SELECT count(*) FROM elo_network.interactions), (SELECT count(*) FROM elo_network.edges),
                                 (SELECT count(*) FROM elo_network.handshakes), (SELECT count(*) FROM elo_network.audit_ledger)""")
        summary = dict(zip(["nodes", "posts", "interactions", "edges", "handshakes", "ledger_events"], stats))
        app.conn.close(); backend.conn.close(); su.close()
    finally:
        if not keep:
            sh(["docker", "rm", "-f", CONTAINER], check_rc=False)
            print("» Sandbox removido.")
        else:
            print(f"» Sandbox mantido: container {CONTAINER} (porta {PORT}).")

    passed = sum(r["ok"] for r in RESULTS)
    report = {"passed": passed, "total": len(RESULTS), "summary": summary, "results": RESULTS}
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n» {passed}/{len(RESULTS)} verificações aprovadas · volume: {summary}")
    print(f"» Relatório: {report_path}")
    return 0 if passed == len(RESULTS) else 1


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--keep", action="store_true", help="mantém o container após a simulação")
    ap.add_argument("--report", default=str(ROOT / "backend" / "scripts" / "elo_sandbox_report.json"))
    args = ap.parse_args()
    sys.exit(run(args.keep, Path(args.report)))
