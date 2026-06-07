# 🔒 PROTOCOLO DE DESENVOLVIMENTO SEGURO E DEVSECOPS — ORBE SYSTEMS
> **Versão:** 2.0 (INFLEXÍVEL) | **Status:** VIGENTE & MANDATÓRIO | **Autor:** Orbe Systems Core AI / Antigravity

Este documento estabelece o **protocolo de segurança e boas práticas de desenvolvimento** para todos os projetos da Orbe Systems. Ele é absoluto, inegociável e atua como a barreira final de controle de qualidade antes de qualquer merge ou deployment em produção (Vercel, Render ou VPS).

---

## 🚫 DECLARAÇÃO DE INFLEXIBILIDADE

1. **Zero Tolerância**: Nenhuma linha de código que viole este protocolo será fundida no branch principal (`main`).
2. **Falha por Padrão**: Se um único item deste protocolo não puder ser comprovado como funcional no Pull Request, o build de CI/CD deve falhar.
3. **Revisões Periódicas**: Qualquer alteração neste protocolo exige aprovação unânime do time de engenharia e liderança de DevSecOps.

---

## 💻 PARTE 1: DIRETRIZES DO CLIENTE (FRONTEND & UI/UX)
*O foco é performance bruta, acessibilidade, SEO e resiliência da interface do usuário.*

### 1.1 Componentização Atômica
- **Regra**: Proibida a duplicação de estruturas de UI comuns. Elementos reutilizáveis (botões, cards, inputs, modais) devem ser isolados em componentes puros e independentes.
- **Enforcement**: Se uma estrutura HTML/Tailwind for repetida mais de 2 vezes, ela deve virar um componente.

### 1.2 Mobile-First Real
- **Regra**: Todos os layouts devem ser desenvolvidos pensando primeiro em telas pequenas (mobile), usando os modificadores do Tailwind (ex: `md:`, `lg:`) para expandir e adaptar a interface para desktops.
- **Enforcement**: Verificação de quebra de layout em telas de 320px a 480px.

### 1.3 Otimização Crítica de Mídias e Imagens
- **Regra**: Formatos legados (.png, .jpg) são proibidos para imagens estáticas grandes. Devem ser convertidos para `.webp` ou `.avif`.
- **Regra no Next.js**: É **obrigatório** o uso do componente `<Image />` (`next/image`) nativo com `placeholder="blur"`, lazy loading automático e dimensionamento explícito (ou `fill`).
- **Objetivo**: Evitar perdas de pontuação por CLS (Cumulative Layout Shift) e LCP (Largest Contentful Paint) no Core Web Vitals.

### 1.4 Gestão de Estado Eficiente
- **Regra**: Evitar o uso indiscriminado de React Context ou propagação excessiva de estados no topo da árvore React, para não travar o render do navegador do usuário.
- **Diretriz**: Para fluxos reativos em tempo real (como logs de terminal ou contadores), utilize gerenciadores de estado leves e focados (ex: **Zustand** ou **Signals**).

### 1.5 Tratamento de Estados de Erro (Error Boundaries)
- **Regra**: "Telas brancas" ou travamentos totais por falha em requisições são inaceitáveis.
- **Enforcement**: Todo componente que consome APIs externas deve estar envolvido em um **Error Boundary** ou possuir tratamentos locais de erro, exibindo um componente de Fallback amigável e um botão de `Tentar Novamente` (`Retry`).

---

## 🖥️ PARTE 2: DIRETRIZES DO SERVIDOR (BACKEND, INFRAESTRUTURA & CYBER SAFETY)
*O foco é a blindagem de dados, resiliência do sistema, controle financeiro de consumo e velocidade de resposta.*

### 2.1 Funções Serverless / Microsserviços Isolados
- **Regra**: Rotas com alto consumo de CPU ou chamadas de longa duração (ex: compilações e geração de IAs) devem ser isoladas em endpoints ou funções serverless dedicadas. Uma rota lenta nunca deve travar outras partes operacionais da aplicação.

### 2.2 Variáveis de Ambiente Protegidas (Zero Secrets)
- **Regra**: Chaves de API, segredos de JWT, strings de conexão a bancos de dados ou tokens de serviços de nuvem **nunca** devem ser inseridos diretamente no código fonte ou commits do Git.
- **Enforcement**: Devem ser carregados estritamente via variáveis de ambiente (`process.env` no Node, `settings` / `os.getenv` no Python).
- **Git**: Arquivos `.env` e chaves locais devem constar obrigatoriamente no `.gitignore`.

### 2.3 Estratégia de Cache Inteligente (Stale-While-Revalidate / ISR)
- **Regra**: Consultas recorrentes ao banco de dados para conteúdos que mudam com pouca frequência (ex: posts, portfólios, dados estáticos) devem ser evitadas.
- **Implementação**: Configurar cabeçalhos de cache eficientes ou utilizar **ISR (Incremental Static Regeneration)** no Next.js. O servidor deve servir páginas estáticas instantaneamente a partir da borda da CDN (Vercel Edge) e validar a atualização em segundo plano. Isso reduz os custos de processamento de banco de dados e APIs em até 90%.

### 2.4 Validação Rigorosa no Server-Side
- **Regra**: **NUNCA CONFIE NOS DADOS DO CLIENTE.** Qualquer input recebido pelo backend deve ser estritamente validado e sanitizado no lado do servidor.
- **Implementação**:
  - No Backend Python (FastAPI): Uso obrigatório de schemas do **Pydantic** para tipagem e validação forte.
  - No Frontend/Edge/Node: Uso obrigatório de esquemas **Zod** para validação antes de qualquer processamento ou mutação de banco.
- **Objetivo**: Prevenção total contra SQL Injection, injeção de parâmetros, XSS e corrupção do esquema do banco de dados.

### 2.5 Implementação de Rate Limiting
- **Regra**: Todas as rotas de API públicas e endpoints sensíveis (especialmente `/api/auth/login`, registro de usuários, criação de entidades, endpoints de processamento pesado e terminal) devem possuir limites de requisição por IP/Usuário.
- **Implementação**: Uso de Middlewares na borda (Edge Rate Limiting) para barrar ataques de força bruta, scrapers ou negação de serviço (DoS) antes mesmo de consumirem ciclos do seu banco de dados principal.

---

## 📊 MATRIZ DE IMPACTO E PRIORIDADE DE ENFORCEMENT

A prioridade de aplicação dos controles é definida pelo risco e impacto operacional/financeiro:

| Controle DevSecOps | Nível de Impacto | Beneficiário Principal | Destinação Principal |
| :--- | :--- | :--- | :--- |
| **Edge Rate Limiting** | **Crítico / Alto** | Proteção de Infraestrutura | Servidor / Controle de Custos |
| **Zod / Pydantic Validation** | **Alto** | Prevenção de Bugs e Ataques | Segurança da Aplicação / Dados |
| **Cache Inteligente / ISR** | **Médio** | Velocidade e Custo | Cliente (SEO) / Servidor |
| **Otimização de Mídias/Imagens**| **Médio** | Performance (Lighthouse) | Cliente (Core Web Vitals) |
| **Error Boundaries / Fallbacks** | **Médio** | Resiliência de Interface | Cliente (UX / Retenção) |

---

## 🛡️ PROTOCOLO DE ANÁLISE ANTES DO COMMIT (PRE-COMMIT)

Antes de rodar `git commit` ou empurrar código para branches de PR:

1. **Varredura de Segredos**:
   Execute uma busca local por tokens acidentais na base:
   ```bash
   grep -rn "ghp_\|sk_live_\|sk_test_\|whsec_\|password=\|api_key=" --include="*.py" --include="*.ts" --include="*.js" .
   ```
2. **Verificação de Builds**:
   Confirme se a validação estática de tipos (TypeScript/Pydantic) e lints passa localmente:
   ```bash
   # Frontend
   npm run build
   # Backend
   pytest
   ```
3. **Checagem de RLS (Row Level Security)**:
   Se estiver utilizando Supabase ou outro banco relacional na nuvem, garanta que todas as novas tabelas possuam políticas de RLS ativadas antes do commit da migração SQL.

---

## ⚠️ PROCEDIMENTO DE CONTENÇÃO (VAZAMENTO DE SEGREDO)

Se um segredo for commitado acidentalmente e enviado para o repositório remoto:

1. **Revogue Imediatamente**: Inative a chave na plataforma provedora (AWS, GitHub, Stripe, Supabase).
2. **Substitua a Chave**: Crie um novo token no provedor e insira-o no painel de controle de variáveis de ambiente do servidor.
3. **Expurgue o Histórico**: Remova o arquivo comprometido do histórico do Git utilizando `git-filter-repo` ou `git filter-branch` e faça força do push para os branches remotos.
4. **Documente**: Registre o incidente na auditoria interna de vulnerabilidades.

---

## 🐚 PARTE 3: REGRAS DE AUTOMAÇÃO E SEGURANÇA EM SCRIPTS (POWERSHELL SECDEVOPS)
*O foco é garantir que scripts executados localmente ou em pipelines de CI/CD estejam livres de vulnerabilidades críticas.*

### 3.1 Auditoria e Varredura de Scripts (OrbePSShield SAST)
Todos os scripts PowerShell (`.ps1`) gerados ou utilizados em projetos da Orbe Systems devem passar obrigatoriamente pela análise estática do **OrbePSShield** e seguir as seguintes travas de conformidade:

| Regra / Padrão Detectado | Severidade | Impacto no Score | Mitigação Mandatória |
| :--- | :---: | :---: | :--- |
| `iex` ou `Invoke-Expression` | **CRÍTICO** | -40 pontos | Utilizar chamada explícita por operador de chamada `&` ou executar scripts locais auditados. |
| `Disable-NetFirewall` / `Set-MpPreference` | **CRÍTICO** | -35 pontos | Nunca desabilitar o firewall local ou o Windows Defender Antivírus via script. |
| `Set-ExecutionPolicy Bypass` | **ALTO** | -25 pontos | Executar com `-Scope Process` ou rodar via wrapper `.bat` temporário de processo único. |
| `password` / `senha` / `secret` (texto limpo) | **ALTO** | -20 pontos | Utilizar `Get-Credential` ou carregar segredos de cofres de chaves (SecretManagement). |
| `http://` (Sem criptografia TLS) | **MÉDIO** | -10 pontos | Utilizar obrigatoriamente o protocolo seguro `https://` para evitar interceptações MitM. |
| `Remove-Item` com `-Force` (Sem `-Confirm`) | **BAIXO** | -5 pontos | Adicionar `-Confirm:$false` ou `-WhatIf` de forma explícita para evitar deleção catastrófica. |

### 3.2 Execução Segura e Encapsulamento
- **Bypass de Política Global Proibido**: É expressamente proibido alterar a política de execução global do Windows. wrappers de arquivos batch (`.bat`) devem encapsular a execução em escopo local e isolado:
  ```cmd
  powershell -NoProfile -ExecutionPolicy RemoteSigned -File "%~dp0SeuScript.ps1"
  ```
- **Pipelines CI/CD**: Arquivos de pipeline GitHub Actions (`.yml`) que invoquem código PowerShell devem rodar sob shells tipados e protegidos com validações rigorosas de erros (`$ErrorActionPreference = 'Stop'`).

---

*Este protocolo foi desenhado para manter o ecossistema da Orbe Systems escalável, seguro contra explorações, rápido no carregamento e financeiramente eficiente no modelo serverless.*

