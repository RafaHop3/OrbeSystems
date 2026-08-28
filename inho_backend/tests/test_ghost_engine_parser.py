"""
INHO – Ghost Engine E2E Pytest Suite
Determinism & Anti-Hallucination Golden Test Set Verification
"""
import os
import pytest
from services.ghost_engine import parse_dpo_email_response

GOLDEN_DIR = os.path.join(os.path.dirname(__file__), "golden_responses")

TEST_CASES = [
    ("pos_deleted.txt", "DELETED", 0.90),
    ("neg_docs_needed.txt", "PENDING_DOCS", 0.90),
    ("ambiguous.txt", "MANUAL_REQUIRED", 0.0), # Confidence < 0.90 safety fallback
]


@pytest.mark.parametrize("filename, expected_status, min_confidence", TEST_CASES)
def test_ghost_engine_parser_determinism(filename, expected_status, min_confidence):
    filepath = os.path.join(GOLDEN_DIR, filename)
    assert os.path.exists(filepath), f"Arquivo de gabarito nao encontrado: {filepath}"

    with open(filepath, "r", encoding="utf-8") as f:
        email_body = f.read()

    result = parse_dpo_email_response(email_body)

    assert result["detected_status"] == expected_status, (
        f"Falha de determinismo em {filename}! "
        f"Esperado: {expected_status}, Obtido: {result['detected_status']} | Justificativa: {result['reasoning']}"
    )

    if expected_status != "MANUAL_REQUIRED" or result["confidence"] >= 0.90:
        assert result["confidence"] >= min_confidence, (
            f"Score de confianca insuficiente em {filename}: {result['confidence']:.2f} < {min_confidence}"
        )


def test_confidence_threshold_safety_fallback():
    """
    Testa a Regra de Sênior: Qualquer classificação com confiança < 0.90 DEVE sofrer fallback para MANUAL_REQUIRED.
    """
    ambiguous_body = "Olá, recebemos sua mensagem e a demanda está sob análise do nosso time."
    result = parse_dpo_email_response(ambiguous_body)

    assert result["confidence"] < 0.90, "Mensagem ambígua deve possuir score de confiança < 0.90"
    assert result["detected_status"] == "MANUAL_REQUIRED", (
        "Regra de Sênior violada: Resposta com confiança < 0.90 DEVE ser forçada para MANUAL_REQUIRED"
    )
