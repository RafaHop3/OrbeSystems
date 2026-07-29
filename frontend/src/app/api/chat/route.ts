import { NextRequest, NextResponse } from 'next/server';

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
const HF_API_URL = "https://router.huggingface.co/v1/chat/completions";

const SYSTEM_CONTEXT = `Você é o Orbe Assistant, o assistente de IA da Orbe Systems — uma empresa de engenharia de software de alto nível.
Fale de forma profissional em português. Seja extremamente conciso.
Sobre a Orbe: Produtos IMORTAL e Imobverse.
Não invente preços.`;

export async function POST(request: NextRequest) {
  if (!HUGGINGFACE_API_KEY) {
    return NextResponse.json(
      { error: 'Chave API não configurada. Configure HUGGINGFACE_API_KEY.' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { messages } = body as { messages: Array<{ role: string; content: string }> };

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Formato inválido.' }, { status: 400 });
    }

    const payloadMessages = [
      { role: 'system', content: SYSTEM_CONTEXT },
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

    return NextResponse.json({ response: text });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
