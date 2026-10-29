/**
 * Base de Conhecimento Vetorial e Documental da Orbe Systems
 * Compilada a partir dos Manuais de Arquitetura 01 a 10 e especificações dos produtos.
 */

export interface RagChunk {
  id: string;
  title: string;
  category: 'arquitetura' | 'produtos' | 'seguranca' | 'deploy' | 'homologacao';
  tags: string[];
  content: string;
}

export const ORBE_KNOWLEDGE_CHUNKS: RagChunk[] = [
  // --- MANUAIS TÉCNICOS DE ARQUITETURA ---
  {
    id: 'manual-01-sso-jwt',
    title: 'Manual 01: Autenticação SSO e Payload JWT (Orbe Hub)',
    category: 'seguranca',
    tags: ['sso', 'jwt', 'sub', 'uuid', 'email', 'auth', 'tokens', 'public.users', 'asyncpg', '500 error'],
    content: `O Orbe Systems Hub atua como Master Identity Provider (SSO). Ele assina tokens JWT injetando um UUID nativo no claim 'sub' (que reflete o ID principal em public.users).
O driver SQLAlchemy/asyncpg quebra com 'operator does not exist: character varying = uuid' caso o código tente comparar o UUID do token diretamente com uma coluna de email (VARCHAR).
Solução Definitiva: Extração polimórfica em security/auth.py que testa se o subject é um UUID válido via uuid.UUID(email). Se for UUID, busca diretamente por User.id; se falhar (formato legado), busca por User.email.`
  },
  {
    id: 'manual-02-modelagem-uuid',
    title: 'Manual 02: Modelagem de Dados, UUIDs e Relacionamentos SQLAlchemy',
    category: 'arquitetura',
    tags: ['uuid', 'banco', 'postgres', 'sqlalchemy', 'varchar', 'business_operators', 'public.users', 'multi-schema'],
    content: `Em nossa arquitetura multi-schema, os usuários mestres residem em public.users com chave primária UUID nativa.
Armadilha de VARCHAR: Criar tabelas satélite com user_id VARCHAR(50) causa quebra no Lazy Loading do SQLAlchemy ('uuid = string').
Padrão Ouro: Todas as colunas referenciais (user_id, business_id) devem ser tipadas estritamente como UUID no PostgreSQL.
A tabela inho.business_operators foi migrada em produção para:
user_id UUID NOT NULL REFERENCES public.users(id), business_id UUID NOT NULL REFERENCES businesses(id).`
  },
  {
    id: 'manual-03-deploy-ec2',
    title: 'Manual 03: Gestão, Manutenção e Deployment no AWS EC2',
    category: 'deploy',
    tags: ['ec2', 'aws', 'deploy', 'docker', 'nginx', 'ssm', 'i-058e26140671b3254', 'portas', '8000', '8001'],
    content: `A produção ativa do ecossistema roda sob containers Docker blindados na AWS EC2 (us-east-1), instância i-058e26140671b3254.
Topologia de Portas e Nginx:
- api.orbesystems.com.br -> porta 8000 (container orbe_backend)
- inho-api.orbesystems.com.br -> porta 8001 (container inho_backend)
- orbe_whatsapp -> porta 3001 (Baileys WhatsApp Bot)
- orbe_postgres -> porta 5432
- orbe_redis -> porta 6379
Gerenciamento Remoto: Diagnósticos devem ser prioritariamente inspecionados via AWS Systems Manager (SSM) RunCommand. O código dinâmico mapeia para /home/ubuntu/orbe-systems/inho_backend.`
  },
  {
    id: 'manual-04-orbe-admin',
    title: 'Manual 04: Autenticação Orbe Admin e RBAC',
    category: 'seguranca',
    tags: ['admin', 'login', 'rbac', 'bcrypt', 'rate limit', 'brute force', 'super admin', 'audit'],
    content: `O painel Orbe Admin (/admin/login) gerencia permissões críticas do ecossistema.
A autenticação utiliza hash bcrypt com salt dinâmico (ADMIN_PASSWORD_HASH).
Controle de Acesso Baseado em Papéis (RBAC):
- SUPER_ADMIN: Acesso irrestrito a telemetria, logs de auditoria e criação de tenants.
- ADMIN_FINANCEIRO: Gestão de faturas, conciliação PIX e comissões.
- DEV_SECURITY: Auditoria de SAST, certificados e logs do Ghost Engine.
Possui proteção contra ataques de força bruta com rate limiting rigoroso e bloqueio por IP.`
  },
  {
    id: 'manual-05-mapa-repositorios-orbrick',
    title: 'Manual 05: Mapa Definitivo de Repositórios, Login INHO e OrBrick (WhatsApp)',
    category: 'arquitetura',
    tags: ['repositorios', 'source of truth', 'login inho', 'orbrick', 'whatsapp', 'baileys', 'vercel', 'ec2'],
    content: `Fonte Oficial de Código (Source of Truth):
- INHO Backend: D:\\OrbeSystems\\orbe-systems\\inho_backend -> EC2 (inho-api.orbesystems.com.br)
- INHO Frontend: D:\\OrbeSystems\\inho_frontend -> Vercel (inho.orbesystems.com.br)
- Orbe Hub Backend: D:\\OrbeSystems\\orbe-systems\\backend -> EC2 (api.orbesystems.com.br)
- Orbe Systems Frontend: D:\\OrbeSystems\\orbe-systems\\frontend -> Vercel (orbesystems.com.br)
- OrBrick WhatsApp Bot: EC2 container orbe_whatsapp:3001.
Regra do Login INHO: LoginRequest aceita email e username opcionais sem validação estrita bloqueante de EmailStr, tratando espaços e lowercase para eliminar erros 422 e '[object Object]'.`
  },
  {
    id: 'manual-06-regras-orbrick-rbac',
    title: 'Manual 06: Regras Anti-Quebra Operador OrBrick e Isolamento Multi-Tenant',
    category: 'seguranca',
    tags: ['orbrick', 'rbac', 'multi-tenant', 'isolamento', 'operador', 'cooperativa', 'business_id'],
    content: `Regra de Ouro nº 1: Bloqueio absoluto de cadastro público (/api/v1/auth/register). Todas as contas são provisionadas pelo Master Super Admin.
Isolamento Multi-Tenant: Toda query aos dados de faturas, clientes ou WhatsApp é filtrada compulsoriamente pelo business_id (UUID do tenant).
Um operador da Cooperativa Sul jamais pode visualizar, alterar ou enviar mensagens para associados da Cooperativa Norte.`
  },
  {
    id: 'manual-07-plano-testes-e2e',
    title: 'Manual 07: Plano de Testes E2E e Portões de Qualidade (26 Passos)',
    category: 'homologacao',
    tags: ['testes', 'e2e', 'qualidade', 'qa', 'homologacao', '26 passos', 'gates'],
    content: `Bateria completa de testes automatizados E2E em produção com 26 passos distribuídos em 4 fases:
Fase 1: Segurança Pré-Login (bloqueio de register público, timing attacks, e-mails inexistentes).
Fase 2: Autenticação & Gestão de Sessão (login simultâneo, validação de tokens JWT, refresh).
Fase 3: Isolamento Multi-Tenant em Produção (CRUD de cooperados, segregação de faturas, proteção contra IDOR).
Fase 4: OrBrick WhatsApp & Open Finance (disparo de notificações, fila de cobrança D-3/D0/D+3, conciliação PIX).`
  },
  {
    id: 'manual-08-homologacao-openfinance',
    title: 'Manual 08: Homologação Multi-Tenant & Open Finance Brasil (BACEN)',
    category: 'homologacao',
    tags: ['open finance', 'bacen', 'pix', 'cooperativa', 'cooperado', 'itp', 'fase 2', 'fase 3'],
    content: `Homologação prática com duas cooperativas independentes (Cooperativa Sul - fd244464... e Norte Coop - a3a29150...).
Módulo Open Finance Brasil em conformidade com as diretrizes do Banco Central (BACEN):
- Fase 2: Compartilhamento de dados cadastrais e transacionais com consentimento explícito.
- Fase 3 ITP: Iniciação de Transações de Pagamento (PIX) com conciliação instantânea em menos de 1 segundo.`
  },

  // --- PRODUTOS E PLATAFORMAS DA ORBE SYSTEMS ---
  {
    id: 'prod-imortal-z3',
    title: 'Produto: IMORTAL (Formal Verification Engine + Z3 SMT Prover)',
    category: 'produtos',
    tags: ['imortal', 'z3', 'smt', 'verificacao formal', 'engenharia reversa', 'bytecode', 'microcontroladores', 'atmega328p', 'seguranca'],
    content: `O IMORTAL é o motor de verificação formal neuro-simbólica da Orbe Systems.
Ele converte intenções em linguagem natural para uma Representação Intermediária (IR) estrita em JSON e aplica o provador de teoremas Microsoft Z3 (SMT Solver).
Garante matematicamente:
- Ausência total de divisões por zero
- Limites seguros de variáveis (bounds checking)
- Validação física de pinos de microcontroladores (ex: pinos válidos de 0 a 19 no ATmega328p)
- Prevenção contra travamento de Watchdog Timer e loops infinitos.`
  },
  {
    id: 'prod-ghost-engine',
    title: 'Produto: Ghost Engine (LGPD Art. 7º e 18º + Zero Trust Data Removal)',
    category: 'produtos',
    tags: ['ghost engine', 'lgpd', 'art 18', 'opt-out', 'databrokers', 'privacidade', 'criptografia', 'multifernet', 'kms'],
    content: `O Ghost Engine automatiza solicitações formais de remoção de dados pessoais e opt-out junto a mais de 30 databrokers e birôs de crédito.
Conformidade Legal: Baseado nos direitos fundamentais previstos nos Artigos 7º e 18º da Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018).
Arquitetura de Segurança: Chaves de criptografia simétrica MultiFernet KMS, tráfego TLS 1.3 ponta a ponta e auditoria imutável dos recibos de exclusão.`
  },
  {
    id: 'prod-inho-erp',
    title: 'Produto: INHO Business Engine & OrBrick (ERP Multi-Tenant + Central WhatsApp)',
    category: 'produtos',
    tags: ['inho', 'erp', 'orbrick', 'whatsapp', 'pix', 'faturamento', 'dre', 'multi-tenant', 'baileys'],
    content: `O INHO Business Engine é o sistema de gestão corporativa da Orbe Systems para empresas e cooperativas.
Recursos Centrais:
- Conciliação PIX instantânea (< 1s) integrada ao Open Finance BACEN
- Emissão fiscal e DRE em tempo real
- Central WhatsApp OrBrick: Robô integrado via Baileys (porta 3001) para atendimento automatizado, régua de cobrança preventiva (D-3, D0, D+3) e sincronização com a base de sócios/cooperados.`
  },
  {
    id: 'prod-orbe-cleaner',
    title: 'Produto: Orbe Cleaner V4 (Hardware & NVMe Optimization)',
    category: 'produtos',
    tags: ['cleaner', 'nvme', 'ssd', 'hardware', 'otimizacao', 'cache', 'trim'],
    content: `O Orbe Cleaner V4 é uma suíte de otimização de baixo nível para discos de alta performance NVMe/SSD.
Atua eliminando caches temporários órfãos, executando instruções TRIM otimizadas no controlador e reduzindo a fragmentação lógica sem desgastar as células de memória NAND.`
  },
  {
    id: 'prod-audio-visual-studio',
    title: 'Produto: Orbe Music (DAW Engine) & Visual Studio',
    category: 'produtos',
    tags: ['music', 'daw', 'audio', 'visual studio', 'webgl', 'dsp', '48khz', 'glsl', 'shaders'],
    content: `Plataforma de computação criativa baseada na web.
Orbe Music: Motor de Processamento Digital de Sinais (DSP) a 48kHz, sintetizadores modulares em Web Audio API e sequenciadores paramétricos.
Visual Studio: Motor de shaders WebGL/GLSL em tempo real para computação gráfica interativa e grafos de curvas Bézier.`
  },
  {
    id: 'prod-powershell-bot',
    title: 'Produto: PowerShell Shield Bot (SecDevOps SAST Auditor)',
    category: 'produtos',
    tags: ['powershell', 'sast', 'secdevops', 'auditoria', 'automacao', 'seguranca'],
    content: `Agente de automação SecDevOps que inspeciona scripts PowerShell, detecta comandos perigosos, escalonamento de privilégios e valida integridade antes da execução em servidores corporativos.`
  }
];
