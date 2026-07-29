import { NextRequest, NextResponse } from 'next/server';

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
const HF_API_URL = "https://router.huggingface.co/v1/chat/completions";

export async function POST(request: NextRequest) {
  if (!HUGGINGFACE_API_KEY) {
    return NextResponse.json(
      { error: 'Chave API não configurada. Configure HUGGINGFACE_API_KEY.' },
      { status: 500 }
    );
  }

  try {
    const currentDateTime = new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'full',
      timeStyle: 'long',
      timeZone: 'America/Sao_Paulo'
    }).format(new Date());

    const dynamicSystemContext = `Você é o Orbe Assistant, um assistente de IA hiper-inteligente da Orbe Systems (uma empresa de engenharia de software de alto nível e cibersegurança).
Fale de forma estritamente profissional, técnica, direta e em português do Brasil. Sem rodeios.
⚠️ INFORMAÇÃO CRÍTICA DE TEMPO: A data/hora exata de hoje é ${currentDateTime}. Use essa data se o usuário perguntar o dia atual; NUNCA alucine datas passadas.
Sobre a Orbe Systems: Nós operamos os produtos premium IMORTAL (Engenharia Reversa e Provas Formais Z3), Imobverse e PowerShell Shield Bot.
Diretrizes: 
- Forneça respostas concisas e certeiras.
- Não invente preços ou invente regras de negócios falsas.`;

    const body = await request.json();
    const { messages } = body as { messages: Array<{ role: string; content: string }> };

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Formato inválido.' }, { status: 400 });
    }

    const payloadMessages = [
      { role: 'system', content: dynamicSystemContext },
      ...messages
    ];

    const response = await fetch(HF_API_URL, {
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
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('HF Error:', err);
      let parsedErr = err;
      try { parsedErr = JSON.parse(err).error || err; } catch (e) { }
      return NextResponse.json({ error: `HF Error: ${parsedErr}` }, { status: 502 });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';

    // Firebase/Backend fire-and-forget log sync for /admin dashboard
    const BACKEND_URL = (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
    if (BACKEND_URL) {
      fetch(`${BACKEND_URL}/api/admin/chat-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_message: messages[messages.length - 1]?.content || '',
          ai_response: text
        })
      }).catch(e => console.error("Failed to push chat log:", e));
    }

    return NextResponse.json({ response: text });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
