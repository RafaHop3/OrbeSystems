import { NextRequest, NextResponse } from 'next/server';

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
const HF_ROUTER_URL = "https://router.huggingface.co/v1/chat/completions";

// Contingência inteligente da Orbe Systems (Knowledge Fallback Engine)
function generateOrbeFallbackResponse(userMessage: string, currentDateTime: string): string {
  const msg = userMessage.toLowerCase();

  if (msg.includes('hora') || msg.includes('hoje') || msg.includes('dia') || msg.includes('data')) {
    return `Olá! Hoje é ${currentDateTime}. Como posso auxiliar na arquitetura dos seus sistemas ou ferramentas Orbe?`;
  }

  if (msg.includes('imortal') || msg.includes('z3') || msg.includes('reversa') || msg.includes('prova')) {
    return `O **IMORTAL** é o motor de verificação formal da Orbe Systems. Ele combina descompilação de bytecode, análise de invariantes com o provador de teoremas Z3 (SMT) e provas matemáticas para assegurar que nenhum edge case de segurança passe desapercebido. Acesse o menu Ferramentas Premium para mais detalhes.`;
  }

  if (msg.includes('ghost') || msg.includes('lgpd') || msg.includes('remover') || msg.includes('optout') || msg.includes('opt-out')) {
    return `O **Ghost Engine** automatiza requisições de opt-out e exclusão de dados pessoais com base nos Artigos 7º e 18º da LGPD em databrokers e birôs de crédito com chaves de criptografia simétrica MultiFernet KMS de ponta a ponta.`;
  }

  if (msg.includes('cleaner') || msg.includes('otimiz') || msg.includes('hardware') || msg.includes('nvme')) {
    return `O **Orbe Cleaner V4** é nossa suíte de higienização de cache e otimização profunda para armazenamento NVMe/SSD, eliminando fragmentação de arquivos temporários e liberando throughput no sistema operacional.`;
  }

  if (msg.includes('inho') || msg.includes('erp') || msg.includes('pix') || msg.includes('fiscal') || msg.includes('dre')) {
    return `O **INHO Business Engine** é o ERP corporativo multi-tenant da Orbe Systems. Ele provê conciliação PIX instantânea (< 1s), emissão fiscal automatizada, relatórios DRE em tempo real e automação de cobrança integrada com a Central WhatsApp OrBrick. Acesse https://inho.orbesystems.com.br para conhecer.`;
  }

  if (msg.includes('preço') || msg.includes('valor') || msg.includes('assin') || msg.includes('plano')) {
    return `Nossos produtos contam com camadas gratuitas de demonstração técnica e planos corporativos dedicados. Para consultar os planos ativos ou assinar uma licença, acesse a página de Assinaturas (/assinar) ou fale diretamente com a equipe técnica da Orbe Systems.`;
  }

  if (msg.includes('contato') || msg.includes('suporte') || msg.includes('email') || msg.includes('falar')) {
    return `Você pode entrar em contato com o time de engenharia da Orbe Systems através do e-mail oficial: suporte@orbesystems.com.br ou pelo portal administrativo.`;
  }

  return `Sou o **Orbe Assistant**, o assistente técnico da Orbe Systems. Posso orientá-lo sobre nossa infraestrutura de cibersegurança, produtos premium (IMORTAL, Ghost Engine, Orbe Cleaner, INHO ERP) e arquitetura de sistemas de alta performance. Como posso ajudar com sua demanda hoje?`;
}

export async function POST(request: NextRequest) {
  try {
    const currentDateTime = new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'full',
      timeStyle: 'long',
      timeZone: 'America/Sao_Paulo'
    }).format(new Date());

    const dynamicSystemContext = `Você é o Orbe Assistant, um assistente de IA hiper-inteligente da Orbe Systems (uma empresa de engenharia de software de alto nível e cibersegurança).
Fale de forma estritamente profissional, técnica, direta e em português do Brasil. Sem rodeios.
⚠️ INFORMAÇÃO CRÍTICA DE TEMPO: A data/hora exata de hoje é ${currentDateTime}. Use essa data se o usuário perguntar o dia atual; NUNCA alucine datas passadas.
Sobre a Orbe Systems: Nós operamos os produtos premium IMORTAL (Engenharia Reversa e Provas Formais Z3), Ghost Engine (LGPD), INHO ERP, Orbe Cleaner e PowerShell Shield Bot.
Diretrizes: 
- Forneça respostas concisas e certeiras.
- Não invente preços ou invente regras de negócios falsas.`;

    const body = await request.json();
    const { messages } = body as { messages: Array<{ role: string; content: string }> };

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Formato inválido.' }, { status: 400 });
    }

    const lastUserMessage = messages[messages.length - 1]?.content || '';
    let aiResponseText = '';

    // Se houver chave Hugging Face, tenta a chamada com timeout defensivo
    if (HUGGINGFACE_API_KEY) {
      try {
        const payloadMessages = [
          { role: 'system', content: dynamicSystemContext },
          ...messages
        ];

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 9000);

        const response = await fetch(HF_ROUTER_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: "Qwen/Qwen2.5-72B-Instruct",
            messages: payloadMessages,
            max_tokens: 350,
            temperature: 0.7
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          aiResponseText = data.choices?.[0]?.message?.content || '';
        } else {
          console.warn(`[Orbe Chat] HF Router responded with status ${response.status}. Falling back to internal engine.`);
        }
      } catch (err) {
        console.warn('[Orbe Chat] HF request failed or timed out:', err);
      }
    }

    // Se a API externa falhou, ficou sem créditos ou deu timeout, usa o Fallback Engine local
    if (!aiResponseText) {
      aiResponseText = generateOrbeFallbackResponse(lastUserMessage, currentDateTime);
    }

    // Firebase/Backend fire-and-forget log sync for /admin dashboard
    const BACKEND_URL = (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
    if (BACKEND_URL) {
      fetch(`${BACKEND_URL}/api/admin/chat-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_message: lastUserMessage,
          ai_response: aiResponseText
        })
      }).catch(e => console.error("Failed to push chat log:", e));
    }

    return NextResponse.json({ response: aiResponseText });
  } catch (err) {
    console.error('[Orbe Chat] Unexpected error:', err);
    return NextResponse.json({ 
      response: 'Olá! O Orbe Assistant está ativo. Em que podemos auxiliar sua empresa hoje?' 
    });
  }
}
