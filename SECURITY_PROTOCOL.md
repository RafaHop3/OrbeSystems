# ðŸ”’ PROTOCOLO DE DESENVOLVIMENTO SEGURO E DEVSECOPS â€” ORBE SYSTEMS
> **VersÃ£o:** 2.0 (INFLEXÃVEL) | **Status:** VIGENTE & MANDATÃ“RIO | **Autor:** Orbe Systems Core AI / Antigravity

Este documento estabelece o **protocolo de seguranÃ§a e boas prÃ¡ticas de desenvolvimento** para todos os projetos da Orbe Systems. Ele Ã© absoluto, inegociÃ¡vel e atua como a barreira final de controle de qualidade antes de qualquer merge ou deployment em produÃ§Ã£o (Vercel, AWS ECR ou EC2).

---

## ðŸš« DECLARAÃ‡ÃƒO DE INFLEXIBILIDADE

1. **Zero TolerÃ¢ncia**: Nenhuma linha de cÃ³digo que viole este protocolo serÃ¡ fundida no branch principal (`main`).
2. **Falha por PadrÃ£o**: Se um Ãºnico item deste protocolo nÃ£o puder ser comprovado como funcional no Pull Request, o build de CI/CD deve falhar.
3. **RevisÃµes PeriÃ³dicas**: Qualquer alteraÃ§Ã£o neste protocolo exige aprovaÃ§Ã£o unÃ¢nime do time de engenharia e lideranÃ§a de DevSecOps.

---

## ðŸ’» PARTE 1: DIRETRIZES DO CLIENTE (FRONTEND & UI/UX)
*O foco Ã© performance bruta, acessibilidade, SEO e resiliÃªncia da interface do usuÃ¡rio.*

### 1.1 ComponentizaÃ§Ã£o AtÃ´mica
- **Regra**: Proibida a duplicaÃ§Ã£o de estruturas de UI comuns. Elementos reutilizÃ¡veis (botÃµes, cards, inputs, modais) devem ser isolados em componentes puros e independentes.
- **Enforcement**: Se uma estrutura HTML/Tailwind for repetida mais de 2 vezes, ela deve virar um componente.

### 1.2 Mobile-First Real
- **Regra**: Todos os layouts devem ser desenvolvidos pensando primeiro em telas pequenas (mobile), usando os modificadores do Tailwind (ex: `md:`, `lg:`) para expandir e adaptar a interface para desktops.
- **Enforcement**: VerificaÃ§Ã£o de quebra de layout em telas de 320px a 480px.

### 1.3 OtimizaÃ§Ã£o CrÃ­tica de MÃ­dias e Imagens
- **Regra**: Formatos legados (.png, .jpg) sÃ£o proibidos para imagens estÃ¡ticas grandes. Devem ser convertidos para `.webp` ou `.avif`.
- **Regra no Next.js**: Ã‰ **obrigatÃ³rio** o uso do componente `<Image />` (`next/image`) nativo com `placeholder="blur"`, lazy loading automÃ¡tico e dimensionamento explÃ­cito (ou `fill`).
- **Objetivo**: Evitar perdas de pontuaÃ§Ã£o por CLS (Cumulative Layout Shift) e LCP (Largest Contentful Paint) no Core Web Vitals.

### 1.4 GestÃ£o de Estado Eficiente
- **Regra**: Evitar o uso indiscriminado de React Context ou propagaÃ§Ã£o excessiva de estados no topo da Ã¡rvore React, para nÃ£o travar o render do navegador do usuÃ¡rio.
- **Diretriz**: Para fluxos reativos em tempo real (como logs de terminal ou contadores), utilize gerenciadores de estado leves e focados (ex: **Zustand** ou **Signals**).

### 1.5 Tratamento de Estados de Erro (Error Boundaries)
- **Regra**: "Telas brancas" ou travamentos totais por falha em requisiÃ§Ãµes sÃ£o inaceitÃ¡veis.
- **Enforcement**: Todo componente que consome APIs externas deve estar envolvido em um **Error Boundary** ou possuir tratamentos locais de erro, exibindo um componente de Fallback amigÃ¡vel e um botÃ£o de `Tentar Novamente` (`Retry`).

---

## ðŸ–¥ï¸ PARTE 2: DIRETRIZES DO SERVIDOR (BACKEND, INFRAESTRUTURA & CYBER SAFETY)
*O foco Ã© a blindagem de dados, resiliÃªncia do sistema, controle financeiro de consumo e velocidade de resposta.*

### 2.1 FunÃ§Ãµes Serverless / MicrosserviÃ§os Isolados
- **Regra**: Rotas com alto consumo de CPU ou chamadas de longa duraÃ§Ã£o (ex: compilaÃ§Ãµes e geraÃ§Ã£o de IAs) devem ser isoladas em endpoints ou funÃ§Ãµes serverless dedicadas. Uma rota lenta nunca deve travar outras partes operacionais da aplicaÃ§Ã£o.

### 2.2 VariÃ¡veis de Ambiente Protegidas (Zero Secrets)
- **Regra**: Chaves de API, segredos de JWT, strings de conexÃ£o a bancos de dados ou tokens de serviÃ§os de nuvem **nunca** devem ser inseridos diretamente no cÃ³digo fonte ou commits do Git.
- **Enforcement**: Devem ser carregados estritamente via variÃ¡veis de ambiente (`process.env` no Node, `settings` / `os.getenv` no Python).
- **Git**: Arquivos `.env` e chaves locais devem constar obrigatoriamente no `.gitignore`.

### 2.3 EstratÃ©gia de Cache Inteligente (Stale-While-Revalidate / ISR)
- **Regra**: Consultas recorrentes ao banco de dados para conteÃºdos que mudam com pouca frequÃªncia (ex: posts, portfÃ³lios, dados estÃ¡ticos) devem ser evitadas.
- **ImplementaÃ§Ã£o**: Configurar cabeÃ§alhos de cache eficientes ou utilizar **ISR (Incremental Static Regeneration)** no Next.js. O servidor deve servir pÃ¡ginas estÃ¡ticas instantaneamente a partir da borda da CDN (Vercel Edge) e validar a atualizaÃ§Ã£o em segundo plano. Isso reduz os custos de processamento de banco de dados e APIs em atÃ© 90%.

### 2.4 ValidaÃ§Ã£o Rigorosa no Server-Side
- **Regra**: **NUNCA CONFIE NOS DADOS DO CLIENTE.** Qualquer input recebido pelo backend deve ser estritamente validado e sanitizado no lado do servidor.
- **ImplementaÃ§Ã£o**:
  - No Backend Python (FastAPI): Uso obrigatÃ³rio de schemas do **Pydantic** para tipagem e validaÃ§Ã£o forte.
  - No Frontend/Edge/Node: Uso obrigatÃ³rio de esquemas **Zod** para validaÃ§Ã£o antes de qualquer processamento ou mutaÃ§Ã£o de banco.
- **Objetivo**: PrevenÃ§Ã£o total contra SQL Injection, injeÃ§Ã£o de parÃ¢metros, XSS e corrupÃ§Ã£o do esquema do banco de dados.

### 2.5 ImplementaÃ§Ã£o de Rate Limiting
- **Regra**: Todas as rotas de API pÃºblicas e endpoints sensÃ­veis (especialmente `/api/auth/login`, registro de usuÃ¡rios, criaÃ§Ã£o de entidades, endpoints de processamento pesado e terminal) devem possuir limites de requisiÃ§Ã£o por IP/UsuÃ¡rio.
- **ImplementaÃ§Ã£o**: Uso de Middlewares na borda (Edge Rate Limiting) para barrar ataques de forÃ§a bruta, scrapers ou negaÃ§Ã£o de serviÃ§o (DoS) antes mesmo de consumirem ciclos do seu banco de dados principal.

---

## ðŸ“Š MATRIZ DE IMPACTO E PRIORIDADE DE ENFORCEMENT

A prioridade de aplicaÃ§Ã£o dos controles Ã© definida pelo risco e impacto operacional/financeiro:

| Controle DevSecOps | NÃ­vel de Impacto | BeneficiÃ¡rio Principal | DestinaÃ§Ã£o Principal |
| :--- | :--- | :--- | :--- |
| **Edge Rate Limiting** | **CrÃ­tico / Alto** | ProteÃ§Ã£o de Infraestrutura | Servidor / Controle de Custos |
| **Zod / Pydantic Validation** | **Alto** | PrevenÃ§Ã£o de Bugs e Ataques | SeguranÃ§a da AplicaÃ§Ã£o / Dados |
| **Cache Inteligente / ISR** | **MÃ©dio** | Velocidade e Custo | Cliente (SEO) / Servidor |
| **OtimizaÃ§Ã£o de MÃ­dias/Imagens**| **MÃ©dio** | Performance (Lighthouse) | Cliente (Core Web Vitals) |
| **Error Boundaries / Fallbacks** | **MÃ©dio** | ResiliÃªncia de Interface | Cliente (UX / RetenÃ§Ã£o) |

---

## ðŸ›¡ï¸ PROTOCOLO DE ANÃLISE ANTES DO COMMIT (PRE-COMMIT)

Antes de rodar `git commit` ou empurrar cÃ³digo para branches de PR:

1. **Varredura de Segredos**:
   Execute uma busca local por tokens acidentais na base:
   ```bash
   grep -rn "ghp_\|sk_live_\|sk_test_\|whsec_\|password=\|api_key=" --include="*.py" --include="*.ts" --include="*.js" .
   ```
2. **VerificaÃ§Ã£o de Builds**:
   Confirme se a validaÃ§Ã£o estÃ¡tica de tipos (TypeScript/Pydantic) e lints passa localmente:
   ```bash
   # Frontend
   npm run build
   # Backend
   pytest
   ```
3. **Checagem de RLS (Row Level Security)**:
   Se estiver utilizando Supabase ou outro banco relacional na nuvem, garanta que todas as novas tabelas possuam polÃ­ticas de RLS ativadas antes do commit da migraÃ§Ã£o SQL.

---

## âš ï¸ PROCEDIMENTO DE CONTENÃ‡ÃƒO (VAZAMENTO DE SEGREDO)

Se um segredo for commitado acidentalmente e enviado para o repositÃ³rio remoto:

1. **Revogue Imediatamente**: Inative a chave na plataforma provedora (AWS, GitHub, Stripe, Supabase).
2. **Substitua a Chave**: Crie um novo token no provedor e insira-o no painel de controle de variÃ¡veis de ambiente do servidor.
3. **Expurgue o HistÃ³rico**: Remova o arquivo comprometido do histÃ³rico do Git utilizando `git-filter-repo` ou `git filter-branch` e faÃ§a forÃ§a do push para os branches remotos.
4. **Documente**: Registre o incidente na auditoria interna de vulnerabilidades.

---

## ðŸš PARTE 3: REGRAS DE AUTOMAÃ‡ÃƒO E SEGURANÃ‡A EM SCRIPTS (POWERSHELL SECDEVOPS)
*O foco Ã© garantir que scripts executados localmente ou em pipelines de CI/CD estejam livres de vulnerabilidades crÃ­ticas.*

### 3.1 Auditoria e Varredura de Scripts (OrbePSShield SAST)
Todos os scripts PowerShell (`.ps1`) gerados ou utilizados em projetos da Orbe Systems devem passar obrigatoriamente pela anÃ¡lise estÃ¡tica do **OrbePSShield** e seguir as seguintes travas de conformidade:

| Regra / PadrÃ£o Detectado | Severidade | Impacto no Score | MitigaÃ§Ã£o MandatÃ³ria |
| :--- | :---: | :---: | :--- |
| `iex` ou `Invoke-Expression` | **CRÃTICO** | -40 pontos | Utilizar chamada explÃ­cita por operador de chamada `&` ou executar scripts locais auditados. |
| `Disable-NetFirewall` / `Set-MpPreference` | **CRÃTICO** | -35 pontos | Nunca desabilitar o firewall local ou o Windows Defender AntivÃ­rus via script. |
| `Set-ExecutionPolicy Bypass` | **ALTO** | -25 pontos | Executar com `-Scope Process` ou rodar via wrapper `.bat` temporÃ¡rio de processo Ãºnico. |
| `password` / `senha` / `secret` (texto limpo) | **ALTO** | -20 pontos | Utilizar `Get-Credential` ou carregar segredos de cofres de chaves (SecretManagement). |
| `http://` (Sem criptografia TLS) | **MÃ‰DIO** | -10 pontos | Utilizar obrigatoriamente o protocolo seguro `https://` para evitar interceptaÃ§Ãµes MitM. |
| `Remove-Item` com `-Force` (Sem `-Confirm`) | **BAIXO** | -5 pontos | Adicionar `-Confirm:$false` ou `-WhatIf` de forma explÃ­cita para evitar deleÃ§Ã£o catastrÃ³fica. |

### 3.2 ExecuÃ§Ã£o Segura e Encapsulamento
- **Bypass de PolÃ­tica Global Proibido**: Ã‰ expressamente proibido alterar a polÃ­tica de execuÃ§Ã£o global do Windows. wrappers de arquivos batch (`.bat`) devem encapsular a execuÃ§Ã£o em escopo local e isolado:
  ```cmd
  powershell -NoProfile -ExecutionPolicy RemoteSigned -File "%~dp0SeuScript.ps1"
  ```
- **Pipelines CI/CD**: Arquivos de pipeline GitHub Actions (`.yml`) que invoquem cÃ³digo PowerShell devem rodar sob shells tipados e protegidos com validaÃ§Ãµes rigorosas de erros (`$ErrorActionPreference = 'Stop'`).

---

*Este protocolo foi desenhado para manter o ecossistema da Orbe Systems escalÃ¡vel, seguro contra exploraÃ§Ãµes, rÃ¡pido no carregamento e financeiramente eficiente no modelo serverless.*


