# Dossiê Técnico de Propriedade Intelectual (e-Software INPI)
## Transpilador Formal AST → IR → SSA / SMT Z3 (IMORTAL) & OrbeJobs Zero-Key Cascade

**Titular / Requerente:** ORBE SYSTEMS LTDA  
**Data de Consolidação:** 18 de Novembro de 2026  
**Complemento à Minuta Patentária:** [`MINUTA_PATENTE_IMORTAL.md`](file:///D:/OrbeSystems/orbe-systems/documentos_legais/MINUTA_PATENTE_IMORTAL.md)  
**Manifesto Criptográfico SHA-256:** [`INPI_E_SOFTWARE_MANIFEST.json`](file:///D:/OrbeSystems/orbe-systems/documentos_legais/inpi/INPI_E_SOFTWARE_MANIFEST.json)

---

## 1. Resumo Criptográfico de Autoria (e-Software INPI)

O script determinístico [`scripts/generate_inpi_hashes.py`](file:///D:/OrbeSystems/orbe-systems/scripts/generate_inpi_hashes.py) gera os resumos digitais SHA-256 (normalização canônica LF) dos dois blocos tecnológicos protegidos:

- **Master Bundle SHA-256:** `8c78d8df2bf1f1203b1964e0aba6d09bfbe7c3197273d9b6bd6ac17fd30f6773`
- **Bloco 1 — Transpilador IMORTAL AST-SSA/Z3:** `5c71285d3eeae887b03f26471ce6771ba900bbb037e90b29fa6f1b76d75a9fe9`
- **Bloco 2 — OrbeJobs Zero-Key + IMORTAL Predictive Cascade:** `66798908e028b33f47fc46f0d4082af942bb823f75b2b3c11c521b39147499da`

*(Consulte [`INPI_E_SOFTWARE_HASHES.txt`](file:///D:/OrbeSystems/orbe-systems/documentos_legais/inpi/INPI_E_SOFTWARE_HASHES.txt) para a lista linha a linha de todos os arquivos-fonte e respectivos hashes SHA-256 individuais.)*

---

## 2. Arquitetura Técnica do Transpilador AST-SSA/Z3 (`backend/imortal/`)

1. **Camada de Intenção e Representação Intermediária Estrita (`imortal/ai.py`, `imortal/ir.py`):**
   - Tradução de linguagem natural para Representação Intermediária JSON tipada (`declarations`, `setup`, `loop`, `assertions`, `target: atmega328p`).
   - Validação sintática e estrutural via `validate_ir()` antes de qualquer etapa simbólica ou geração C++, garantindo limites de pinos (`0..19`), PWM (`3, 5, 6, 9, 10, 11`), RAM (`2048` bytes) e `max_delay_ms = 3600000`.
2. **Motor de Transformação SSA e Prova Formal SMT Z3 (`imortal/prover.py` — `FormalVerifier`):**
   - Conversão das variáveis e atribuições da IR em forma **Single Static Assignment (`SSA`)** via `fresh_var()` / `get_var()`.
   - Modelagem simbólica de hardware no solver SMT **Microsoft Z3** (`Int`, `And`, `Or`, `If`), com *timeout* global configurável (`Z3_TIMEOUT_MS`).
   - Provas matemáticas obrigatórias antes da compilação:
     - **Segurança de Pinos e PWM:** `check_pin_validity()` e limites de escrita digital (`0|1`) / PWM (`0..255`).
     - **Prevenção de Watchdog Lockup:** limitação estática de `delay_ms` entre `0` e `max_delay_ms`.
     - **Memory Safety / Buffer Overflow:** validação simbólica de índices de array (`0 <= idx < size`) com atualização condicional `If(z3_idx == i, z3_val, old_elem_val)`.
     - **Divisão / Módulo por Zero:** asserção simbólica `right_val != 0` para operadores `/` e `%`.
3. **Transpilação Bare-Metal & Fuzzing Estocástico (`imortal/compiler.py`, `imortal/sandbox.py`):**
   - `CodeCompiler` traduz recursivamente expressões e instruções da IR verificada para C++ AVR bare-metal e binário Intel HEX.
   - `StateEmulator` executa simulação concreta e fuzzing estocástico limitado por `max_cycles = 5000` antes da entrega do firmware.

---

## 3. Arquitetura de PI do OrbeJobs Zero-Key + IMORTAL Cascade (`inho_backend/`)

1. **Pré-Filtro Vetorial `pgvector` + Cache + Cascata Multi-Provedor (`services/ai_agent.py`):**
   - `compute_text_embedding()` + `cosine_similarity()` + `prefilter_pgvector_candidates()` executam filtragem semântica determinística local antes de qualquer chamada externa.
   - `IMORTALPredictiveCascadeRouter` realiza rotação resiliente de chaves gratuitas/locais (**Gemini → Groq → Ollama Local → Síntese Local Determinística**) com *cooldown* automático em falhas HTTP `429/5xx` e cache LRU/TTL após sanitização LGPD de PII (`sanitize_pii_text()`).
2. **Deduplicação e Cofre Criptográfico MultiFernet AES-256 (`models/models.py`, `core/security.py`, `services/orbejobs_mailer.py`):**
   - `UniqueConstraint("user_id", "job_url_hash")` com canonicalização de URL + SHA-256 (`orbejobs_scraper.py`).
   - Cofre `orbejobs_oauth_vault` cifrado com `MultiFernet` AES-256 e bloqueado no PostgREST (`supabase_hardening.py`).
   - Trava pré-envio via **DNS MX** (`dnspython`), **jitter** aleatório via `SystemRandom`, **teto diário** rígido (`10–15` envios/dia), **Human-in-the-Loop** e **Kill-Switch** instantâneo com trilha de auditoria e anonimização LGPD Art. 18.
