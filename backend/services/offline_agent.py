"""
offline_agent.py — Orbe Systems Proactive Offline Agent Engine
═══════════════════════════════════════════════════════════════
Processes natural language user requests in a background thread, pro-actively
triggering the appropriate technical engines (Z3 proving, compilation, security audits)
offline, saving the results, and ensuring the interface remains fast and zero-latency.

Utilizes the 'instructor' library for structured output mapping when available.
"""

import json
import os
import queue
import logging
import threading
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime
import uuid

# Import system dependencies
from imortal.config import GEMINI_API_KEY, GEMINI_MODEL, PRODUCTION_MODE, OLLAMA_HIGH_LEVEL_MODEL
from imortal.ai import generate_ir_from_intent
from imortal.prover import FormalVerifier
from imortal.sandbox import SandboxFuzzer
from imortal.compiler import CodeCompiler
from routes.suite_inteligente import SmartDocumentGenerator, StructureConverter, LZWEngine
from routes.powershell_bot import (
    analyze_powershell_script,
    generate_mock_powershell_response,
    ScriptAnalysisRequest
)

logger = logging.getLogger("offline_agent")

# Pydantic models for structured intent classification
from pydantic import BaseModel, Field
try:
    import instructor
    import google.generativeai as genai
    from google.generativeai import types
    INSTRUCTOR_AVAILABLE = True
except ImportError:
    INSTRUCTOR_AVAILABLE = False
    logger.warning("[OfflineAgent] instructor or google-generativeai not fully installed yet. Falling back to manual JSON parsing.")

class OfflineTaskIntent(BaseModel):
    action: str = Field(
        description="A ação técnica a ser realizada offline: 'compile_avr', 'security_audit', 'generate_document', 'compress_data', 'convert_data', 'chat_respond'."
    )
    parameters: dict = Field(
        default_factory=dict,
        description="Parâmetros extraídos da intenção do usuário para alimentar a ferramenta selecionada."
    )
    explanation: str = Field(
        description="Breve justificativa em português sobre por que esta ação de background está sendo disparada proativamente."
    )

# ── Local Persistent Registry for Background Jobs ───────────────────────────
JOBS_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "offline_jobs.json")

def _init_jobs_file():
    os.makedirs(os.path.dirname(JOBS_FILE), exist_ok=True)
    if not os.path.exists(JOBS_FILE):
        with open(JOBS_FILE, "w", encoding="utf-8") as f:
            json.dump({}, f, indent=2)

def _load_jobs() -> Dict[str, Any]:
    _init_jobs_file()
    try:
        with open(JOBS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"[OfflineAgent] Falha ao carregar jobs persistentes: {e}")
        return {}

def _save_job(job_id: str, job_data: Dict[str, Any]):
    jobs = _load_jobs()
    jobs[job_id] = job_data
    try:
        with open(JOBS_FILE, "w", encoding="utf-8") as f:
            json.dump(jobs, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logger.error(f"[OfflineAgent] Falha ao salvar job {job_id}: {e}")

# ── Thread-Safe Background Queue ──────────────────────────────────────────────
task_queue = queue.Queue()
_loop = None
_thread = None

# System prompt for proactive planning
AGENT_PLANNER_SYSTEM_PROMPT = """Você é o OrbeOfflinePlanner, o cérebro proativo do ecossistema Orbe Systems.
Sua missão é escutar o prompt do usuário em dialeto humano comum e planejar qual tarefa técnica deve rodar OFFLINE em background.
Classifique a intenção do usuário em um dos seguintes tipos de ação:

1. 'compile_avr': Se o usuário quer gerar firmware para Arduino, piscar LED, ler sensores físicos, compilar código C++, etc.
   - Parâmetros esperados: {"prompt": "<prompt refinado em inglês/português para o compilador IMORTAL>"}
2. 'security_audit': Se o usuário colou um script PowerShell, mencionou vulnerabilidades, comandos perigosos, ou deseja realizar uma análise estática (SAST) em scripts.
   - Parâmetros esperados: {"script_content": "<conteúdo do script para auditar>"}
3. 'generate_document': Se o usuário quer criar relatórios de auditoria, conformidade RLS, contratos ou termos de documentação.
   - Parâmetros esperados: {"company_name": "<empresa>", "auditor_name": "<auditor>", "vulnerabilities": [<vulnerabilidades se houver>]}
4. 'compress_data': Se o usuário quer compactar strings longas, payloads ou otimizar memória de texto.
   - Parâmetros esperados: {"content": "<texto para comprimir>"}
5. 'convert_data': Se o usuário quer fazer conversões estruturadas como CSV para JSON, JSON para CSV ou Markdown para HTML.
   - Parâmetros esperados: {"mode": "json2csv"|"csv2json"|"md2html", "content": "<conteúdo para converter>"}
6. 'chat_respond': Se for uma conversa comum, dúvida, bate-papo de PowerShell ou caso nenhuma das opções anteriores se aplique diretamente.
   - Parâmetros esperados: {"prompt": "<pergunta do usuário>"}

Retorne a resposta estritamente conforme o modelo estruturado.
"""

async def classify_intent_with_llm(user_prompt: str) -> OfflineTaskIntent:
    """Classifica a intenção do usuário usando Gemini (instructor se disponível) ou fallback local."""
    if INSTRUCTOR_AVAILABLE and GEMINI_API_KEY:
        try:
            # Configura o client do instructor com a API do Gemini
            genai.configure(api_key=GEMINI_API_KEY)
            client = instructor.from_gemini(
                client=genai.GenerativeModel(model_name=GEMINI_MODEL),
                mode=instructor.Mode.GEMINI_JSON,
            )
            
            resp = client.chat.completions.create(
                messages=[
                    {"role": "system", "content": AGENT_PLANNER_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt}
                ],
                response_model=OfflineTaskIntent,
                temperature=0.1
            )
            return resp
        except Exception as e:
            logger.error(f"[OfflineAgent] Erro na classificação estruturada via Gemini: {e}. Usando fallback...")
            
    # Fallback Manual de parsing de JSON usando urllib
    import urllib.request
    from imortal.config import OLLAMA_URL
    
    # Tentativa manual de chamar o Gemini por REST
    if GEMINI_API_KEY:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
            body = {
                "system_instruction": {"parts": [{"text": AGENT_PLANNER_SYSTEM_PROMPT + "\nRetorne APENAS o JSON puro sem markdown fences."}]},
                "contents": [{"parts": [{"text": user_prompt}]}],
                "generationConfig": {"temperature": 0.1, "responseMimeType": "application/json"},
            }
            data_bytes = json.dumps(body).encode("utf-8")
            req = urllib.request.Request(url, data=data_bytes, headers={"Content-Type": "application/json"}, method="POST")
            
            def perform_request():
                with urllib.request.urlopen(req, timeout=15) as resp:
                    return resp.read().decode("utf-8")
                    
            res_str = await asyncio.to_thread(perform_request)
            res_json = json.loads(res_str)
            text_response = res_json["candidates"][0]["content"]["parts"][0]["text"].strip()
            
            # Limpa markdown fences se existirem
            if text_response.startswith("```"):
                lines = text_response.split("\n")
                lines = lines[1:] if lines[0].startswith("```") else lines
                lines = lines[:-1] if lines and lines[-1].startswith("```") else lines
                text_response = "\n".join(lines).strip()
                
            obj = json.loads(text_response)
            return OfflineTaskIntent(
                action=obj.get("action", "chat_respond"),
                parameters=obj.get("parameters", {}),
                explanation=obj.get("explanation", "Processado de forma resiliente por fallback.")
            )
        except Exception as ex:
            logger.error(f"[OfflineAgent] Fallback Gemini manual falhou: {ex}")

    # Fallback heurístico inteligente sem LLM (100% Offline)
    p = user_prompt.lower()
    if any(x in p for x in ["led", "blinker", "arduino", "pino", "avr", "firmware", "compila"]):
        return OfflineTaskIntent(
            action="compile_avr",
            parameters={"prompt": user_prompt},
            explanation="O usuário mencionou hardware físico ou termos relacionados a microcontroladores. Disparando compilação e prova formal Z3."
        )
    elif any(x in p for x in ["powershell", "ps1", "script", "bypass", "segurança", "vulnerabilidade"]):
        return OfflineTaskIntent(
            action="security_audit",
            parameters={"script_content": user_prompt},
            explanation="O usuário mencionou automação em lote, scripts ou segurança operacional Windows."
        )
    elif any(x in p for x in ["relatório", "contrato", "documento", "auditoria", "laudo"]):
        return OfflineTaskIntent(
            action="generate_document",
            parameters={"company_name": "Orbe Client", "auditor_name": "Proactive Offline Agent", "vulnerabilities": []},
            explanation="O usuário requisitou a elaboração de um relatório ou documento formal."
        )
    elif any(x in p for x in ["comprime", "compactar", "lzw", "reduzir"]):
        return OfflineTaskIntent(
            action="compress_data",
            parameters={"content": user_prompt},
            explanation="O usuário solicitou otimização ou compactação de payload de texto."
        )
    
    return OfflineTaskIntent(
        action="chat_respond",
        parameters={"prompt": user_prompt},
        explanation="Conversação normal de suporte técnico e consultoria interativa."
    )

# ── Execution Core (Background Worker) ───────────────────────────────────────

async def execute_task_offline(job_id: str, action: str, params: dict):
    """Executa a ação técnica em background offline e salva o resultado no repositório de jobs."""
    logger.info(f"[OfflineAgent] Iniciando execução offline de {action} para o Job ID: {job_id}")
    
    job_data = {
        "job_id": job_id,
        "action": action,
        "params": params,
        "status": "running",
        "started_at": datetime.utcnow().isoformat(),
        "completed_at": None,
        "result": None,
        "error": None
    }
    _save_job(job_id, job_data)

    try:
        if action == "compile_avr":
            prompt = params.get("prompt", "BlinkSimples")
            # 1. Geração de IR
            ir_dict, is_mock = await generate_ir_from_intent(prompt)
            
            # 2. Prova formal Z3
            def run_z3():
                verifier = FormalVerifier(ir_dict)
                return verifier.verify()
            z3_success, z3_errors = await asyncio.to_thread(run_z3)
            
            # 3. Fuzzing estocástico
            def run_fuzz():
                fuzzer = SandboxFuzzer(ir_dict)
                return fuzzer.fuzz(num_runs=150, loop_iterations=12)
            fuzz_success, fuzz_errors = await asyncio.to_thread(run_fuzz)
            
            # 4. Compilação
            def run_compile():
                compiler = CodeCompiler(ir_dict)
                cpp = compiler.to_cpp()
                hex_code, is_mock_compile, log = compiler.compile()
                return cpp, hex_code, is_mock_compile, log
            cpp, hex_code, is_mock_compile, log = await asyncio.to_thread(run_compile)
            
            job_data["result"] = {
                "ir": ir_dict,
                "z3_verified": z3_success,
                "z3_errors": z3_errors,
                "fuzz_verified": fuzz_success,
                "fuzz_errors": fuzz_errors,
                "cpp_code": cpp,
                "hex_code": hex_code,
                "is_mock_compilation": is_mock_compile,
                "compilation_log": log
            }
            job_data["status"] = "success"
            
        elif action == "security_audit":
            script = params.get("script_content", "")
            # Executa a análise estática nativa do powershell_bot
            audit_result = await analyze_powershell_script(
                ScriptAnalysisRequest(script_content=script)
            )
            job_data["result"] = audit_result
            job_data["status"] = "success"
            
        elif action == "generate_document":
            co_name = params.get("company_name", "Orbe Client")
            auditor = params.get("auditor_name", "Proactive Offline Agent")
            vulns = params.get("vulnerabilities", [])
            
            report = SmartDocumentGenerator.generate_rls_report(co_name, auditor, vulns)
            job_data["result"] = {"document": report}
            job_data["status"] = "success"
            
        elif action == "compress_data":
            text_content = params.get("content", "")
            lzw = LZWEngine(max_dict_size=4096)
            tokens, telemetry = lzw.compress(text_content)
            job_data["result"] = {
                "compressed_tokens": tokens,
                "telemetry": telemetry
            }
            job_data["status"] = "success"
            
        elif action == "convert_data":
            mode = params.get("mode", "json2csv")
            content = params.get("content", "")
            if mode == "json2csv":
                res = StructureConverter.json_to_csv(content)
            elif mode == "csv2json":
                res = StructureConverter.csv_to_json(content)
            elif mode == "md2html":
                res = StructureConverter.md_to_html(content)
            else:
                raise ValueError(f"Modo de conversão inválido: {mode}")
            
            job_data["result"] = {"converted_content": res}
            job_data["status"] = "success"
            
        elif action == "chat_respond":
            prompt = params.get("prompt", "")
            # Utiliza o gerador de fallback ou chamada direta do powershell_bot
            response = generate_mock_powershell_response(prompt)
            job_data["result"] = {"response": response}
            job_data["status"] = "success"
            
        else:
            raise ValueError(f"Ação desconhecida para o motor offline: {action}")
            
    except Exception as e:
        logger.error(f"[OfflineAgent] Falha catastrófica ao processar job {job_id}: {e}", exc_info=True)
        job_data["status"] = "failed"
        job_data["error"] = str(e)
        
    job_data["completed_at"] = datetime.utcnow().isoformat()
    _save_job(job_id, job_data)
    logger.info(f"[OfflineAgent] Job {job_id} concluído com status: {job_data['status']}")

# ── Background Thread Loop Daemon ───────────────────────────────────────────

def _run_event_loop(loop: asyncio.AbstractEventLoop):
    asyncio.set_event_loop(loop)
    loop.run_forever()

def start_offline_agent():
    """Inicia o daemon do agente offline em background."""
    global _loop, _thread
    if _thread and _thread.is_alive():
        return
        
    _loop = asyncio.new_event_loop()
    _thread = threading.Thread(target=_run_event_loop, args=(_loop,), daemon=True, name="OrbeOfflineAgentDaemon")
    _thread.start()
    
    # Inicia a thread consumidora de filas
    def queue_worker():
        logger.info("[OfflineAgent] Daemon consumidor de filas iniciado com sucesso.")
        while True:
            try:
                # Bloqueia até receber um item na fila
                job_id, user_prompt = task_queue.get()
                
                # Executa a classificação de intenção
                logger.info(f"[OfflineAgent] Classificando intenção para: '{user_prompt[:50]}...'")
                intent = asyncio.run_coroutine_threadsafe(classify_intent_with_llm(user_prompt), _loop).result()
                
                logger.info(f"[OfflineAgent] Intenção classificada: {intent.action} | Raciocínio: {intent.explanation}")
                
                # Executa a tarefa técnica offline
                asyncio.run_coroutine_threadsafe(
                    execute_task_offline(job_id, intent.action, intent.parameters), 
                    _loop
                )
                
                task_queue.task_done()
            except Exception as e:
                logger.error(f"[OfflineAgent] Erro no laço consumidor da fila: {e}")
                
    worker_thread = threading.Thread(target=queue_worker, daemon=True, name="OrbeQueueWorker")
    worker_thread.start()
    logger.info("[OfflineAgent] Agente Proativo Offline de Background Inicializado [OK].")

def stop_offline_agent():
    """Para o daemon do agente offline."""
    global _loop
    if _loop and _loop.is_running():
        _loop.call_soon_threadsafe(_loop.stop)
        logger.info("[OfflineAgent] Agente Proativo Offline de Background Parado.")

def submit_proactive_prompt(user_prompt: str) -> str:
    """Submete um prompt de usuário para ser processado offline em background."""
    job_id = f"job-{uuid.uuid4().hex[:8]}"
    
    # Salva status inicial de pendente
    job_data = {
        "job_id": job_id,
        "user_prompt": user_prompt,
        "status": "pending",
        "started_at": datetime.utcnow().isoformat(),
        "completed_at": None,
        "result": None,
        "error": None
    }
    _save_job(job_id, job_data)
    
    task_queue.put((job_id, user_prompt))
    return job_id

def get_job_status(job_id: str) -> Optional[Dict[str, Any]]:
    """Consulta o status e o resultado de um job específico."""
    jobs = _load_jobs()
    return jobs.get(job_id)

def list_all_jobs() -> List[Dict[str, Any]]:
    """Retorna uma lista ordenada com todos os jobs do histórico."""
    jobs = _load_jobs()
    # Ordenar pelos iniciados mais recentes
    return sorted(jobs.values(), key=lambda x: x.get("started_at", ""), reverse=True)
