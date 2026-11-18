"""
Deterministic PolicyEngine & Structured Policy Extractor (Onda 3 - Fase 5A/5B, Manuais 31 & 35).

Architecture:
1. AI / Extractor proposes structured rules from tenant documents (PDF/.md/.docx/.txt).
2. Human manager reviews source excerpts & conflicts in UI and explicitly approves.
3. PolicyEngine deterministically validates every proposed AI action in Python against:
   - Camada 1: Orbe Inviolable Ceiling (never PAID via chat, Dual-Control > R$ 5,000, no 100% discount)
   - Camada 2: Tenant Approved Rules (`approved_rules_json`; silent rule = DENIED; conflict = ESCALATE_HUMAN)
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any, Dict, List, Optional


ORBE_DUAL_CONTROL_LIMIT_BRL = 5000.00
ORBE_HARD_MAX_DISCOUNT_PCT = 50.0  # Ceiling: never allow 100% free waiver via chat


@dataclass
class PolicyDecision:
    decision: str  # "ALLOWED" | "DENIED" | "ESCALATE_HUMAN"
    reason_code: str
    explanation: str
    requires_human_handoff: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "decision": self.decision,
            "reason_code": self.reason_code,
            "explanation": self.explanation,
            "requires_human_handoff": self.requires_human_handoff,
        }


def extract_policy_from_chunks(chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Extrai rascunho estruturado de regras do tenant a partir dos trechos RAG,
    preservando rastreabilidade (source_excerpts) e detectando conflitos entre documentos.
    Bloqueia automaticamente instruções maliciosas (ex: 100% desconto / baixa PAID via chat).
    """
    installment_matches: List[tuple[int, str, str]] = []
    discount_matches: List[tuple[float, str, str]] = []
    extension_matches: List[tuple[int, str, str]] = []
    excerpts: List[Dict[str, str]] = []
    security_warnings: List[str] = []

    re_inst = re.compile(
        r"(?:parcela\w*|parcelamento|at[eé]|m[aá]ximo\s+de)\s*(\d{1,2})\s*(?:x|vezes|parcelas?)",
        re.IGNORECASE,
    )
    re_disc = re.compile(
        r"(?:desconto\s+(?:m[aá]ximo\s+)?(?:de\s+)?(?:at[eé]\s+)?|at[eé]\s+)(\d{1,3}(?:[.,]\d{1,2})?)\s*%",
        re.IGNORECASE,
    )
    re_ext = re.compile(
        r"(?:prorroga\w*|prazo\s+m[aá]ximo|estender\s+em|at[eé])\s*(\d{1,3})\s*dias?",
        re.IGNORECASE,
    )
    re_paid_attack = re.compile(
        r"(?:dar\s+baixa|marcar\s+como\s+pag[oa]|status\s*=?\s*paid|quitar\s+(?:por|via)\s+chat)",
        re.IGNORECASE,
    )

    for ch in chunks:
        title = str(ch.get("title") or "Documento do Tenant")
        content = str(ch.get("content") or "")
        if not content.strip():
            continue

        if re_paid_attack.search(content):
            security_warnings.append(
                f"Trecho bloqueado pelo teto Orbe em '{title}': tentativa de habilitar baixa PAID via chat."
            )

        for m in re_inst.finditer(content):
            val = int(m.group(1))
            if 1 <= val <= 48:
                snippet = content[max(0, m.start() - 40): min(len(content), m.end() + 60)].strip()
                installment_matches.append((val, title, snippet))
                excerpts.append({"rule": "max_installments", "value": f"{val}x", "title": title, "excerpt": snippet})

        for m in re_disc.finditer(content):
            val = float(m.group(1).replace(",", "."))
            if val >= 100.0 or val > ORBE_HARD_MAX_DISCOUNT_PCT:
                security_warnings.append(
                    f"Desconto de {val}% em '{title}' bloqueado pelo teto Orbe (máx. {ORBE_HARD_MAX_DISCOUNT_PCT}%)."
                )
            elif 0 < val <= ORBE_HARD_MAX_DISCOUNT_PCT:
                snippet = content[max(0, m.start() - 40): min(len(content), m.end() + 60)].strip()
                discount_matches.append((val, title, snippet))
                excerpts.append({"rule": "max_discount_pct", "value": f"{val}%", "title": title, "excerpt": snippet})

        for m in re_ext.finditer(content):
            val = int(m.group(1))
            if 1 <= val <= 180:
                snippet = content[max(0, m.start() - 40): min(len(content), m.end() + 60)].strip()
                extension_matches.append((val, title, snippet))
                excerpts.append({"rule": "max_extension_days", "value": f"{val} dias", "title": title, "excerpt": snippet})

    conflicts: List[str] = []
    inst_vals = sorted({x[0] for x in installment_matches})
    if len(inst_vals) > 1:
        conflicts.append(f"Conflito em parcelamento máximo: documentos citam {inst_vals}x.")

    disc_vals = sorted({x[0] for x in discount_matches})
    if len(disc_vals) > 1:
        conflicts.append(f"Conflito em desconto máximo: documentos citam {disc_vals}%.")

    ext_vals = sorted({x[0] for x in extension_matches})
    if len(ext_vals) > 1:
        conflicts.append(f"Conflito em prorrogação de prazo: documentos citam {ext_vals} dias.")

    draft_rules: Dict[str, Any] = {
        "max_installments": min(inst_vals) if inst_vals else None,
        "max_discount_pct": min(disc_vals) if disc_vals else None,
        "max_extension_days": min(ext_vals) if ext_vals else None,
        "tone_of_voice": "acolhedor_simples",
        "allow_chat_paid": False,
        "dual_control_limit_brl": ORBE_DUAL_CONTROL_LIMIT_BRL,
    }

    all_notes = conflicts + security_warnings
    has_conflict = len(conflicts) > 0
    return {
        "draft_rules": draft_rules,
        "source_excerpts": excerpts[:30],
        "has_conflict": has_conflict,
        "conflict_notes": " | ".join(all_notes) if all_notes else None,
        "security_warnings": security_warnings,
    }


def evaluate_policy_action(
    *,
    business_id: str,
    action: str,
    amount_brl: float = 0.0,
    requested_installments: Optional[int] = None,
    requested_discount_pct: Optional[float] = None,
    requested_extension_days: Optional[int] = None,
    target_business_id: Optional[str] = None,
    policy_status: str = "DRAFT",
    approved_rules: Optional[Dict[str, Any]] = None,
    has_conflict: bool = False,
) -> PolicyDecision:
    """
    Motor Determinístico em Código Python (Camada 4 - Execução Segura).
    """
    act = (action or "").strip().lower()

    # Camada 1: Teto Inviolável Orbe (sempre prevalece)
    if target_business_id and str(target_business_id) != str(business_id):
        return PolicyDecision(
            decision="DENIED",
            reason_code="CROSS_TENANT_BLOCKED",
            explanation="Isolamento estrito RLS: operação negada entre tenants distintos.",
            requires_human_handoff=False,
        )

    if act in ("mark_paid", "baixa_fatura", "set_paid", "quitar_chat"):
        return PolicyDecision(
            decision="DENIED",
            reason_code="ORBE_INVIOLABLE_PAID_BLOCKED",
            explanation=(
                "Por segurança financeira Orbe, a IA nunca altera o status de faturas para PAID via chat. "
                "A baixa ocorre exclusivamente via conciliação bancária oficial."
            ),
            requires_human_handoff=False,
        )

    if requested_discount_pct is not None and (
        requested_discount_pct >= 100.0 or requested_discount_pct > ORBE_HARD_MAX_DISCOUNT_PCT
    ):
        return PolicyDecision(
            decision="DENIED",
            reason_code="ORBE_INVIOLABLE_FULL_DISCOUNT_BLOCKED",
            explanation=(
                f"Desconto de {requested_discount_pct}% bloqueado pelo teto de governança Orbe "
                f"(limite máximo absoluto de {ORBE_HARD_MAX_DISCOUNT_PCT:.0f}%)."
            ),
            requires_human_handoff=True,
        )

    if amount_brl > ORBE_DUAL_CONTROL_LIMIT_BRL:
        return PolicyDecision(
            decision="ESCALATE_HUMAN",
            reason_code="DUAL_CONTROL_OVER_5000",
            explanation=(
                f"Valor de R$ {amount_brl:,.2f} excede a alçada autônoma de R$ 5.000,00. "
                "Encaminhado para aprovação humana (Dual-Control)."
            ),
            requires_human_handoff=True,
        )

    # Camada 2: Política Aprovada do Tenant
    if has_conflict or policy_status == "CONFLICT_REVIEW":
        return PolicyDecision(
            decision="ESCALATE_HUMAN",
            reason_code="POLICY_CONFLICT_ESCALATE",
            explanation=(
                "Há regras conflitantes nos documentos da instituição aguardando revisão humana. "
                "Encaminhamos sua solicitação para um especialista."
            ),
            requires_human_handoff=True,
        )

    rules = approved_rules or {}
    if policy_status != "APPROVED" or not rules:
        return PolicyDecision(
            decision="DENIED",
            reason_code="SILENT_RULE_DENIED",
            explanation=(
                "Não há regra numérica aprovada pela gestão para esta negociação automática. "
                "Um atendente humano pode analisar seu caso."
            ),
            requires_human_handoff=True,
        )

    if act == "installment":
        max_inst = rules.get("max_installments")
        if not max_inst or int(max_inst) <= 0:
            return PolicyDecision(
                decision="DENIED",
                reason_code="SILENT_RULE_DENIED",
                explanation="O estatuto aprovado não autoriza parcelamento automático.",
                requires_human_handoff=True,
            )
        req_i = int(requested_installments or 0)
        if req_i <= 0 or req_i > int(max_inst):
            return PolicyDecision(
                decision="DENIED",
                reason_code="EXCEEDS_MAX_INSTALLMENTS",
                explanation=(
                    f"Solicitação de {req_i}x excede o limite aprovado de até {int(max_inst)}x "
                    "na política da instituição."
                ),
                requires_human_handoff=False,
            )
        return PolicyDecision(
            decision="ALLOWED",
            reason_code="WITHIN_APPROVED_INSTALLMENTS",
            explanation=f"Parcelamento em {req_i}x dentro do limite aprovado (até {int(max_inst)}x).",
            requires_human_handoff=False,
        )

    if act == "apply_discount":
        max_disc = rules.get("max_discount_pct")
        if max_disc is None or float(max_disc) <= 0:
            return PolicyDecision(
                decision="DENIED",
                reason_code="SILENT_RULE_DENIED",
                explanation="A política aprovada não prevê desconto automático via chat.",
                requires_human_handoff=True,
            )
        req_d = float(requested_discount_pct or 0.0)
        if req_d <= 0 or req_d > float(max_disc):
            return PolicyDecision(
                decision="DENIED",
                reason_code="EXCEEDS_MAX_DISCOUNT",
                explanation=(
                    f"Desconto solicitado de {req_d:.1f}% excede o limite aprovado de {float(max_disc):.1f}%."
                ),
                requires_human_handoff=False,
            )
        return PolicyDecision(
            decision="ALLOWED",
            reason_code="WITHIN_APPROVED_DISCOUNT",
            explanation=f"Desconto de {req_d:.1f}% dentro do limite aprovado ({float(max_disc):.1f}%).",
            requires_human_handoff=False,
        )

    if act == "extend_due_date":
        max_ext = rules.get("max_extension_days")
        if not max_ext or int(max_ext) <= 0:
            return PolicyDecision(
                decision="DENIED",
                reason_code="SILENT_RULE_DENIED",
                explanation="A política aprovada não autoriza prorrogação automática de vencimento.",
                requires_human_handoff=True,
            )
        req_e = int(requested_extension_days or 0)
        if req_e <= 0 or req_e > int(max_ext):
            return PolicyDecision(
                decision="DENIED",
                reason_code="EXCEEDS_MAX_EXTENSION_DAYS",
                explanation=(
                    f"Prorrogação de {req_e} dias excede o máximo aprovado de {int(max_ext)} dias."
                ),
                requires_human_handoff=False,
            )
        return PolicyDecision(
            decision="ALLOWED",
            reason_code="WITHIN_APPROVED_EXTENSION",
            explanation=f"Prorrogação de {req_e} dias dentro do limite aprovado (até {int(max_ext)} dias).",
            requires_human_handoff=False,
        )

    return PolicyDecision(
        decision="DENIED",
        reason_code="UNSUPPORTED_POLICY_ACTION",
        explanation="Ação não reconhecida pelo motor determinístico de políticas.",
        requires_human_handoff=True,
    )


def parse_approved_rules_json(raw_json: Optional[str]) -> Dict[str, Any]:
    if not raw_json:
        return {}
    try:
        data = json.loads(raw_json)
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}
