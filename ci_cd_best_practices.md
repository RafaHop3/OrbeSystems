# CI/CD Requirements & Senior Best Practices — Orbe Systems & INHO

## 🎯 1. Levantamento de Requisitos de CI/CD

### 1.1 Automação de Integração Contínua (CI)
- **Gatilhos Automáticos**: Triggers configurados para eventos de `push` e `pull_request` nas branches de integração (`feat-*`) e produção (`main`, `master`).
- **Validação de Código Python (FastAPI Backend)**:
  - **Suíte Pytest (10/10 Testes)**: Execução obrigatória dos testes unitários e de integração E2E em ambiente isolado de CI antes de autorizar a fusão do código.
  - **Linting & Estilo (Flake8)**: Verificação estrita de sintaxe e complexidade ciclomática.
  - **Varredura de Segurança (Bandit / Shift-Left Security)**: Análise estática de vulnerabilidades de código e dependências.
- **Validação de Código TypeScript/React (Next.js Frontend)**:
  - **Checagem de Tipagem Estrita (`tsc --noEmit`)**: Bloqueio de builds com inconsistências de tipo TypeScript.
  - **ESLint & Prettier**: Garantia de padronização estética e prevenção de bugs em componentes React.
  - **Build de Teste (`npm run build`)**: Validação da compilação de produção para evitar quebras no ambiente live.

### 1.2 Automação de Entrega Contínua (CD)
- **Gatilhos de Implantação**: Acionamento automático pós-merge na branch `main` ou `feat-inho-provisioning`.
- **Deploy do Frontend**: Integração com a infraestrutura da Vercel para publicação instantânea e atualização de CDN Edge.
- **Deploy do Backend**: Containerização via Docker Buildx e deploy no ambiente cloud de produção (AWS EC2 / Render / Supabase).

---

## 🏆 2. Boas Práticas de CI/CD para Arquitetura Sênior

1. **⚡ Fast Feedback Loop (Ciclo de Feedback Rápido)**:
   - Utilização de **Caching de Dependências** (`pip` e `npm` cache via GitHub Actions) para reduzir o tempo de execução do CI para menos de 2 minutos.
2. **🛡️ Shift-Left Security (Segurança Desde o Início)**:
   - Integração da varredura de vulnerabilidades de segurança (Bandit) diretamente na pipeline de CI para barrar falhas antes do ambiente de staging.
3. **📦 Artefatos Imutáveis (Build Once, Deploy Anywhere)**:
   - Imagens Docker geradas uma única vez e marcadas com a hash do Git Commit (`sha-${{ github.sha }}`).
4. **🔒 Secrets Zero-Trust**:
   - Chaves de API e tokens de produção isolados no **GitHub Actions Secrets** (`VERCEL_TOKEN`, `AWS_ACCESS_KEY`), sem hardcode em arquivos de código.
5. **↩️ Automated Rollbacks & Zero-Downtime**:
   - Implantação progressiva garantindo que contêineres antigos permaneçam ativos até a resposta HTTP 200 do `healthcheck` do novo contêiner.
