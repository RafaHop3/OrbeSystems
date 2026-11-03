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
    heading: 'Tudo num só lugar',
    line: 'Financeiro, comercial, atendimento e pessoas reunidos numa única plataforma.',
    keywords: ['ERP em nuvem', 'Cooperativas', 'PMEs'],
    paragraphs: [
      'Toda empresa começa com uma promessa: vender, receber, crescer e cuidar de quem está ao lado. Mas no meio do caminho aparecem as planilhas soltas, os boletos esquecidos, as mensagens perdidas e o caixa que não fecha.',
      'O INHO nasceu para juntar tudo isso. É uma plataforma de gestão empresarial em nuvem, feita para cooperativas, pequenas e médias empresas e negócios de impacto social.',
    ],
  },
  {
    numeral: 'II',
    title: 'O Tronco',
    heading: 'Um financeiro que não dorme',
    line: 'Cada centavo deixa rastro: PIX com QR Code, conciliação automática e aprovação dupla.',
    keywords: ['PIX', 'Open Finance', 'Conciliação'],
    paragraphs: [
      'No INHO o dinheiro tem caminho. As faturas com PIX já nascem com QR Code, as contas a pagar e a receber se organizam sozinhas, as recorrências se repetem no tempo certo e o fechamento mensal protege o que já foi contabilizado.',
      'Quando um pagamento chega, a conciliação bancária automática, feita por webhook bancário e preparada para o Open Finance Brasil, confere tudo e dá baixa sem digitação. Os valores altos pedem uma segunda assinatura: o controle duplo de aprovação.',
    ],
  },
  {
    numeral: 'III',
    title: 'Os Galhos',
    heading: 'Do primeiro contato à venda fechada',
    line: 'No funil Kanban, o cartão "Ganho" vira fatura sozinho.',
    keywords: ['CRM', 'Funil Kanban', 'PDV'],
    paragraphs: [
      'O CRM guarda clientes, fornecedores, colaboradores e cooperados com o cuidado de quem conhece cada um pelo nome. No funil de vendas em Kanban, cada negociação é um cartão que avança; ao chegar em "Ganho", a fatura é gerada sozinha.',
      'Ao digitar um CNPJ ou CEP, os dados aparecem prontos, e se uma fonte de consulta falha, outra assume. Há ainda PDV, pedidos de venda, contratos, pesquisas de clima e relatórios para decidir com números na mão.',
    ],
  },
  {
    numeral: 'IV',
    title: 'As Folhas',
    heading: 'OrBrick, o WhatsApp que trabalha por você',
    line: 'Cobra com educação e usa uma IA que nunca dá baixa em fatura sozinha.',
    keywords: ['WhatsApp', 'IA segura', 'Anti-injection'],
    paragraphs: [
      'O OrBrick é a central de atendimento e cobrança pelo WhatsApp. A régua automática lembra antes do vencimento, avisa no dia e acompanha depois, sempre no momento certo.',
      'Sua inteligência artificial responde dúvidas, envia a segunda via do PIX e encaminha comprovantes para conferência, mas nunca dá baixa em uma fatura nem concede descontos por conta própria. O filtro antimanipulação (anti-prompt injection) bloqueia pedidos suspeitos em menos de um milésimo de segundo. O botão "Assumir Atendimento" coloca uma pessoa no comando, e o Botão de Pânico desliga a IA em um clique.',
    ],
  },
  {
    numeral: 'V',
    title: 'O Fruto',
    heading: 'Entender o cliente antes que ele vá embora',
    line: 'Análise RFM, sazonalidade e radar de churn sugerem a ação certa para cada perfil.',
    keywords: ['RFM', 'Churn', 'LTV'],
    paragraphs: [
      'O módulo CBM, de inteligência de comportamento do cliente, observa o que as planilhas não mostram: há quanto tempo o cliente não compra, com que frequência volta e quanto já confiou no seu negócio (o LTV).',
      'Com a análise RFM, a leitura de sazonalidade (safra, mês, trimestre) e o radar de risco de evasão, o INHO sugere a ação certa para cada perfil e dispara campanhas multicanal por WhatsApp, e-mail e SMS. É análise preditiva a serviço da relação com o cliente.',
    ],
  },
  {
    numeral: 'VI',
    title: 'A Terra',
    heading: 'Segurança e privacidade de verdade',
    line: 'O jardim de cada empresa é só dela: isolamento, criptografia e LGPD.',
    keywords: ['LGPD Art. 18', 'RLS', 'Criptografia'],
    paragraphs: [
      'O isolamento multiempresa impede que os dados de uma cooperativa se misturem aos de outra. A segurança em nível de linha no banco e os identificadores únicos (UUID) reforçam essa separação.',
      'As conversas sensíveis são guardadas com criptografia, as mensagens entre sistemas recebem assinatura digital (HMAC) e cada ação fica numa trilha de auditoria. Quando alguém pede para ser esquecido, o INHO respeita, como manda o Artigo 18 da LGPD: o perfil comportamental é apagado e o histórico é anonimizado.',
    ],
  },
  {
    numeral: 'VII',
    title: 'O Clima',
    heading: 'Rápido, estável e sempre vigiado',
    line: 'Resposta em menos de meio segundo, plano B automático e testes antes de cada entrega.',
    keywords: ['< 500 ms', 'Fallback', 'Telemetria'],
    paragraphs: [
      'A telemetria contínua acompanha cada rota, porque a meta é responder em menos de meio segundo. Se um serviço externo cai, há um plano B automático (fallback) e o sistema segue de pé, com alta disponibilidade e atualização sem interrupção.',
      'Toda mudança passa por testes automatizados antes de chegar até você, inclusive testes de ataque, de isolamento entre empresas e de falhas simuladas.',
    ],
  },
  {
    numeral: 'VIII',
    title: 'A Colheita',
    heading: 'A máquina ajuda, quem decide é gente',
    line: 'Tempo devolvido a quem empreende e cliente que se sente lembrado, não cobrado.',
    keywords: ['Impacto social', 'Orbe Systems'],
    paragraphs: [
      'O INHO não é só software. É tempo devolvido a quem empreende, é dinheiro que entra no dia certo e é o cliente que se sente lembrado, e não cobrado.',
      'É a cooperativa do campo e o mercado da cidade, cada um com tecnologia de ponta e a tranquilidade de saber que a máquina ajuda, mas quem decide é sempre gente.',
    ],
  },
];

export const MANIFESTO_TAGLINE = 'INHO: gestão que pensa, protege e cuida.';

export const MANIFESTO_KEYWORDS = [
  'sistema de gestão empresarial',
  'ERP para cooperativas',
  'ERP para pequenas empresas',
  'cobrança automática por WhatsApp',
  'PIX com QR Code',
  'conciliação bancária automática',
  'Open Finance Brasil',
  'funil de vendas Kanban',
  'inteligência artificial segura',
  'anti-prompt injection',
  'análise RFM',
  'previsão de churn',
  'LGPD',
  'direito ao esquecimento',
  'multiempresa',
  'trilha de auditoria',
  'gestão de cooperados',
  'INHO',
  'OrBrick',
  'Orbe Systems',
];
