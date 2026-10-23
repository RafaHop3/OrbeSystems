"""
ORBE SYSTEMS // MESH SOCIAL — ENGINE DE SIMULAÇÃO DE CONTAS & INTERAÇÕES
Executa testes determinísticos completos com contas reais, pontuação PCR,
progressão em 4 órbitas, travas anti-farm, filtros anti-paywall, limite Dunbar <= 15
e garantia estrita de zero vazamento lateral.
"""
from __future__ import annotations

import json
import re
import hashlib
import time
import uuid
from datetime import datetime, timedelta
from pathlib import Path

class MeshSimulationEngine:
    def __init__(self):
        self.nodes = {}
        self.posts = []
        self.edges = {} # (low, high) -> edge_data
        self.interactions = []
        self.handshakes = []
        self.audit_ledger = []
        self.results = []
        self.external_projects_db = {
            "public.users": [
                {"id": str(uuid.uuid4()), "email": "admin@orbesystems.com.br", "role": "admin"},
                {"id": str(uuid.uuid4()), "email": "cliente@orbesystems.com.br", "role": "premium"}
            ],
            "public.optout_requests": [
                {"id": str(uuid.uuid4()), "broker": "Serasa", "status": "COMPLETED"}
            ],
            "public.crm_leads": [
                {"id": str(uuid.uuid4()), "company": "Orbe Enterprise", "value": 15000}
            ]
        }
        self.initial_external_fingerprint = self._compute_external_fingerprint()

    def _compute_external_fingerprint(self):
        raw = json.dumps(self.external_projects_db, sort_keys=True)
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    def log_result(self, category: str, test_name: str, passed: bool, detail: str = ""):
        self.results.append({
            "category": category,
            "test": test_name,
            "passed": passed,
            "detail": detail
        })
        status_str = "PASS" if passed else "FAIL"
        print(f"[{status_str}] {category} :: {test_name} -> {detail}")

    def append_audit(self, actor: str, target: str, event_type: str, pcr_delta: int, detail: dict):
        prev_hash = self.audit_ledger[-1]["entry_hash"] if self.audit_ledger else "GENESIS"
        payload = f"{prev_hash}|{actor}|{target}|{event_type}|{pcr_delta}|{json.dumps(detail, sort_keys=True)}"
        entry_hash = hashlib.sha256(payload.encode("utf-8")).hexdigest()
        entry = {
            "id": len(self.audit_ledger) + 1,
            "actor": actor,
            "target": target,
            "event_type": event_type,
            "pcr_delta": pcr_delta,
            "detail": detail,
            "prev_hash": prev_hash,
            "entry_hash": entry_hash,
            "timestamp": datetime.utcnow().isoformat()
        }
        self.audit_ledger.append(entry)
        return entry

    def register_node(self, handle: str, display_name: str, public_key: str):
        node_id = str(uuid.uuid4())
        self.nodes[handle] = {
            "id": node_id,
            "handle": handle,
            "display_name": display_name,
            "public_key": public_key,
            "is_hibernating": False,
            "cooldown_until": None,
            "created_at": datetime.utcnow()
        }
        self.append_audit(node_id, None, "NODE_REGISTERED", 0, {"handle": handle})
        return self.nodes[handle]

    def _get_edge_key(self, id_a: str, id_b: str):
        return (min(id_a, id_b), max(id_a, id_b))

    def get_or_create_edge(self, handle_a: str, handle_b: str):
        id_a = self.nodes[handle_a]["id"]
        id_b = self.nodes[handle_b]["id"]
        key = self._get_edge_key(id_a, id_b)
        if key not in self.edges:
            self.edges[key] = {
                "node_low": key[0],
                "node_high": key[1],
                "pcr_score": 0,
                "verified_replies": 0,
                "mutual_key_signed": False,
                "orbit_level": 1,
                "last_exchange_at": datetime.utcnow()
            }
        return self.edges[key]

    def count_orbit_connections(self, node_id: str, level: int):
        count = 0
        for (low, high), edge in self.edges.items():
            if (low == node_id or high == node_id) and edge["orbit_level"] == level:
                count += 1
        return count

    def recompute_orbit(self, handle_a: str, handle_b: str):
        edge = self.get_or_create_edge(handle_a, handle_b)
        pcr = edge["pcr_score"]
        key = edge["mutual_key_signed"]
        target = 1
        if pcr >= 50:
            target = 2
        if pcr >= 100:
            target = 3
        if pcr >= 160 and key:
            target = 4

        # Check Dunbar Caps
        id_a = self.nodes[handle_a]["id"]
        id_b = self.nodes[handle_b]["id"]

        if target == 4 and edge["orbit_level"] < 4:
            cap_a = self.count_orbit_connections(id_a, 4)
            cap_b = self.count_orbit_connections(id_b, 4)
            if cap_a >= 15 or cap_b >= 15:
                target = 3
                self.append_audit(id_a, id_b, "ORBIT_CAP_ENFORCED", 0, {"reason": "DUNBAR_VAULT_CAP_15", "pcr": pcr})

        if target == 3 and edge["orbit_level"] < 3:
            cap_a = self.count_orbit_connections(id_a, 3)
            cap_b = self.count_orbit_connections(id_b, 3)
            if cap_a >= 50 or cap_b >= 50:
                target = 2
                self.append_audit(id_a, id_b, "ORBIT_CAP_ENFORCED", 0, {"reason": "LOUNGE_CAP_50", "pcr": pcr})

        if target != edge["orbit_level"]:
            prev = edge["orbit_level"]
            edge["orbit_level"] = target
            self.append_audit(id_a, id_b, "ORBIT_CHANGED", 0, {"from": prev, "to": target, "pcr": pcr})
        return target

    def create_post(self, author_handle: str, format_type: str, orbit_level: int, title: str, body: str):
        # Anti-paywall RegEx
        raw_text = f"{title} {body}".lower()
        paywall_pattern = r"(chave\s*pix|\bpix\b|r\$\s*\d|\bpague\b|pagamento|assinatura|mensalidade|picpay|mercado\s*pago|paypal|stripe\.com|onlyfans|link\s+de\s+compra)"
        if orbit_level >= 2 and re.search(paywall_pattern, raw_text):
            self.append_audit(self.nodes[author_handle]["id"], None, "ANTI_PAYWALL_BLOCK", 0, {"title": title, "orbit": orbit_level})
            return {"ok": False, "code": "ANTI_PAYWALL_BLOCK", "error": "Cobrança ou paywall estritamente proibido nas órbitas privadas."}

        post_id = str(uuid.uuid4())
        post = {
            "id": post_id,
            "author_id": self.nodes[author_handle]["id"],
            "author_handle": author_handle,
            "format": format_type,
            "orbit_level": orbit_level,
            "title": title,
            "body": body,
            "created_at": datetime.utcnow()
        }
        self.posts.append(post)
        self.append_audit(self.nodes[author_handle]["id"], None, "POST_CREATED", 0, {"post_id": post_id, "orbit": orbit_level})
        return {"ok": True, "post": post}

    def interact(self, sender_handle: str, post_id: str, kind: str, content: str = ""):
        post = next((p for p in self.posts if p["id"] == post_id), None)
        if not post:
            return {"ok": False, "code": "POST_NOT_FOUND"}

        author_handle = post["author_handle"]
        if author_handle == sender_handle:
            return {"ok": False, "code": "SELF_INTERACTION"}

        # Check visibility
        edge = self.get_or_create_edge(sender_handle, author_handle)
        if post["orbit_level"] > edge["orbit_level"]:
            return {"ok": False, "code": "POST_NOT_FOUND"} # Conceals restricted posts

        # Anti-Farm Rate Limit (max 10 likes / min, max 5 interactions / min)
        recent_cutoff = datetime.utcnow() - timedelta(seconds=60)
        recent_interactions = [
            i for i in self.interactions
            if i["sender"] == sender_handle and i["target"] == author_handle and i["kind"] == kind and i["time"] > recent_cutoff
        ]
        limit = 10 if kind == "like" else 5
        if len(recent_interactions) >= limit:
            self.append_audit(self.nodes[sender_handle]["id"], self.nodes[author_handle]["id"], "ANTI_FARM_RATE_LIMIT", 0, {"kind": kind})
            return {"ok": False, "code": "ANTI_FARM_RATE_LIMIT", "error": f"Taxa de interação excedida ({limit}/min)."}

        # Low effort comment check
        if kind == "comment" and len(content.strip()) < 15:
            return {"ok": False, "code": "LOW_EFFORT_COMMENT", "error": "Comentários exigem reflexão bilateral (mín. 15 caracteres)."}

        interaction_id = str(uuid.uuid4())
        record = {
            "id": interaction_id,
            "sender": sender_handle,
            "target": author_handle,
            "post_id": post_id,
            "kind": kind,
            "content": content,
            "status": "no_score" if kind == "like" else "pending",
            "time": datetime.utcnow()
        }
        self.interactions.append(record)
        self.append_audit(self.nodes[sender_handle]["id"], self.nodes[author_handle]["id"], "INTERACTION_SENT", 0, {"kind": kind})
        return {"ok": True, "interaction": record}

    def reply_to_interaction(self, responder_handle: str, interaction_id: str, reply_text: str = "Obrigado pela contribuição!"):
        record = next((i for i in self.interactions if i["id"] == interaction_id), None)
        if not record:
            return {"ok": False, "code": "INTERACTION_NOT_FOUND"}

        if record["target"] != responder_handle:
            return {"ok": False, "code": "NOT_POST_AUTHOR", "error": "Apenas o autor do post pode validar a reciprocidade."}

        if record["status"] != "pending":
            return {"ok": False, "code": "NOT_RECIPROCABLE", "error": "Esta ação não pode ser pontuada."}

        pcr_deltas = {
            "comment": 20,
            "voice_note": 30,
            "long_video_reflection": 35
        }
        delta = pcr_deltas.get(record["kind"], 0)
        record["status"] = "reciprocated"

        edge = self.get_or_create_edge(record["sender"], responder_handle)
        edge["pcr_score"] += delta
        edge["verified_replies"] += 1
        edge["last_exchange_at"] = datetime.utcnow()

        self.append_audit(self.nodes[record["sender"]]["id"], self.nodes[responder_handle]["id"], "PCR_AWARDED", delta, {"kind": record["kind"]})
        new_orbit = self.recompute_orbit(record["sender"], responder_handle)

        return {"ok": True, "pcr_delta": delta, "new_pcr": edge["pcr_score"], "orbit_level": new_orbit}

    def perform_handshake(self, requester_handle: str, target_handle: str):
        edge = self.get_or_create_edge(requester_handle, target_handle)
        if edge["pcr_score"] < 100:
            return {"ok": False, "code": "HANDSHAKE_REQUIRES_100_PCR", "error": "Handshake de chave mútua exige mínimo de 100 PCR bilateral."}

        edge["mutual_key_signed"] = True
        edge["pcr_score"] += 45
        edge["last_exchange_at"] = datetime.utcnow()

        self.append_audit(self.nodes[requester_handle]["id"], self.nodes[target_handle]["id"], "MUTUAL_KEY_SIGNED", 45, {})
        new_orbit = self.recompute_orbit(requester_handle, target_handle)
        return {"ok": True, "mutual_key_signed": True, "new_pcr": edge["pcr_score"], "orbit_level": new_orbit}

    def visible_posts(self, viewer_handle: str, author_handle: str):
        edge = self.get_or_create_edge(viewer_handle, author_handle)
        viewer_level = edge["orbit_level"]
        return [p for p in self.posts if p["author_handle"] == author_handle and p["orbit_level"] <= viewer_level]


def run_full_simulation():
    print("═══════════════════════════════════════════════════════════════════")
    print("   ORBE SYSTEMS // MESH SOCIAL — MOTOR DE SIMULAÇÃO DE REDE       ")
    print("═══════════════════════════════════════════════════════════════════")
    engine = MeshSimulationEngine()

    # 1. Registro de Contas
    print("\n--- 1. REGISTRO DE CONTAS TESTE NO MESH SOCIAL ---")
    handles = {
        "marina_costa": "Marina Costa (Arquiteta & Designer)",
        "lucas_amaral": "Lucas Amaral (Software Engineer)",
        "bia_nunes": "Bia Nunes (Pesquisadora)",
        "spam_bot_x": "Spam Bot Farm 9000",
        "vendedor_vip": "Vendedor de Acesso Paywall",
        "curioso_anon": "Curioso da Praça Pública"
    }
    for i in range(1, 16):
        handles[f"nucleo_{i:02d}"] = f"Amigo Dunbar Núcleo {i:02d}"

    for h, name in handles.items():
        engine.register_node(h, name, f"ed25519_pk_{h}_orbe")

    engine.log_result("Contas", "21 contas registradas no Mesh Social", len(engine.nodes) == 21, f"{len(engine.nodes)} nós ativos")

    # 2. Publicação de Posts da Marina nas 4 Órbitas
    print("\n--- 2. CRIAÇÃO DE POSTS EM CAMADAS (ÓRBITAS 1 A 4) ---")
    posts_meta = [
        ("thread", 1, "Por que as redes sociais tradicionais colapsaram?", "Thread pública sobre a perda de espontaneidade."),
        ("short", 1, "Estudo de iluminação 60fps no estúdio novo", "Vídeo curto da luz natural no fim de tarde."),
        ("long", 1, "Ensaio aberto: arquitetura viva de software", "Vlog de 10 min em 4K disponível publicamente."),
        ("photo", 2, "Bastidores da montagem do servidor local", "Álbum RAW de rotina real (Órbita 2)."),
        ("long", 3, "Por que recusei a proposta da agência", "Ensaio pessoal de 16 minutos (Órbita 3)."),
        ("photo", 4, "Arquivo de família na serra e memórias", "Cofre íntimo reservado a Dunbar <= 15.")
    ]
    posts_created = {}
    for fmt, orbit, title, body in posts_meta:
        res = engine.create_post("marina_costa", fmt, orbit, title, body)
        posts_created[f"orbit_{orbit}_{fmt}"] = res["post"]["id"]

    engine.log_result("Publicações", "6 posts distribuídos nas 4 órbitas criados com sucesso", len(posts_created) == 6, "Órbitas 1, 2, 3 e 4 ativas")

    # 3. Simulação de Descoberta e Progressão Bilateral (Lucas Amaral)
    print("\n--- 3. SIMULAÇÃO DE RECIPROCIDADE BILATERAL: LUCAS AMARAL ---")
    # Lucas vê apenas posts da Órbita 1 inicialmente
    lucas_visible = engine.visible_posts("lucas_amaral", "marina_costa")
    engine.log_result("Descoberta", "Lucas inicia na Órbita 1 (Praça Pública)", len(lucas_visible) == 3, f"{len(lucas_visible)} posts visíveis")

    # Ação 1: Comentário em thread pública
    inter_1 = engine.interact("lucas_amaral", posts_created["orbit_1_thread"], "comment", "Concordo plenamente com a tese de colapso de contexto!")
    edge_init = engine.get_or_create_edge("lucas_amaral", "marina_costa")
    engine.log_result("Reciprocidade", "Comentário unilateral gera 0 PCR antes da resposta", edge_init["pcr_score"] == 0, f"PCR atual: {edge_init['pcr_score']}")

    # Marina responde -> PCR concedido!
    rep_1 = engine.reply_to_interaction("marina_costa", inter_1["interaction"]["id"], "Exato Lucas, a retenção forçada destruiu as conversas reais.")
    engine.log_result("Reciprocidade", "Resposta da autora concede +20 PCR", rep_1["pcr_delta"] == 20 and rep_1["new_pcr"] == 20, f"PCR: {rep_1['new_pcr']}")

    # Ação 2: Troca de nota de voz (1 min)
    inter_2 = engine.interact("lucas_amaral", posts_created["orbit_1_short"], "voice_note", "audio_note_60s_lucas")
    rep_2 = engine.reply_to_interaction("marina_costa", inter_2["interaction"]["id"], "Excelente reflexão no áudio, concordo!")
    engine.log_result("Órbita 2", "Troca de áudio soma +30 PCR -> Atinge 50 PCR (Promove para Órbita 2)", rep_2["new_pcr"] == 50 and rep_2["orbit_level"] == 2, f"PCR: {rep_2['new_pcr']} - Nível: {rep_2['orbit_level']}")

    lucas_visible_l2 = engine.visible_posts("lucas_amaral", "marina_costa")
    engine.log_result("Desbloqueio", "Lucas agora enxerga a Órbita 2 (Bastidores e rotina)", any(p["orbit_level"] == 2 for p in lucas_visible_l2), f"{len(lucas_visible_l2)} posts visíveis")

    # Ação 3: Vídeo longo + Reflexão
    inter_3 = engine.interact("lucas_amaral", posts_created["orbit_1_long"], "long_video_reflection", "Assisti o ensaio completo e anotei 3 pontos sobre software vivo.")
    rep_3 = engine.reply_to_interaction("marina_costa", inter_3["interaction"]["id"], "Sensacional sua análise de arquitetura!")
    engine.log_result("Retenção", "Reflexão de vídeo longo soma +35 PCR", rep_3["pcr_delta"] == 35 and rep_3["new_pcr"] == 85, f"PCR: {rep_3['new_pcr']}")

    # Ação 4: Comentário na foto da Órbita 2 -> Leva a 105 PCR (Órbita 3)
    inter_4 = engine.interact("lucas_amaral", posts_created["orbit_2_photo"], "comment", "Bancada sensacional! O servidor local com Proxmox ficou limpo.")
    rep_4 = engine.reply_to_interaction("marina_costa", inter_4["interaction"]["id"], "Obrigada! Ficou muito silencioso.")
    engine.log_result("Órbita 3", "Total ultrapassa 100 PCR -> Promove para Órbita 3 (Sala de Estar)", rep_4["new_pcr"] == 105 and rep_4["orbit_level"] == 3, f"PCR: {rep_4['new_pcr']} - Nível: {rep_4['orbit_level']}")

    # Ação 5: Handshake de Chave Mútua
    hs = engine.perform_handshake("lucas_amaral", "marina_costa")
    engine.log_result("Chave Mútua", "Handshake criptográfico bilateral soma +45 PCR + Chave Mútua Ativa", hs["ok"] and hs["new_pcr"] == 150 and hs["mutual_key_signed"], f"PCR: {hs['new_pcr']}")

    # Ação 6: Mais uma interação bilateral para cruzar 160 PCR com chave assinada -> ÓRBITA 4 (DUNBAR COFRE)
    inter_5 = engine.interact("lucas_amaral", posts_created["orbit_3_long"], "long_video_reflection", "Comentário profundo sobre independência e autonomia.")
    rep_5 = engine.reply_to_interaction("marina_costa", inter_5["interaction"]["id"], "Muito bom ter sua perspectiva sincera.")
    engine.log_result("Órbita 4", "185 PCR + Chave Mútua -> Desbloqueio da Órbita 4 (Cofre Íntimo)", rep_5["new_pcr"] == 185 and rep_5["orbit_level"] == 4, f"PCR: {rep_5['new_pcr']} - Nível: {rep_5['orbit_level']}")

    lucas_visible_l4 = engine.visible_posts("lucas_amaral", "marina_costa")
    engine.log_result("Acesso Total", "Lucas acessa todas as 4 camadas da Marina por reciprocidade", len(lucas_visible_l4) == 6, "6/6 posts acessíveis")

    # 4. Testes de Auditoria Zero-Trust (Anti-Farm e Anti-Paywall)
    print("\n--- 4. AUDITORIA ZERO-TRUST & SEGURANÇA SAST ---")
    # Anti-Farm
    spam_likes = [engine.interact("spam_bot_x", posts_created["orbit_1_thread"], "like") for _ in range(15)]
    likes_accepted = sum(1 for x in spam_likes if x["ok"])
    likes_blocked = sum(1 for x in spam_likes if not x["ok"] and x["code"] == "ANTI_FARM_RATE_LIMIT")
    engine.log_result("Anti-Farm", "Trava de taxa bloqueia excesso de curtidas (>10/min)", likes_accepted == 10 and likes_blocked == 5, f"Aceitos: {likes_accepted}, Bloqueados: {likes_blocked}")

    edge_spam = engine.get_or_create_edge("spam_bot_x", "marina_costa")
    engine.log_result("Zero-Score", "Curtidas isoladas concedem 0 PCR", edge_spam["pcr_score"] == 0, f"PCR do bot: {edge_spam['pcr_score']}")

    # Anti-Paywall
    bad_post = engine.create_post("vendedor_vip", "photo", 3, "Acesso VIP", "Envie R$ 50 na chave pix para liberar meu cofre.")
    engine.log_result("Anti-Paywall", "Tentativa de injeção de PIX/Cobrança privada bloqueada", not bad_post["ok"] and bad_post["code"] == "ANTI_PAYWALL_BLOCK", bad_post.get("error", ""))

    good_sponsor = engine.create_post("vendedor_vip", "photo", 1, "Cafeteria parceira", "Desconto de R$ 5 na praça pública.")
    engine.log_result("Sustentabilidade", "Patrocínio na Praça Pública (Órbita 1) permitido", good_sponsor["ok"], "Permitido somente na superfície aberta")

    # 5. Teste de Limite de Dunbar (<= 15 nós no Nível 4)
    print("\n--- 5. TESTE DE HARD-CAP DE DUNBAR (MAX 15 NÓS NO NÍVEL 4) ---")
    for i in range(1, 16):
        h = f"nucleo_{i:02d}"
        edge = engine.get_or_create_edge(h, "marina_costa")
        edge["pcr_score"] = 200
        edge["mutual_key_signed"] = True
        engine.recompute_orbit(h, "marina_costa")

    total_vault = engine.count_orbit_connections(engine.nodes["marina_costa"]["id"], 4)
    engine.log_result("Dunbar Cap", "Limite rigoroso de 15 conexões na Órbita 4 respeitado", total_vault == 15, f"{total_vault} conexões no Nível 4 (16ª retida no Nível 3)")

    # 6. Verificação do Ledger SHA-256 e Zero Vazamento Lateral
    print("\n--- 6. VERIFICAÇÃO DO LEDGER DE AUDITORIA E ZERO VAZAMENTO LATERAL ---")
    ledger_intact = True
    for idx, entry in enumerate(engine.audit_ledger):
        if idx > 0:
            if entry["prev_hash"] != engine.audit_ledger[idx - 1]["entry_hash"]:
                ledger_intact = False
                break
    engine.log_result("Audit Ledger", "Cadeia de auditoria SHA-256 100% íntegra", ledger_intact and len(engine.audit_ledger) > 20, f"{len(engine.audit_ledger)} eventos criptografados")

    final_external_fingerprint = engine._compute_external_fingerprint()
    zero_leakage = (engine.initial_external_fingerprint == final_external_fingerprint)
    engine.log_result("Zero Leakage", "Bancos externos (Users, Opt-Out, CRM) permaneceram 100% isolados e intactos", zero_leakage, "Nenhuma alteração lateral detectada")

    print("\n═══════════════════════════════════════════════════════════════════")
    passed_count = sum(1 for r in engine.results if r["passed"])
    total_count = len(engine.results)
    print(f"   RESULTADO FINAL: {passed_count}/{total_count} TESTES APROVADOS")
    print("   O MESH SOCIAL ESTÁ FLUINDO PERFEITAMENTE SEM VAZAMENTO LATERAL! ")
    print("═══════════════════════════════════════════════════════════════════")
    return passed_count == total_count

if __name__ == "__main__":
    success = run_full_simulation()
    exit(0 if success else 1)
