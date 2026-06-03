import json
import logging
import urllib.request
import urllib.error
from typing import Dict, Any, Tuple
from imortal.ir import get_default_ir, validate_ir
from imortal.config import (
    OLLAMA_URL, DEFAULT_MODEL, OLLAMA_TIMEOUT,
    GEMINI_API_KEY, GEMINI_MODEL, PRODUCTION_MODE,
)

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Você é o compilador de IA do Projeto IMORTAL.
Sua única tarefa é receber a intenção em linguagem natural do usuário e traduzi-la para uma Representação Intermediária (IR) estrita em formato JSON.
A IR DEVE conter exatamente a seguinte estrutura:
{
  "project": "<nome>",
  "target": "atmega328p",
  "clock_hz": 16000000,
  "declarations": [
    {"name": "<var_name>", "type": "const_int"|"int"|"bool"|"array", "value": <int_val>, "initial_value": <int_val>, "min_val": <min>, "max_val": <max>, "size": <array_size>}
  ],
  "setup": [
    {"op": "pin_mode", "pin": <pin_expr>, "mode": "INPUT"|"OUTPUT"|"INPUT_PULLUP"}
  ],
  "loop": [
    {"op": "digital_write", "pin": <pin_expr>, "value": "HIGH"|"LOW"|<expr>},
    {"op": "analog_read", "pin": <pin_expr>, "variable": "<var>"},
    {"op": "digital_read", "pin": <pin_expr>, "variable": "<var>"},
    {"op": "delay_ms", "value": <expr>},
    {"op": "assign", "variable": "<var>", "value": <expr>, "index": <optional_idx_expr>},
    {"op": "serial_print", "value": <expr>},
    {"op": "if", "condition": <expr>, "then": [<instructions>], "else": [<instructions>]}
  ],
  "assertions": [
    {"type": "bounds", "variable": "<var>", "min": <int>, "max": <int>}
  ]
}

Regras:
1. Retorne APENAS o JSON puro. Não adicione markdown (como ```json) ou qualquer outro texto explicativo.
2. Certifique-se de que variáveis usadas em expressões estejam devidamente declaradas.
3. No target 'atmega328p', pinos válidos são de 0 a 19.
4. Garanta a segurança do código gerando asserções (assertions) para os limites de variáveis.
"""

def generate_mock_ir(prompt: str) -> Dict[str, Any]:
    """
    Gerador inteligente de Mocks em caso de Ollama offline ou prompts de testes específicos.
    """
    p = prompt.lower()
    
    # 1. Caso de Teste: Pino Inválido (Provoca Falha Formal Z3)
    if "pino invalido" in p or "pino inválido" in p or "pino 25" in p:
        return {
            "project": "TestePinoInvalido",
            "target": "atmega328p",
            "clock_hz": 16000000,
            "declarations": [
                {"name": "LED_PIN", "type": "const_int", "value": 25} # PINO 25 é inválido no Uno (limite 19)
            ],
            "setup": [
                {"op": "pin_mode", "pin": "LED_PIN", "mode": "OUTPUT"}
            ],
            "loop": [
                {"op": "digital_write", "pin": "LED_PIN", "value": "HIGH"},
                {"op": "delay_ms", "value": 1000}
            ],
            "assertions": []
        }
        
    # 2. Caso de Teste: Delay Perigoso / Watchdog Lockup (Provoca Falha Formal Z3)
    if "delay longo" in p or "delay infinito" in p or "travar watchdog" in p:
        return {
            "project": "TesteDelayLongo",
            "target": "atmega328p",
            "clock_hz": 16000000,
            "declarations": [
                {"name": "LED_PIN", "type": "const_int", "value": 13},
                {"name": "delay_perigoso", "type": "int", "initial_value": 5000000, "min_val": 100, "max_val": 10000000}
            ],
            "setup": [
                {"op": "pin_mode", "pin": "LED_PIN", "mode": "OUTPUT"}
            ],
            "loop": [
                {"op": "digital_write", "pin": "LED_PIN", "value": "HIGH"},
                {"op": "delay_ms", "value": "delay_perigoso"} # Estoura o limite físico de max_delay_ms (1 hora)
            ],
            "assertions": [
                {"type": "bounds", "variable": "delay_perigoso", "min": 0, "max": 10000000}
            ]
        }
        
    # 3. Caso de Teste: Divisão por Zero (Provoca Falha Formal Z3)
    if "divisao por zero" in p or "divisão por zero" in p:
        return {
            "project": "TesteDivisaoZero",
            "target": "atmega328p",
            "clock_hz": 16000000,
            "declarations": [
                {"name": "sensor_val", "type": "int", "initial_value": 0, "min_val": 0, "max_val": 10},
                {"name": "resultado", "type": "int", "initial_value": 1}
            ],
            "setup": [],
            "loop": [
                {
                    "op": "assign",
                    "variable": "resultado",
                    "value": {
                        "op": "/",
                        "left": 100,
                        "right": "sensor_val" # sensor_val inicializa em 0 ou pode ser 0, gerando divisão por zero!
                    }
                }
            ],
            "assertions": []
        }
        
    # 4. Caso de Teste: Buffer Overflow / Estouro de Array (Provoca Falha Formal Z3)
    if "buffer overflow" in p or "estouro de array" in p or "estouro de vetor" in p:
        return {
            "project": "TesteBufferOverflow",
            "target": "atmega328p",
            "clock_hz": 16000000,
            "declarations": [
                {"name": "buffer", "type": "array", "size": 5, "min_val": 0, "max_val": 100},
                {"name": "index", "type": "int", "initial_value": 5, "min_val": 0, "max_val": 10} # index inicial é 5, estoura array tamanho 5 (0 a 4)
            ],
            "setup": [],
            "loop": [
                {
                    "op": "assign",
                    "variable": "buffer",
                    "index": "index",
                    "value": 99
                }
            ],
            "assertions": []
        }

    # 5. Caso de Uso Comum: Ler Sensor e Acender LED Condicionalmente (Blink Inteligente)
    if "sensor" in p or "luz" in p or "analogico" in p:
        return get_default_ir()

    # 6. Caso de Uso Comum: Apenas ler pino e printar na serial
    if "leia" in p or "leitura" in p or "print" in p or "serial" in p:
        return {
            "project": "LeitorSerial",
            "target": "atmega328p",
            "clock_hz": 16000000,
            "declarations": [
                {"name": "BOTAO_PIN", "type": "const_int", "value": 2},
                {"name": "estado_botao", "type": "int", "initial_value": 0}
            ],
            "setup": [
                {"op": "pin_mode", "pin": "BOTAO_PIN", "mode": "INPUT_PULLUP"}
            ],
            "loop": [
                {"op": "digital_read", "pin": "BOTAO_PIN", "variable": "estado_botao"},
                {"op": "serial_print", "value": "estado_botao"},
                {"op": "delay_ms", "value": 250}
            ],
            "assertions": []
        }

    # 7. Caso de Uso Padrão (Happy Path): Piscar LED da Porta 13
    return {
        "project": "BlinkSimples",
        "target": "atmega328p",
        "clock_hz": 16000000,
        "declarations": [
            {"name": "LED_PIN", "type": "const_int", "value": 13}
        ],
        "setup": [
            {"op": "pin_mode", "pin": "LED_PIN", "mode": "OUTPUT"}
        ],
        "loop": [
            {"op": "digital_write", "pin": "LED_PIN", "value": "HIGH"},
            {"op": "delay_ms", "value": 1000},
            {"op": "digital_write", "pin": "LED_PIN", "value": "LOW"},
            {"op": "delay_ms", "value": 1000}
        ],
        "assertions": []
    }


def _extract_json_from_text(text: str) -> str:
    """Remove markdown ```json ... ``` e extrai apenas o JSON."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        lines = lines[1:] if lines[0].startswith("```") else lines
        lines = lines[:-1] if lines and lines[-1].startswith("```") else lines
        text = "\n".join(lines).strip()
    start, end = text.find("{"), text.rfind("}") + 1
    return text[start:end] if start != -1 and end > start else text


def _try_parse_ir(text: str) -> tuple:
    """Tenta parsear e validar a IR. Retorna (ir_dict, True) ou (None, False)."""
    try:
        ir_dict = json.loads(_extract_json_from_text(text))
        valid, errs = validate_ir(ir_dict)
        if valid:
            return ir_dict, True
        logger.warning("[AI Engine] IR invalida estruturalmente: %s", errs)
    except json.JSONDecodeError as e:
        logger.warning("[AI Engine] JSON invalido na resposta: %s", e)
    return None, False

async def _call_gemini(prompt: str) -> "str | None":
    """Chama a Google Gemini API via REST. Retorna texto ou None."""
    if not GEMINI_API_KEY:
        return None
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
    )
    body = {
        "contents": [{"parts": [{"text": f"{SYSTEM_PROMPT}\n\nIntencao Humana: {prompt}"}]}],
        "generationConfig": {"temperature": 0.1, "maxOutputTokens": 2048},
    }
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            return result["candidates"][0]["content"]["parts"][0]["text"]
    except Exception as e:
        logger.warning("[AI Engine] Gemini API falhou: %s: %s", type(e).__name__, e)
        return None


async def _call_ollama(prompt: str, model_name: str) -> "str | None":
    """Chama o Ollama local. Retorna texto ou None."""
    payload = {"model": model_name, "prompt": f"{SYSTEM_PROMPT}\n\nIntencao Humana: {prompt}", "stream": False}
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(OLLAMA_URL, data=data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=OLLAMA_TIMEOUT) as resp:
            return json.loads(resp.read().decode("utf-8")).get("response", "").strip()
    except urllib.error.URLError as e:
        logger.warning("[AI Engine] Ollama inacessivel: %s", e.reason)
    except Exception as e:
        logger.warning("[AI Engine] Ollama erro: %s: %s", type(e).__name__, e)
    return None


async def generate_ir_from_intent(
    prompt: str,
    model_name: str = DEFAULT_MODEL
) -> Tuple[Dict[str, Any], bool]:
    """
    Gera IR a partir de intencao em linguagem natural.
    Prioridade: Gemini API (prod) -> Ollama (dev) -> Mock (fallback).
    Retorna (ir_dict, is_mock).
    """
    if GEMINI_API_KEY:
        text = await _call_gemini(prompt)
        if text:
            ir_dict, ok = _try_parse_ir(text)
            if ok:
                return ir_dict, False

    if not PRODUCTION_MODE:
        text = await _call_ollama(prompt, model_name)
        if text:
            ir_dict, ok = _try_parse_ir(text)
            if ok:
                return ir_dict, False

    logger.info("[AI Engine] Usando mock IR para: %.60s", prompt)
    return generate_mock_ir(prompt), True
