import { NextRequest, NextResponse } from 'next/server';

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
const HF_API_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2";

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

    const lastMessage = messages[messages.length - 1].content;
    const prompt = `<s>[INST] ${SYSTEM_CONTEXT}\n\nUsuário: ${lastMessage} [/INST]`;

    const response = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { max_new_tokens: 250, temperature: 0.7 }
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('HF Error:', err);
      return NextResponse.json({ error: 'Erro no Hugging Face' }, { status: 502 });
    }

    const data = await response.json();
    let text = data[0]?.generated_text || '';

    // Mistral returns the prompt + generated text. We must slice out the prompt.
    if (text.includes('[/INST]')) {
      text = text.split('[/INST]')[1].trim();
    }

    return NextResponse.json({ response: text });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
