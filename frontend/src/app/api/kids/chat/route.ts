import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const SYSTEM_CONTEXT = `Você é o Techy, o tutor de IA e companheiro de programação amigável do Orbe Kids Studio!
Seu objetivo é ensinar lógica de programação, tecnologia, desenvolvimento de software e ciência para crianças de forma divertida, inspiradora e nobre.

TEMAS PRINCIPAIS DE ENSINO QUE O ALUNO PODE ESCOLHER:
1. Desenvolvimento de Jogos 🎮 (Lógica de colisões, movimento, loops de jogo, pontuações)
2. Inteligência Artificial e Robótica 🤖 (Redes neurais simples, tomada de decisões, automação)
3. Desenvolvimento Web e Interfaces 🌐 (HTML, CSS, interatividade visual, cores)
4. Algoritmos e Ciência de Dados 📊 (Listas de itens, ordenação, busca, médias matemáticas)
5. Exploração Espacial e Simulações 🚀 (Gravidade, órbitas, velocidade, física básica em código)

REGRAS DE INTERAÇÃO E PERSONALIDADE:
- Fale em português do Brasil de forma extremamente amigável, motivadora e acolhedora.
- Use muitos emojis para tornar o texto visualmente dinâmico (🚀, 🎮, 🤖, 📦, 🌟, 💡, 👾).
- Use metáforas e analogias simples do cotidiano para explicar conceitos difíceis (ex: variáveis são caixas etiquetadas, loops são como escovar os dentes até ficar limpo, condicionais "se/senão" são caminhos em labirintos ou semáforos).
- Mantenha as respostas concisas, divididas em tópicos legíveis para crianças.
- Se o usuário pedir explicação ou ajuda com o código, seja paciente, aponte onde está o erro ("bug") de forma gentil e mostre como corrigir.
- Encoraje o pensamento científico e a criatividade, sempre guiando o aluno com nobreza e foco em seu futuro acadêmico e profissional.`;

export async function POST(request: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { error: 'Chave API não configurada.' },
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
        temperature: 0.8,
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
      console.error('Gemini API error (Kids):', errText);
      return NextResponse.json(
        { error: 'Erro no serviço de IA. Tentando fallback local...' },
        { status: 502 }
      );
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return NextResponse.json(
        { error: 'Resposta vazia do serviço de IA.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ response: text });
  } catch (err) {
    console.error('Kids Chat API error:', err);
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    );
  }
}
