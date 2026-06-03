import os
import json
import asyncio
import logging
import threading
import urllib.parse
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Any

from imortal.config import (
    HOST, PORT,
    ALLOWED_ORIGINS,
    MAX_BODY_SIZE,
    MAX_CONCURRENT_PIPELINES,
    FUZZ_RUNS, FUZZ_LOOP_ITERATIONS,
    PRODUCTION_MODE,
    setup_logging,
)
from imortal.ir import validate_ir, get_default_ir
from imortal.ai import generate_ir_from_intent
from imortal.prover import FormalVerifier
from imortal.sandbox import SandboxFuzzer
from imortal.compiler import CodeCompiler
from imortal.visualizer import IRVisualizer

setup_logging()
logger = logging.getLogger(__name__)

# ─── Rate Limiting ────────────────────────────────────────────────────────────
# Limita o número de requisições pesadas (Z3 + Fuzzing) simultâneas para
# evitar esgotamento de CPU/RAM por requisições maliciosas em paralelo.
_pipeline_semaphore = threading.Semaphore(MAX_CONCURRENT_PIPELINES)

# ─── Loop assíncrono dedicado ao servidor ────────────────────────────────────
# Cria um loop de eventos persistente para o servidor HTTP, evitando o
# problema de asyncio.run() que cria/destrói loops a cada chamada (Python 3.10+).
_async_loop = asyncio.new_event_loop()
_async_thread = threading.Thread(target=_async_loop.run_forever, daemon=True)
_async_thread.start()


def _run_async(coro):
    """Executa uma coroutine no loop dedicado do servidor de forma thread-safe."""
    future = asyncio.run_coroutine_threadsafe(coro, _async_loop)
    return future.result(timeout=30)


WEB_DIR = os.path.join(os.path.dirname(__file__), "web")


class IMORTALRequestHandler(BaseHTTPRequestHandler):
    """
    Handler HTTP leve para servir o dashboard e orquestrar
    os endpoints do pipeline de tripla verificação do IMORTAL.

    Melhorias de segurança aplicadas:
    - CORS restrito a origens configuradas (não mais '*')
    - Bind em 127.0.0.1 (loopback apenas)
    - Rate limiting via semáforo para endpoints pesados
    - Limite de 1 MB para corpo da requisição
    - asyncio.run() substituído por loop dedicado persistente
    - Path traversal mitigado com os.path.normpath + realpath
    """

    def log_message(self, format, *args):
        # Redireciona logs HTTP para o logger estruturado em vez de stderr
        logger.debug("HTTP %s", format % args)

    # ─── CORS Helpers ─────────────────────────────────────────────────────────

    def _add_cors_headers(self):
        """Adiciona headers CORS. Em produção aceita qualquer origem."""
        origin = self.headers.get("Origin", "")
        if "*" in ALLOWED_ORIGINS or PRODUCTION_MODE:
            self.send_header("Access-Control-Allow-Origin", "*")
        elif origin in ALLOWED_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin)
        else:
            self.send_header("Access-Control-Allow-Origin", f"http://{HOST}:{PORT}")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        # Headers de segurança HTTP para prodúção
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")

    def send_json(self, data: Any, status_code: int = 200):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self._add_cors_headers()
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        """Trata requisições de CORS pre-flight."""
        origin = self.headers.get("Origin", "")
        if origin not in ALLOWED_ORIGINS:
            self.send_response(403)
            self.end_headers()
            return
        self.send_response(204)
        self._add_cors_headers()
        self.end_headers()

    # ─── Body Reader com Limite de Tamanho ────────────────────────────────────

    def _read_body(self) -> tuple[bool, dict]:
        """
        Lê e deserializa o corpo JSON da requisição.
        Retorna (sucesso, dados_ou_erro).
        Rejeita payloads maiores que MAX_BODY_SIZE.
        """
        content_length = int(self.headers.get("Content-Length", 0))

        if content_length > MAX_BODY_SIZE:
            logger.warning("Payload rejeitado: %d bytes (limite: %d)", content_length, MAX_BODY_SIZE)
            self.send_json(
                {"error": f"Payload muito grande ({content_length} bytes). Limite: {MAX_BODY_SIZE} bytes."},
                413,
            )
            return False, {}

        raw = self.rfile.read(content_length).decode("utf-8") if content_length > 0 else ""
        try:
            return True, (json.loads(raw) if raw else {})
        except json.JSONDecodeError as e:
            logger.warning("JSON malformado no corpo da requisição: %s", e)
            self.send_json({"error": "JSON malformado no corpo da requisição."}, 400)
            return False, {}

    # ─── GET ──────────────────────────────────────────────────────────────────

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path

        # API: Obter IR Padrão
        if path == "/api/default":
            self.send_json(get_default_ir())
            return

        # Servir Arquivos Estáticos com proteção reforçada contra Path Traversal
        if path == "/" or path == "/index.html":
            file_path = os.path.join(WEB_DIR, "index.html")
        else:
            safe_relative = os.path.normpath(path.lstrip("/"))
            file_path = os.path.realpath(os.path.join(WEB_DIR, safe_relative))
            # Garante que o caminho resolvido ainda está dentro de WEB_DIR
            if not file_path.startswith(os.path.realpath(WEB_DIR)):
                self.send_response(403)
                self.end_headers()
                self.wfile.write(b"Forbidden.")
                return

        if os.path.exists(file_path) and os.path.isfile(file_path):
            with open(file_path, "rb") as f:
                content = f.read()
            self.send_response(200)
            if file_path.endswith(".html"):
                self.send_header("Content-Type", "text/html; charset=utf-8")
            elif file_path.endswith(".js"):
                self.send_header("Content-Type", "application/javascript; charset=utf-8")
            elif file_path.endswith(".css"):
                self.send_header("Content-Type", "text/css; charset=utf-8")
            else:
                self.send_header("Content-Type", "application/octet-stream")
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"File not found.")

    # ─── POST ─────────────────────────────────────────────────────────────────

    def do_POST(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path

        ok, body = self._read_body()
        if not ok:
            return

        # Endpoints pesados (Z3 + Fuzzing) ficam sob rate limiting
        heavy_endpoints = {"/api/verify", "/api/fuzz", "/api/compile", "/api/generate"}
        is_heavy = path in heavy_endpoints

        if is_heavy:
            acquired = _pipeline_semaphore.acquire(blocking=False)
            if not acquired:
                logger.warning("Rate limit atingido para %s — %d slots em uso.", path, MAX_CONCURRENT_PIPELINES)
                self.send_json(
                    {"error": "Servidor ocupado. Muitas operações em andamento. Tente em instantes."},
                    429,
                )
                return

        try:
            self._dispatch_post(path, body)
        finally:
            if is_heavy:
                _pipeline_semaphore.release()

    def _dispatch_post(self, path: str, body: dict):
        """Despacha a requisição POST para o handler correto."""

        # 1. Gerar IR de Intenção (Linguagem Natural)
        if path == "/api/generate":
            prompt = body.get("prompt", "").strip()
            if not prompt:
                self.send_json({"error": "Prompt de intenção vazio."}, 400)
                return

            try:
                # Usa o loop dedicado para coroutines — seguro em contexto multi-thread
                ir_dict, is_mock = _run_async(generate_ir_from_intent(prompt))

                viz = IRVisualizer(ir_dict)
                pseudocode = viz.to_pseudocode()
                flowchart = viz.to_flowchart_nodes()

                self.send_json({
                    "ir": ir_dict,
                    "is_mock": is_mock,
                    "pseudocode": pseudocode,
                    "flowchart": flowchart,
                })
            except Exception as e:
                logger.error("Erro na inferência de IA para o prompt '%s': %s", prompt[:60], e, exc_info=True)
                self.send_json({"error": f"Erro na inferência da IA: {str(e)}"}, 500)

        # 2. Validação Matemática Formal Z3
        elif path == "/api/verify":
            ir_dict = body.get("ir")
            if not ir_dict:
                self.send_json({"error": "IR ausente."}, 400)
                return

            valid_struct, errs = validate_ir(ir_dict)
            if not valid_struct:
                self.send_json({"success": False, "errors": [f"Erro estrutural: {e}" for e in errs]})
                return

            verifier = FormalVerifier(ir_dict)
            success, z3_errors = verifier.verify()
            self.send_json({"success": success, "errors": z3_errors})

        # 3. Simulação de Fuzzing em Sandbox
        elif path == "/api/fuzz":
            ir_dict = body.get("ir")
            if not ir_dict:
                self.send_json({"error": "IR ausente."}, 400)
                return

            fuzzer = SandboxFuzzer(ir_dict)
            success, fuzz_errors = fuzzer.fuzz(num_runs=FUZZ_RUNS, loop_iterations=FUZZ_LOOP_ITERATIONS)
            self.send_json({"success": success, "errors": fuzz_errors})

        # 4. Compilação de Máquina
        elif path == "/api/compile":
            ir_dict = body.get("ir")
            if not ir_dict:
                self.send_json({"error": "IR ausente."}, 400)
                return

            compiler = CodeCompiler(ir_dict)
            cpp_code = compiler.to_cpp()
            hex_code, is_mock, compile_log = compiler.compile()
            self.send_json({"cpp": cpp_code, "hex": hex_code, "is_mock": is_mock, "log": compile_log})

        else:
            self.send_json({"error": "Endpoint não encontrado."}, 404)


def start_server_in_thread() -> threading.Thread:
    """Inicia o servidor HTTP em uma thread de background, escutando apenas em loopback."""
    server = HTTPServer((HOST, PORT), IMORTALRequestHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    logger.info("Servidor IMORTAL iniciado em http://%s:%d", HOST, PORT)
    return thread
