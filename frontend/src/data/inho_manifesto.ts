// Conteúdo do manifesto INHO: fonte única para a home (versão curta) e para a página /inho (texto integral).

export interface ManifestoStage {
  numeral: string;
  title: string;
  heading: string;
  line: string;
  keywords: string[];
  paragraphs: string[];
}

export const MANIFESTO_STAGES: ManifestoStage[] = [
  {
    numeral: 'I',
    title: 'A Raiz',
    heading: 'Tudo num só lugar: Cooperativas & PMEs',
    line: 'Financeiro, comercial, atendimento omnichannel, quadro social e pessoas reunidos numa única plataforma.',
    keywords: ['ERP em nuvem', 'Cooperativas & PMEs', 'Quadro Social', 'Multiempresa UUID'],
    paragraphs: [
      'Toda empresa começa com uma promessa: vender, receber, crescer e cuidar de quem está ao lado. Mas no meio do caminho aparecem as planilhas soltas, os boletos esquecidos, as mensagens perdidas e o caixa que não fecha.',
      'O INHO nasceu para juntar tudo isso. É uma plataforma de gestão empresarial em nuvem, feita para cooperativas, pequenas e médias empresas e negócios de impacto social, com gestão de quadro social, cotas e onboarding em poucos minutos.',
    ],
  },
  {
    numeral: 'II',
    title: 'O Tronco',
    heading: 'Um financeiro que não dorme: PIX & Dual-Control',
    line: 'PIX com QR Code dinâmico, conciliação Open Finance, Sobras de cooperados e alçada dupla em despesas > R$ 5.000.',
    keywords: ['PIX Instantâneo', 'Open Finance BACEN', 'Dual-Control > R$ 5k', 'Informe IRPF/DIRF', 'Conciliação Webhook'],
    paragraphs: [
      'No INHO o dinheiro tem caminho. As faturas com PIX já nascem com QR Code, as contas a pagar e a receber se organizam sozinhas, as recorrências se repetem no tempo certo e o fechamento mensal protege o que já foi contabilizado.',
      'Quando um pagamento chega, a conciliação bancária automática, feita por webhook bancário e preparada para o Open Finance Brasil, confere tudo e dá baixa sem digitação. Os valores altos pedem governança de alçada: o controle duplo de aprovação bloqueia despesas acima do teto sem autorização prévia. E para os cooperados, o sistema calcula e emite o Informe Anual de Rendimentos IRPF/DIRF com valores reais de sobras, INSS, IRRF e FATES.',
    ],
  },
  {
    numeral: 'III',
    title: 'Os Galhos',
    heading: 'Do primeiro contato à venda fechada',
    line: 'No funil Kanban, o cartão "Ganho" vira fatura sozinho: PDV, contratos e pedidos com 1 clique.',
    keywords: ['CRM Comercial', 'Funil Kanban', 'PDV & Faturamento', 'Contratos', 'Régua Multicanal'],
    paragraphs: [
      'O CRM guarda clientes, fornecedores, colaboradores e cooperados com o cuidado de quem conhece cada um pelo nome. No funil de vendas em Kanban, cada negociação é um cartão que avança; ao chegar em "Ganho", a fatura é gerada sozinha.',
      'Ao digitar um CNPJ ou CEP, os dados aparecem prontos, e se uma fonte de consulta falha, outra assume. Há ainda PDV, pedidos de venda faturáveis em 1 clique, contratos com cronograma financeiro e relatórios executivos para decidir com números na mão.',
    ],
  },
  {
    numeral: 'IV',
    title: 'As Folhas',
    heading: 'OrBrick-IA: WhatsApp Omnichannel com RAG & Regulamento Próprio',
    line: 'A IA aprende as regras da sua empresa com RAG multi-tenant, atende em chat bidirecional, oferece resposta assistida e nunca dá baixa em fatura sozinha.',
    keywords: ['WhatsApp Omnichannel', 'OrBrick-IA RAG', 'Regulamento Próprio', 'Chat Bidirecional', 'Handoff Humano', 'Anti-Injection', 'Kill-Switch'],
    paragraphs: [
      'O OrBrick é a central omnichannel de atendimento e cobrança pelo WhatsApp conectada diretamente ao motor de IA da Orbe Systems. A régua automática lembra antes do vencimento, avisa no dia e acompanha depois, sempre no momento certo.',
      'Com a base RAG multi-tenant, cada contratante treina a IA com o regulamento do seu próprio negócio ou carrega o modelo padrão de cooperativa com 1 clique, garantindo respostas exatas e seguras com isolamento estrito por empresa. Na Central WhatsApp, o chat bidirecional separa mensagens do cliente de respostas da IA e do operador humano, contando com Handoff ("Assumir Atendimento" e "Devolver para IA"), Resposta Assistida inteligente, Botão de Pânico (Kill-Switch) e filtro anti-prompt injection em tempo real.',
    ],
  },
  {
    numeral: 'V',
    title: 'O Fruto',
    heading: 'Entender o cliente antes que ele vá embora: CBM Preditivo',
    line: 'Análise RFM, sazonalidade, radar de churn e LTV monetário disparam ações comerciais no tempo certo.',
    keywords: ['CBM Preditivo', 'Análise RFM', 'Radar de Churn', 'LTV Monetário', 'Campanhas Multicanal'],
    paragraphs: [
      'O módulo CBM, de inteligência de comportamento do cliente, observa o que as planilhas não mostram: há quanto tempo o cliente não compra (Recência), com que frequência volta (Frequência) e quanto já confiou no seu negócio (o LTV Monetário).',
      'Com a análise RFM preditiva, a leitura de sazonalidade (safra, mês, trimestre) e o radar de risco de evasão, o INHO sugere a ação certa para cada perfil e dispara campanhas multicanal por WhatsApp, e-mail e SMS para reter clientes e cooperados.',
    ],
  },
  {
    numeral: 'VI',
    title: 'A Terra',
    heading: 'Segurança, Isolamento Lateral & Privacidade LGPD',
    line: 'O jardim de cada empresa é só dela: PostgreSQL RLS no banco de dados, criptografia AES-256 e LGPD Art. 18.',
    keywords: ['PostgreSQL RLS', 'Isolamento Multi-Tenant', 'LGPD Art. 18', 'Criptografia AES-256', 'HMAC-SHA256'],
    paragraphs: [
      'O isolamento multiempresa impede que os dados ou regras de conhecimento de uma cooperativa se misturem aos de outra. A segurança em nível de linha no banco (PostgreSQL Row-Level Security) e os identificadores únicos (UUID) garantem que nenhuma consulta cruze fronteiras entre clientes.',
      'As conversas sensíveis são guardadas com criptografia AES-256, as mensagens entre sistemas recebem assinatura digital (HMAC) e cada ação fica numa trilha de auditoria imutável. Quando alguém pede para ser esquecido, o INHO respeita, como manda o Artigo 18 da LGPD: o perfil comportamental é expurgado e o histórico é anonimizado.',
    ],
  },
  {
    numeral: 'VII',
    title: 'O Clima',
    heading: 'Motor Orbe AI Unificado & Telemetria Ultrarrápida',
    line: 'Conectado ao cérebro Orbe AI (Gemini Flash + Qwen2.5-72B), resposta em < 500ms e plano B automático.',
    keywords: ['Motor Orbe AI', 'Gemini & Qwen Cascata', '< 500 ms', 'Fallback Autônomo', 'Telemetria'],
    paragraphs: [
      'A telemetria contínua acompanha cada rota de API, mantendo o tempo de resposta abaixo de meio segundo. O motor de inteligência artificial opera em cascata com Google Gemini Flash, Hugging Face Qwen2.5-72B Instruct e sintetizador RAG autônomo.',
      'Se um serviço externo oscila, há um plano B automático (fallback) e o sistema segue de pé com alta disponibilidade e zero interrupção.',
    ],
  },
  {
    numeral: 'VIII',
    title: 'A Colheita',
    heading: 'A máquina ajuda, quem decide é gente',
    line: 'Tempo devolvido ao empreendedor, cooperados valorizados e decisões humanas fortalecidas por inteligência artificial.',
    keywords: ['Governança Humana', 'Cooperativismo', 'Impacto Social', 'Orbe Systems'],
    paragraphs: [
      'O INHO não é só software. É tempo devolvido a quem empreende, é dinheiro que entra no dia certo e é o cooperado ou cliente que se sente lembrado e respeitado.',
      'É a cooperativa do campo e a empresa da cidade, cada uma com tecnologia de ponta, IA contextual segura e a tranquilidade de saber que a máquina ajuda, mas quem decide é sempre gente.',
    ],
  },
];

export const MANIFESTO_TAGLINE = 'INHO: gestão que pensa, protege e cuida.';

export const MANIFESTO_KEYWORDS = [
  'sistema de gestão empresarial',
  'ERP para cooperativas',
  'ERP para pequenas empresas',
  'OrBrick-IA',
  'RAG multi-tenant',
  'regulamento próprio',
  'treinamento de IA',
  'chat bidirecional WhatsApp',
  'handoff humano',
  'resposta assistida IA',
  'botão de pânico kill-switch',
  'cobrança automática por WhatsApp',
  'PIX com QR Code',
  'conciliação bancária automática',
  'Open Finance Brasil',
  'alçada dual-control',
  'informe IRPF DIRF',
  'quadro social de cooperados',
  'funil de vendas Kanban',
  'inteligência artificial segura',
  'anti-prompt injection',
  'CBM preditivo',
  'análise RFM',
  'previsão de churn',
  'PostgreSQL RLS',
  'motor Orbe AI',
  'LGPD Art. 18',
  'direito ao esquecimento',
  'multiempresa UUID',
  'trilha de auditoria',
  'gestão de cooperados',
  'INHO',
  'OrBrick',
  'Orbe Systems',
];
