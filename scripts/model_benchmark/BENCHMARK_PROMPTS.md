# Benchmark Prático de Programação: Hydrogen vs Argon (Ecossistema Orbe Systems)

Use este roteiro para comparar dois modelos em **conversas limpas e idênticas**, sempre na mesma branch/commit base (`git status` limpo).

---

## Regras de Execução (Para Comparação Justa)

1. Abra uma **nova conversa** para o Modelo A (**Hydrogen**) e outra **nova conversa** para o Modelo B (**Argon**).
2. Cole **exatamente** o mesmo prompt de cada tarefa abaixo.
3. Antes de passar para a próxima tarefa no mesmo modelo, rode `git reset --hard` (ou use branches separadas `bench/hydrogen` e `bench/argon`).
4. Ao final de cada tarefa, execute `python scripts/model_benchmark/verify_benchmark.py` para coletar a pontuação objetiva.

---

## Tarefa 1 — Segurança RBAC & Anti-Quebra (Manual 06)
**Foco:** Leitura de regras arquiteturais + precisão em correção pontual.

> **Prompt:**
> `Leia D:\OrbeSystems\Manual_Arquitetura_ORBE\06_Regras_Anti_Quebra_Operador_OrBrick_e_RBAC.md e verifique D:\OrbeSystems\orbe-systems\inho_backend\core\deps.py e routers\admin.py. Liste quaisquer comparações de role que não normalizam com .lower() e, se houver, proponha o patch mínimo sem quebrar pytest nem flake8.`

**Critérios (25 pts):**
- Identifica corretamente arquivos/linhas sem alucinar símbolos (10 pts)
- Passa `flake8 --select=E9,F63,F7,F82` (5 pts)
- Passa `pytest` sem regressões (10 pts)

---

## Tarefa 2 — Engenharia de Novo Módulo: PolicyEngine (Manual 35 — Fase 5A)
**Foco:** Arquitetura limpa, casos de borda e testes unitários do zero.

> **Prompt:**
> `Crie um módulo isolado em D:\OrbeSystems\orbe-systems\inho_backend\services\policy_engine.py e testes em tests\test_policy_engine.py implementando a Seção 2.3 do Manual 35: PolicyEngine determinístico em Python que recebe uma política JSON aprovada (max_parcelas, desconto_max_pct, prazo_prorrogacao_max_dias, alcada_humana_acima_de) e valida uma proposta da IA. Regras invioláveis: nunca permitir baixa de fatura (PAID), nunca permitir desconto > teto da política, escalar para humano se valor > R$ 5.000,00 ou se a regra for omissa. Rode flake8 e pytest ao final.`

**Critérios (30 pts):**
- Código limpo, sem duplicação e com docstrings (10 pts)
- Cobre todos os casos de borda (regra omissa = negado, teto R$ 5.000, bloqueio de `PAID`) (10 pts)
- `flake8` = 0 erros e 100% dos novos testes passando no `pytest` (10 pts)

---

## Tarefa 3 — Refatoração & Contrato de API (OrbeJobs / SQLAlchemy Async)
**Foco:** Manter compatibilidade SQLite + PostgreSQL sem gerar erro de FK ou lint.

> **Prompt:**
> `Analise D:\OrbeSystems\orbe-systems\inho_backend\routers\orbejobs.py e tests\test_orbejobs.py. Adicione um endpoint GET /api/v1/orbejobs/metrics que retorne taxa de aprovação Human-in-the-Loop, taxa de falha DNS MX e média de match_score do tenant autenticado, isolado por business_id e user_id, com teste automatizado em test_orbejobs.py. Rode flake8 e pytest.`

**Critérios (25 pts):**
- Isolamento Multi-Tenant (`business_id` + `user_id`) respeitado (10 pts)
- Compatível com SQLite nos testes e PostgreSQL em produção (5 pts)
- `flake8` + `pytest tests/test_orbejobs.py` passando 100% (10 pts)

---

## Tarefa 4 — Frontend Next.js + TypeScript + Regra SEC-01
**Foco:** Tipagem estrita (`tsc --noEmit`) e conformidade com regras de marca (`SEC-01`).

> **Prompt:**
> `No projeto D:\OrbeSystems\inho_frontend, adicione no painel src\app\dashboard\orbejobs\page.tsx um indicador visual do status da Política de Autonomia (versão ativa e teto de alçada) sem quebrar o build nem vazar nomes de provedores externos de LLM (regra SEC-01 em e2e/orbe_assistant_root.spec.ts). Valide com npx tsc --noEmit.`

**Critérios (20 pts):**
- `npx tsc --noEmit` = 0 erros (10 pts)
- Zero ocorrência de marcas externas (`google gemini`, `gemini 1.5`, etc.) no código frontend (10 pts)

---

## Placar Comparativo

| Tarefa | Peso | Hydrogen | Argon | Observações (erros, alucinações, nº de tentativas) |
|---|---:|---:|---:|---|
| 1. Segurança RBAC (Manual 06) | 25 | /25 | /25 | |
| 2. PolicyEngine (Manual 35) | 30 | /30 | /30 | |
| 3. Endpoint `/metrics` + SQLite/PG | 25 | /25 | /25 | |
| 4. Next.js + TypeScript + SEC-01 | 20 | /20 | /20 | |
| **TOTAL** | **100** | **/100** | **/100** | |
