import logging
import asyncio
import urllib.request
import json
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Dict, Any

from security.auth import require_premium
from models.users import User

from imortal.ir import validate_ir, get_default_ir
from imortal.ai import generate_ir_from_intent
from imortal.prover import FormalVerifier
from imortal.sandbox import SandboxFuzzer
from imortal.compiler import CodeCompiler
from imortal.visualizer import IRVisualizer
from imortal.config import FUZZ_RUNS, FUZZ_LOOP_ITERATIONS

router = APIRouter(prefix="/imortal", tags=["imortal"])
logger = logging.getLogger(__name__)

# ── Prompts do Sistema ────────────────────────────────────────────────────────
CYBER_SYSTEM_PROMPT = """You are IMORTAL CyberSec, an elite cybersecurity threat intelligence AI by Orbe Systems.
Respond ONLY in Portuguese. Return ONLY a valid JSON object. NO markdown, NO code fences, NO text outside JSON.

JSON schema (follow EXACTLY):
{
  "threat_score": <integer 0-100>,
  "risk_level": "<CRITICAL|HIGH|MEDIUM|LOW>",
  "summary": "<executive summary 2-3 sentences>",
  "attack_vectors": [
    {"name":"<attack>","severity":"<CRITICAL|HIGH|MEDIUM|LOW>","description":"<impact>","likelihood":"<HIGH|MEDIUM|LOW>"}
  ],
  "owasp_mapping": [
    {"id":"A01:2021","name":"Broken Access Control","applicable":true,"risk":"explicacao"},
    {"id":"A02:2021","name":"Cryptographic Failures","applicable":true,"risk":"explicacao"},
    {"id":"A03:2021","name":"Injection","applicable":true,"risk":"explicacao"},
    {"id":"A04:2021","name":"Insecure Design","applicable":true,"risk":"explicacao"},
    {"id":"A05:2021","name":"Security Misconfiguration","applicable":true,"risk":"explicacao"},
    {"id":"A06:2021","name":"Vulnerable and Outdated Components","applicable":true,"risk":"explicacao"},
    {"id":"A07:2021","name":"Identification and Authentication Failures","applicable":true,"risk":"explicacao"},
    {"id":"A08:2021","name":"Software and Data Integrity Failures","applicable":true,"risk":"explicacao"},
    {"id":"A09:2021","name":"Security Logging and Monitoring Failures","applicable":true,"risk":"explicacao"},
    {"id":"A10:2021","name":"Server-Side Request Forgery","applicable":true,"risk":"explicacao"}
  ],
  "recommendations": [
    {"priority":"<CRITICAL|HIGH|MEDIUM|LOW>","action":"<specific step>","effort":"<LOW|MEDIUM|HIGH>"}
  ],
  "attack_surface_scores": {
    "network":5,"authentication":5,"input_validation":5,"configuration":5,
    "dependencies":5,"monitoring":5,"cryptography":5,"data_exposure":5
  }
}
RULES: Min 5 attack_vectors. ALL 10 OWASP (A01-A10). Min 6 recommendations sorted by priority DESC.
Make sure the applicable flag in owasp_mapping is a real boolean (true/false) and NOT a string."""

MARKETING_SYSTEM_PROMPT = """You are IMORTAL Marketing AI, an elite market intelligence system by Orbe Systems.
Respond ONLY in Portuguese. Return ONLY a valid JSON object. NO markdown, NO code fences, NO text outside JSON.

JSON schema:
{
  "market_segment": "<B2B SaaS|D2C|B2C|etc>",
  "summary": "<2-3 sentences strategic analysis>",
  "financial_metrics": {
    "cac":{"value":150.0,"currency":"BRL","explanation":"explicacao"},
    "ltv":{"value":600.0,"currency":"BRL","explanation":"explicacao"},
    "ltv_cac_ratio":4.0,
    "roi":{"value":300.0,"unit":"%","timeframe":"12 months"},
    "roas":{"value":4.5,"explanation":"explicacao"},
    "payback_months":4
  },
  "channels":[{"name":"Google Ads","percentage":40,"rationale":"explicacao"}],
  "growth_projection":[
    {"month":1,"revenue":5000.0,"customers":50},
    {"month":2,"revenue":6000.0,"customers":60},
    {"month":3,"revenue":7200.0,"customers":72},
    {"month":4,"revenue":8640.0,"customers":86},
    {"month":5,"revenue":10368.0,"customers":103},
    {"month":6,"revenue":12441.0,"customers":124},
    {"month":7,"revenue":14929.0,"customers":149},
    {"month":8,"revenue":17915.0,"customers":179},
    {"month":9,"revenue":21499.0,"customers":214},
    {"month":10,"revenue":25798.0,"customers":257},
    {"month":11,"revenue":30958.0,"customers":309},
    {"month":12,"revenue":37150.0,"customers":371}
  ],
  "insights":["insight1","insight2","insight3","insight4","insight5"]
}
RULES: channels must sum to 100. Exactly 12 growth_projection entries. Realistic BRL values."""

DEMOGRAPHIC_SYSTEM_PROMPT = """You are IMORTAL Demographic AI, an elite market demographics intelligence by Orbe Systems.
Respond ONLY in Portuguese. Return ONLY a valid JSON object. NO markdown, NO code fences, NO text outside JSON.

JSON schema:
{
  "market_summary": "<2-3 sentences>",
  "market_size": {
    "tam":{"value":100.0,"unit":"M","currency":"BRL","description":"explicacao"},
    "sam":{"value":20.0,"unit":"M","currency":"BRL","description":"explicacao"},
    "som":{"value":2.0,"unit":"M","currency":"BRL","description":"explicacao"}
  },
  "demographics": {
    "age_groups":[
      {"label":"18-24","percentage":20},
      {"label":"25-34","percentage":35},
      {"label":"35-44","percentage":25},
      {"label":"45-54","percentage":15},
      {"label":"55+","percentage":5}
    ],
    "income_groups":[
      {"label":"Classe E","percentage":10},
      {"label":"Classe D","percentage":20},
      {"label":"Classe C","percentage":40},
      {"label":"Classe B","percentage":20},
      {"label":"Classe A","percentage":10}
    ]
  },
  "online_offline_split":[
    {"channel":"Redes Sociais","online":90,"offline":10},
    {"channel":"Eventos","online":20,"offline":80},
    {"channel":"Parcerias","online":50,"offline":50},
    {"channel":"Busca Organica","online":100,"offline":0}
  ],
  "top_niches":[
    {"name":"nicho1","penetration":15,"growth_rate":"+12% YoY","description":"explicacao"}
  ],
  "behavior_patterns":["padrao1","padrao2","padrao3","padrao4"]
}
RULES: age_groups sum=100. income_groups sum=100. Each online+offline=100."""


class GenerateRequest(BaseModel):
    prompt: str

class IRRequest(BaseModel):
    ir: Dict[str, Any]

# ── Helper para Chamada Estruturada do Gemini ─────────────────────────────────
async def call_gemini_json(system_instruction: str, user_prompt: str) -> Dict[str, Any]:
    from imortal.config import GEMINI_API_KEY, GEMINI_MODEL
    
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="Chave de API do Gemini não configurada no backend.")
        
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
    )
    body = {
        "system_instruction": {"parts": [{"text": system_instruction}]},
        "contents": [{"parts": [{"text": user_prompt}]}],
        "generationConfig": {
            "temperature": 0.15,
            "maxOutputTokens": 4096,
            "responseMimeType": "application/json"
        },
    }
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")
    try:
        def perform_request():
            with urllib.request.urlopen(req, timeout=35) as resp:
                return resp.read().decode("utf-8")
        
        result_str = await asyncio.to_thread(perform_request)
        result_json = json.loads(result_str)
        text_response = result_json["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(text_response)
    except Exception as e:
        logger.error(f"Erro na chamada do Gemini: {e}")
        # Seguindo as diretrizes do SECURITY_PROTOCOL.md: Logar internamente e retornar mensagem genérica
        raise HTTPException(status_code=500, detail="Erro interno no serviço de Inteligência Artificial.")

# ── Endpoints de Análise de Negócio e Segurança ────────────────────────────────
@router.post("/cyber")
async def analyze_cyber(data: GenerateRequest, current_user: User = Depends(require_premium)):
    """Executa a análise de Cyber Intelligence de ameaças e OWASP."""
    prompt = data.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Descrição vazia.")
    return await call_gemini_json(CYBER_SYSTEM_PROMPT, prompt)

@router.post("/marketing")
async def analyze_marketing(data: GenerateRequest, current_user: User = Depends(require_premium)):
    """Executa a análise de Marketing Analytics com ROI, LTV e projeções."""
    prompt = data.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Descrição vazia.")
    return await call_gemini_json(MARKETING_SYSTEM_PROMPT, prompt)

@router.post("/demographic")
async def analyze_demographic(data: GenerateRequest, current_user: User = Depends(require_premium)):
    """Executa o mapeamento demográfico de nichos e TAM/SAM/SOM."""
    prompt = data.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Descrição vazia.")
    return await call_gemini_json(DEMOGRAPHIC_SYSTEM_PROMPT, prompt)

# ── Endpoints do Compilador AVR / Verificador Formal ───────────────────────────
@router.get("/default")
async def get_default(current_user: User = Depends(require_premium)):
    """Obtém a IR padrão do sistema."""
    return get_default_ir()

@router.post("/generate")
async def generate_ir(data: GenerateRequest, current_user: User = Depends(require_premium)):
    """Gera IR (JSON) a partir de intenção em linguagem natural."""
    prompt = data.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt de intenção vazio.")
    
    try:
        ir_dict, is_mock = await generate_ir_from_intent(prompt)
        
        viz = IRVisualizer(ir_dict)
        pseudocode = viz.to_pseudocode()
        flowchart = viz.to_flowchart_nodes()
        
        return {
            "ir": ir_dict,
            "is_mock": is_mock,
            "pseudocode": pseudocode,
            "flowchart": flowchart
        }
    except Exception as e:
        logger.error(f"Erro na geração de IR para o prompt '{prompt}': {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno ao gerar IR.")

@router.post("/verify")
async def verify_ir(data: IRRequest, current_user: User = Depends(require_premium)):
    """Valida a IR formalmente utilizando o Microsoft Z3 Prover."""
    ir_dict = data.ir
    valid_struct, errs = validate_ir(ir_dict)
    if not valid_struct:
        return {"success": False, "errors": [f"Erro estrutural: {e}" for e in errs]}
    
    try:
        def run_z3():
            verifier = FormalVerifier(ir_dict)
            return verifier.verify()
            
        success, z3_errors = await asyncio.to_thread(run_z3)
        return {"success": success, "errors": z3_errors}
    except Exception as e:
        logger.error(f"Erro na prova formal Z3: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro na execução do verificador formal.")

@router.post("/fuzz")
async def fuzz_ir(data: IRRequest, current_user: User = Depends(require_premium)):
    """Simula o hardware em Sandbox via fuzzing estocástico."""
    ir_dict = data.ir
    try:
        def run_fuzz():
            fuzzer = SandboxFuzzer(ir_dict)
            return fuzzer.fuzz(num_runs=FUZZ_RUNS, loop_iterations=FUZZ_LOOP_ITERATIONS)
            
        success, fuzz_errors = await asyncio.to_thread(run_fuzz)
        return {"success": success, "errors": fuzz_errors}
    except Exception as e:
        logger.error(f"Erro no fuzzing estocástico: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro na simulação em Sandbox.")

@router.post("/compile")
async def compile_ir(data: IRRequest, current_user: User = Depends(require_premium)):
    """Compila a IR em código C++ e Intel HEX (ATMega328P)."""
    ir_dict = data.ir
    try:
        compiler = CodeCompiler(ir_dict)
        cpp_code = compiler.to_cpp()
        
        def run_compile():
            return compiler.compile()
            
        hex_code, is_mock, compile_log = await asyncio.to_thread(run_compile)
        return {
            "cpp": cpp_code,
            "hex": hex_code,
            "is_mock": is_mock,
            "log": compile_log
        }
    except Exception as e:
        logger.error(f"Erro na compilação do código: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro ao compilar o código fonte.")
