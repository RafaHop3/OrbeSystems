/**
 * Base de Conhecimento Vetorial e Documental da Orbe Systems
 * Compilada a partir dos Manuais de Arquitetura 01 a 23 e especificações oficiais dos produtos.
 */

export interface RagChunk {
  id: string;
  title: string;
  category: 'arquitetura' | 'produtos' | 'seguranca' | 'deploy' | 'homologacao' | 'vendas';
  tags: string[];
  content: string;
}

export const ORBE_KNOWLEDGE_CHUNKS: RagChunk[] = [
  // --- PLANOS COMERCIAIS & VENDAS INHO (OFICIAL 05/11/2026) ---
  {
    id: 'vendas-planos-inho-2026',
    title: 'Catálogo de Planos Oficiais INHO ERP & OrBrick-IA (Tabela de Vendas 2026)',
    category: 'vendas',
    tags: [
      'planos', 'precos', 'preço', 'valores', 'assinar', 'assinatura', 'inho', 'mensal',
      'anual', 'desconto', '2 meses gratis', 'essencial', 'pro', 'cooperativa', 'ouro',
      'stripe', 'checkout', 'mercado', 'venda'
    ],
    content: `A Orbe Systems oferece 3 planos oficiais para o INHO ERP com opção de Faturamento Mensal ou Anual (com 2 meses grátis e 17% de economia):

1. PLANO INHO ESSENCIAL (PMEs, Serviços e Pequenos Comércios):
- Valor Mensal: R$ 290,00 / mês
- Valor Anual: R$ 2.900,00 / ano (Equivalente a R$ 241,66/mês — 2 Meses Grátis)
- Recursos: Até 3 operadores, Core ERP completo, PDV Rápido, Pedidos 1-Click, Contratos, Boletos/PIX dinâmico, NFS-e, DRE em tempo real e Central WhatsApp com régua automática (D-3, D0, D+3).
- Link de Assinatura: https://orbesystems.com.br/assinar

2. PLANO INHO PRO + ORBRICK-IA (Médias Empresas, Clínicas e Mercados — SELO MAIS POPULAR):
- Valor Mensal: R$ 590,00 / mês
- Valor Anual: R$ 5.900,00 / ano (Equivalente a R$ 491,66/mês — 2 Meses Grátis)
- Recursos: Até 8 operadores com RBAC, Alçada Dual-Control (acima de R$ 5.000), OrBrick-IA Ativa no WhatsApp com resposta assistida e Kill-Switch, Treinamento RAG com upload de PDF/DOCX (até 25 diretrizes), Inteligência Preditiva CBM (Score de Churn, LTV e Matriz RFM), Copilot do Operador e suporte à Maquininha Física Stripe Terminal.
- Link de Assinatura: https://orbesystems.com.br/assinar

3. PLANO INHO ENTERPRISE & CORPORATIVO (Grandes Empresas, Redes, Franquias e Negócios em Escala — PADRÃO EXECUTIVO OURO):
- Valor Mensal: R$ 990,00 / mês
- Valor Anual: R$ 9.900,00 / ano (Equivalente a R$ 825,00/mês — 2 Meses Grátis)
- O plano mais completo e robusto da plataforma: ideal para qualquer tipo de negócio que demanda alta escala, múltiplas unidades ou governança corporativa avançada.
- Recursos: 10 a 25 operadores, Governança Corporativa Completa (Multi-Empresas, Quadro Societário, Retenções Fiscais, Informe IRPF/DIRF), Open Finance Oficial (Sicoob/Sicredi/BB/Inter), Diretrizes RAG Ilimitadas com Políticas e Estatuto, Maquininhas de Cartão Stripe Terminal Ilimitadas, Trilha de Auditoria Imutável e Portal do Contador.
- Link de Assinatura: https://orbesystems.com.br/assinar

Diferencial Único: Todas as assinaturas são processadas com segurança criptografada pelo Stripe Checkout e provisionadas instantaneamente.`
  },
  {
    id: 'prod-inho-mercados-terminal',
    title: 'INHO para Mercados e Afins: PDV Super-Rápido, Balanças e Maquininha Stripe Terminal',
    category: 'produtos',
    tags: [
      'mercado', 'supermercado', 'mercearia', 'hortifruti', 'pdv', 'balanca', 'balança',
      'codigo de barras', 'ean-13', 'maquininha', 'stripe terminal', 'smart pos', 'cartao', 'presencial'
    ],
    content: `O INHO possui módulo especializado para Mercados, Supermercados, Mercearias, Hortifrutis e Empórios:
- PDV Frente de Caixa de Alta Velocidade: Compatível com leitor óptico USB/Bluetooth de código de barras (EAN-13, EAN-8).
- Leitura Automática de Etiquetas de Balança: Decodifica peso e preço diretamente no caixa (padrão nacional iniciado em 2).
- Maquininha de Cartão Física Stripe Terminal: Conexão direta com Smart POS no balcão (BBPOS WisePOS E e Stripe Reader S700 via Wi-Fi). O operador clica no PDV, o valor aparece no visor da maquininha, o cliente aproxima/insere o cartão e a venda aprova na hora!
- Copilot do Operador: IA no caixa que busca preços por voz/texto, sugere cross-sell inteligente (ex: carne -> carvão/sal) e previne perdas por validade de perecíveis.`
  },
  {
    id: 'manual-01-sso-jwt',
    title: 'Manual 01: Autenticação SSO e Payload JWT (Orbe Hub)',
    category: 'seguranca',
    tags: ['sso', 'jwt', 'sub', 'uuid', 'email', 'auth', 'tokens', 'public.users', 'asyncpg'],
    content: `O Orbe Systems Hub atua como Master Identity Provider (SSO). Ele assina tokens JWT injetando um UUID nativo no claim 'sub' (que reflete o ID principal em public.users).
A extração polimórfica em security/auth.py testa se o subject é um UUID válido via uuid.UUID(email). Se for UUID, busca diretamente por User.id; se for email legado, busca por User.email.`
  },
  {
    id: 'manual-02-modelagem-uuid',
    title: 'Manual 02: Modelagem de Dados, UUIDs e Relacionamentos SQLAlchemy',
    category: 'arquitetura',
    tags: ['uuid', 'banco', 'postgres', 'sqlalchemy', 'varchar', 'business_operators', 'public.users', 'multi-schema'],
    content: `Em nossa arquitetura multi-schema, os usuários mestres residem em public.users com chave primária UUID nativa.
Todas as colunas referenciais (user_id, business_id) são tipadas estritamente como UUID no PostgreSQL, garantindo integridade referencial máxima.`
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
Gerenciamento Remoto: Deploy automatizado via rebuild_aws_inho.py e AWS Systems Manager (SSM).`
  },
  {
    id: 'manual-04-orbe-admin',
    title: 'Manual 04: Autenticação Orbe Admin e RBAC',
    category: 'seguranca',
    tags: ['admin', 'login', 'rbac', 'bcrypt', 'rate limit', 'brute force', 'super admin', 'audit'],
    content: `O painel Orbe Admin (/admin/login) gerencia permissões críticas do ecossistema.
A autenticação utiliza hash bcrypt com salt dinâmico e proteção contra ataques de força bruta com rate limiting rigoroso e bloqueio por IP.`
  },
  {
    id: 'prod-inho-erp',
    title: 'Produto: INHO Business Engine & OrBrick (ERP Multi-Tenant + Central WhatsApp)',
    category: 'produtos',
    tags: ['inho', 'erp', 'orbrick', 'whatsapp', 'pix', 'faturamento', 'dre', 'multi-tenant', 'baileys'],
    content: `O INHO Business Engine é o sistema de gestão corporativa da Orbe Systems para empresas, cooperativas e mercados.
Recursos Centrais:
- Conciliação PIX instantânea (< 1s) integrada ao Open Finance BACEN
- Emissão fiscal e DRE em tempo real
- Central WhatsApp OrBrick: Robô integrado via Baileys (porta 3001) para atendimento automatizado, régua de cobrança preventiva (D-3, D0, D+3) e sincronização com a base de sócios/cooperados.
- Planos a partir de R$ 290/mês disponíveis em https://orbesystems.com.br/assinar.`
  },
  {
    id: 'prod-orbe-cleaner',
    title: 'Produto: Orbe Cleaner V4 (Hardware & NVMe Optimization)',
    category: 'produtos',
    tags: ['cleaner', 'nvme', 'ssd', 'hardware', 'otimizacao', 'cache', 'trim'],
    content: `O Orbe Cleaner V4 é uma suíte de otimização de baixo nível para discos de alta performance NVMe/SSD, eliminando caches temporários órfãos e executando instruções TRIM otimizadas.`
  },
  {
    id: 'prod-audio-visual-studio',
    title: 'Produto: Orbe Music (DAW Engine) & Visual Studio',
    category: 'produtos',
    tags: ['music', 'daw', 'audio', 'visual studio', 'webgl', 'dsp', '48khz', 'glsl', 'shaders'],
    content: `Plataforma de computação criativa baseada na web: motor DSP a 48kHz em Web Audio API e motor de shaders WebGL/GLSL para computação gráfica interativa.`
  }
];
