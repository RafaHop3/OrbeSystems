import { ORBE_KNOWLEDGE_CHUNKS, RagChunk } from './ragKnowledgeBase';

const STOPWORDS_PT = new Set([
  'a', 'o', 'as', 'os', 'um', 'uma', 'uns', 'umas', 'de', 'do', 'da', 'dos', 'das',
  'em', 'no', 'na', 'nos', 'nas', 'por', 'pela', 'pelo', 'com', 'sem', 'que', 'se',
  'para', 'como', 'qual', 'quais', 'onde', 'quando', 'quem', 'porque', 'por que',
  'e', 'ou', 'mas', 'sobre', 'este', 'esta', 'isso', 'esse', 'essa', 'voce', 'tu',
  'ele', 'ela', 'me', 'meu', 'minha', 'seu', 'sua', 'nosso', 'nossa', 'fazer',
  'faz', 'tem', 'ter', 'esta', 'ser', 'sao', 'foi', 'pode'
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_\-\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 1 && !STOPWORDS_PT.has(token));
}

export interface RagSearchResult {
  chunk: RagChunk;
  score: number;
}

/**
 * Motor de Busca Semântica
 */
export function retrieveKnowledge(query: string, topK: number = 3): RagSearchResult[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) {
    const fallbackChunk = ORBE_KNOWLEDGE_CHUNKS.find(c => c.id === 'prod-imortal-z3') || ORBE_KNOWLEDGE_CHUNKS[0];
    return [{ chunk: fallbackChunk, score: 1.0 }];
  }

  const scoredResults: RagSearchResult[] = ORBE_KNOWLEDGE_CHUNKS.map(chunk => {
    let score = 0;
    const contentTokens = tokenize(chunk.content);
    const titleTokens = tokenize(chunk.title);
    const tagTokens = chunk.tags.map(t => tokenize(t)).flat();

    const contentTokenSet = new Set(contentTokens);
    const titleTokenSet = new Set(titleTokens);
    const tagTokenSet = new Set(tagTokens);

    for (const token of queryTokens) {
      if (titleTokenSet.has(token)) score += 4.0;
      if (tagTokenSet.has(token)) score += 3.0;
      if (contentTokenSet.has(token)) {
        const count = contentTokens.filter(t => t === token).length;
        score += 1.0 + Math.log(1 + count);
      }
      for (const tag of tagTokenSet) {
        if (tag.includes(token) || token.includes(tag)) {
          score += 1.5;
        }
      }
    }

    return { chunk, score };
  });

  scoredResults.sort((a, b) => b.score - a.score);
  const filtered = scoredResults.filter(r => r.score > 0);
  if (filtered.length === 0) {
    return [{ chunk: ORBE_KNOWLEDGE_CHUNKS[0], score: 0.5 }];
  }
  return filtered.slice(0, topK);
}

/**
 * Explicações Humanizadas e Acessíveis para Leigos
 * Transforma termos áridos de manuais de engenharia em valor claro e inteligível.
 */
function getHumanFriendlyExplanation(chunkId: string): string {
  switch (chunkId) {
    case 'manual-01-sso-jwt':
      return `🔑 **O que é e como funciona:**\n` +
        `Imagine que o sistema de login da Orbe Systems funciona como um **crachá digital único** para toda a empresa. Em vez de você criar uma senha para cada ferramenta, você entra uma única vez e tem acesso a tudo com segurança máxima.\n\n` +
        `💡 **Por que isso é bom para você:**\n` +
        `Nossos servidores foram calibrados para reconhecer esse crachá digital de forma instantânea. Isso evita que sua sessão caia no meio do trabalho e garante que ninguém consiga falsificar o seu acesso.`;

    case 'manual-02-modelagem-uuid':
      return `🗂️ **O que é e como funciona:**\n` +
        `Para garantir que nenhuma informação da sua empresa se perca ou se misture, cada cliente, pedido ou fatura recebe um código de identidade único no mundo (chamado **UUID**). É como se fosse um 'CPF digital' impossível de ser duplicado.\n\n` +
        `💡 **Por que isso é bom para você:**\n` +
        `Mesmo que o sistema processe milhões de operações ao mesmo tempo, suas faturas e dados de clientes nunca vão se cruzar com os de outra pessoa. É organização e segurança absoluta no banco de dados.`;

    case 'manual-03-deploy-ec2':
      return `☁️ **O que é e como funciona:**\n` +
        `Nossos sistemas ficam hospedados na **Amazon Web Services (AWS)** em servidores de alta potência e disponibilidade. Cada serviço roda dentro de um compartimento protegido (chamado container Docker) — como gavetas blindadas separadas.\n\n` +
        `💡 **Por que isso é bom para você:**\n` +
        `Se o módulo de WhatsApp precisar de uma atualização rápida, por exemplo, o restante do sistema financeiro continua funcionando perfeitamente sem sair do ar nem travar para os usuários.`;

    case 'manual-04-orbe-admin':
      return `🛡️ **O que é e como funciona:**\n` +
        `É a nossa 'sala de controle' com segurança reforçada. As senhas são protegidas com criptografia matemática avançada e o sistema conta com alarmes contra tentativas insistentes de invasão.\n\n` +
        `💡 **Por que isso é bom para você:**\n` +
        `Cada membro da sua equipe só enxerga o que precisa para o trabalho dele (por exemplo, a área financeira vê cobranças, enquanto operadores veem os atendimentos), mantendo dados sigilosos sempre resguardados.`;

    case 'manual-05-mapa-repositorios-orbrick':
      return `📱 **O que é e como funciona:**\n` +
        `É a ponte que conecta o seu sistema de gestão diretamente ao **WhatsApp dos seus clientes ou cooperados**. Quando um novo cliente é cadastrado ou uma fatura é gerada, a central de mensagens já sabe exatamente para quem avisar.\n\n` +
        `💡 **Por que isso é bom para você:**\n` +
        `Economiza horas de trabalho manual de cobrança e atendimento, enviando lembretes educados e automáticos com recibos e códigos PIX direto no celular do cliente.`;

    case 'manual-06-regras-orbrick-rbac':
      return `🔒 **O que é e como funciona:**\n` +
        `É o isolamento absoluto entre empresas. Se duas cooperativas ou empresas diferentes usam a plataforma da Orbe Systems, nenhuma delas consegue sequer saber que a outra existe dentro do sistema.\n\n` +
        `💡 **Por que isso é bom para você:**\n` +
        `Seus dados, clientes e valores financeiros ficam 100% blindados em um cofre exclusivo da sua empresa, sem risco de vazamentos para terceiros.`;

    case 'manual-07-plano-testes-e2e':
    case 'manual-08-homologacao-openfinance':
      return `🏦 **O que é e como funciona:**\n` +
        `Nossa plataforma é integrada aos padrões oficiais do **Banco Central do Brasil (BACEN)** para o Open Finance e passa por mais de 26 testes rigorosos de segurança antes de qualquer atualização entrar no ar.\n\n` +
        `💡 **Por que isso é bom para você:**\n` +
        `Garante que seus pagamentos e transferências via PIX caiam em **menos de 1 segundo**, com a mesma confiabilidade e proteção jurídica de um grande banco.`;

    case 'prod-imortal-z3':
      return `⚡ **O que é e como funciona:**\n` +
        `O **IMORTAL** é uma tecnologia de ponta criada pela Orbe Systems que usa um provador matemático da Microsoft (o Z3) para **provar que um código de computador é à prova de falhas**.\n\n` +
        `💡 **Por que isso é bom para você:**\n` +
        `Sabe quando um sistema trava, dá tela azul ou divide por zero? O IMORTAL calcula matematicamente todas as possibilidades antes do programa rodar, garantindo que máquinas, sensores e sistemas críticos nunca travem.`;

    case 'prod-ghost-engine':
      return `👻 **O que é e como funciona:**\n` +
        `O **Ghost Engine** é uma ferramenta de proteção à sua privacidade na internet. Ele localiza seus dados pessoais (como CPF, telefone e endereço) em empresas que vendem cadastros (databrokers) e exige que eles apaguem tudo com base na **Lei Geral de Proteção de Dados (LGPD)**.\n\n` +
        `💡 **Por que isso é bom para você:**\n` +
        `Reduz drasticamente ligações indesejadas de telemarketing, tentativas de golpes e protege a sua identidade digital com respaldo jurídico dos Artigos 7º e 18º da LGPD.`;

    case 'prod-inho-erp':
      return `💼 **O que é e como funciona:**\n` +
        `O **INHO** é o sistema de gestão empresarial da Orbe Systems, feito para descomplicar a rotina de quem empreende ou administra cooperativas.\n\n` +
        `💡 **Por que isso é bom para você:**\n` +
        `Ele calcula seu fluxo de caixa em tempo real, gera notas fiscais, emite cobranças por PIX com conciliação automática na hora e ainda avisa os clientes com elegância pelo WhatsApp.`;

    case 'prod-orbe-cleaner':
      return `🚀 **O que é e como funciona:**\n` +
        `O **Orbe Cleaner V4** é um otimizador de alta performance para o seu computador. Ele limpa lixos temporários e organiza o disco SSD de forma inteligente.\n\n` +
        `💡 **Por que isso é bom para você:**\n` +
        `Deixa o computador mais rápido e leve para trabalhar, sem desgastar o disco nem apagar arquivos importantes seus.`;

    case 'prod-audio-visual-studio':
      return `🎵 **O que é e como funciona:**\n` +
        `São os nossos estúdios criativos que funcionam diretamente no navegador: o **Orbe Music** (para criar e mixar músicas com qualidade de estúdio) e o **Visual Studio** (para criar animações e efeitos visuais 3D impressionantes sem precisar instalar programas pesados).`;

    default:
      return '';
  }
}

/**
 * Sintetizador RAG Humanizado e Acessível para Leigos
 */
export function synthesizeRagResponse(
  query: string,
  retrieved: RagSearchResult[],
  currentDateTime: string
): { text: string; sources: Array<{ title: string; id: string }> } {
  const topResult = retrieved[0];
  const qLower = query.toLowerCase();

  const sources = retrieved.map(r => ({
    title: r.chunk.title,
    id: r.chunk.id
  }));

  // Saudações humanizadas
  if (qLower.includes('ola') || qLower.includes('olá') || qLower.includes('oi') || qLower.includes('bom dia') || qLower.includes('boa tarde') || qLower.includes('boa noite')) {
    return {
      text: `Olá! É um prazer falar com você. 😊\n\n` +
        `Eu sou o **Orbe Assistant**, o assistente inteligente da Orbe Systems. Estou aqui para te explicar tudo sobre nossos sistemas, ferramentas e segurança de um jeito fácil e sem complicações.\n\n` +
        `Você quer saber mais sobre algum dos nossos produtos (como o **IMORTAL**, o **Ghost Engine** ou o **ERP INHO**) ou precisa tirar alguma dúvida técnica? É só me falar!`,
      sources: []
    };
  }

  // Data e hora
  if (qLower.includes('hora') || qLower.includes('hoje') || qLower.includes('dia') || qLower.includes('data')) {
    return {
      text: `Hoje é **${currentDateTime}**. Tudo por aqui está funcionando perfeitamente e seguro! Em que posso te ajudar agora?`,
      sources: []
    };
  }

  // Se encontramos um documento com boa pontuação, usamos a explicação humanizada
  if (topResult.score > 0.8) {
    const chunk = topResult.chunk;
    const humanExplanation = getHumanFriendlyExplanation(chunk.id);

    let responseText = '';
    if (humanExplanation) {
      responseText = `Entendido! Vamos falar sobre isso de um jeito simples e direto:\n\n${humanExplanation}`;
    } else {
      responseText = `Aqui está uma explicação simples sobre **${chunk.title.split(':')[0]}**:\n\n${chunk.content}`;
    }

    // Se houver um segundo tópico correlato com boa aderência
    if (retrieved.length > 1 && retrieved[1].score >= 2.5) {
      const secondExplanation = getHumanFriendlyExplanation(retrieved[1].chunk.id);
      if (secondExplanation) {
        responseText += `\n\n---\n📌 **E tem mais um ponto importante (${retrieved[1].chunk.title.split(':')[0]}):**\n${secondExplanation}`;
      }
    }

    return { text: responseText, sources };
  }

  // Visão geral amigável
  return {
    text: `Que ótima pergunta! A **Orbe Systems** é especialista em criar softwares rápidos, seguros e inteligentes. Nossas principais soluções incluem:\n\n` +
      `• **⚡ IMORTAL**: Garante matematicamente que softwares e equipamentos nunca travem ou cometam erros de cálculo.\n` +
      `• **👻 Ghost Engine**: Protege sua privacidade e remove seus dados pessoais de empresas de telemarketing sob a LGPD.\n` +
      `• **💼 INHO Business & WhatsApp**: Nosso sistema de gestão empresarial com PIX em 1 segundo e cobrança amigável no WhatsApp.\n` +
      `• **🚀 Orbe Cleaner**: Acelera o computador e limpa o armazenamento sem risco.\n\n` +
      `Sobre qual desses assuntos você gostaria de saber mais em detalhes?`,
    sources: []
  };
}
