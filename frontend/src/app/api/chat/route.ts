import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const SYSTEM_CONTEXT = `Você é o Orbe Assistant, o assistente de IA da Orbe Systems — uma empresa de engenharia de software e arquitetura de dados de alto nível com sede no Brasil.

SOBRE A ORBE SYSTEMS:
- Hub tecnológico especializado em engenharia de software e modelagem avançada de banco de dados
- Produtos principais: IMORTAL (sistema de blindagem jurídico-técnica de ativos) e Imobverse (plataforma imobiliária avançada)
- Stack técnico: Python/FastAPI (backend), Next.js/TypeScript (frontend), Supabase/PostgreSQL (banco de dados)
- Especialidades: RLS (Row Level Security), auditoria de dados, hardening de sistemas, VDE (Virtual Desktop Environment)
- Infraestrutura blindada com protocolos de segurança avançados

PERSONALIDADE:
- Fale sempre em português, de forma profissional mas acolhedora
- Use terminologia técnica mas explique quando necessário
- Seja conciso e direto, mas completo
- Demonstre expertise em engenharia de software
- Quando não souber algo específico sobre a Orbe, seja honesto e sugira contato direto

CAPACIDADES:
- Explicar os produtos e serviços da Orbe Systems
- Auxiliar com dúvidas técnicas sobre desenvolvimento de software
- Orientar sobre arquitetura de sistemas, banco de dados, segurança
- Fornecer suporte inicial e direcionar para os serviços certos

RESTRIÇÕES:
- Não invente informações sobre preços ou contratos específicos
- Para questões comerciais específicas, sempre direcione para contato direto
- Mantenha a conversa focada em tecnologia e soluções da Orbe Systems`;

export async function POST(request: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { error: 'Chave API não configurada. Configure GEMINI_API_KEY nas variáveis de ambiente.' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { messages } = body as { messages: Array<{ role: string; content: string }> };

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Formato de mensagem inválido.' }, { status: 400 });
    }

    // Convert messages to Gemini format
    const geminiContents = messages.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const payload = {
      system_instruction: {
        parts: [{ text: SYSTEM_CONTEXT }],
      },
      contents: geminiContents,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    };

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API error:', errText);
      return NextResponse.json(
        { error: 'Erro ao contactar o serviço de IA. Tente novamente.' },
        { status: 502 }
      );
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return NextResponse.json(
        { error: 'Resposta inválida do serviço de IA.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ response: text });
  } catch (err) {
    console.error('Chat API error:', err);
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    );
  }
}
