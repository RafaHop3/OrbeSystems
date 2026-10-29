import { NextRequest, NextResponse } from 'next/server';
import { retrieveKnowledge, synthesizeRagResponse } from '@/lib/rag/ragEngine';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
const HF_ROUTER_URL = "https://router.huggingface.co/v1/chat/completions";

export async function POST(request: NextRequest) {
  try {
    const currentDateTime = new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'full',
      timeStyle: 'long',
      timeZone: 'America/Sao_Paulo'
    }).format(new Date());

    const body = await request.json();
    const { messages } = body as { messages: Array<{ role: string; content: string }> };

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Formato inválido.' }, { status: 400 });
    }

    const lastUserMessage = messages[messages.length - 1]?.content || '';

    // =========================================================================
    // ETAPA 1: RAG RETRIEVAL (Recuperação Semântica dos Manuais e Produtos)
    // =========================================================================
    const searchResults = retrieveKnowledge(lastUserMessage, 3);
    const retrievedDocsText = searchResults
      .map(r => `[DOCUMENTO: ${r.chunk.title}]\n${r.chunk.content}\n`)
      .join('\n');

    const sources = searchResults.map(r => ({
      title: r.chunk.title,
      id: r.chunk.id
    }));

    const ragSystemContext = `Você é o Orbe Assistant, o assistente inteligente, empático e amigável da Orbe Systems.
Sua missão principal é explicar os produtos, arquitetura e segurança da empresa de forma TOTALMENTE HUMANIZADA, SIMPLES E ACESSÍVEL PARA LEIGOS.

REGRAS DE OURO DE COMUNICAÇÃO:
1. Tom de voz: Simpático, acolhedor, profissional e direto (em português do Brasil).
2. Proibido jargões áridos: NUNCA responda como um terminal, dump de log ou trecho bruto de código com nomes de colunas ou erros de banco (evite termos como 'asyncpg', 'public.users', 'operator does not exist').
3. Use analogias do cotidiano: Por exemplo, explique login como um crachá digital único, UUIDs como identidades ou CPFs digitais exclusivos, servidores na nuvem como cofres seguros, e o Z3 como um corretor matemático que não deixa o programa travar.
4. Foque no benefício real para o cliente ou empresário: Como isso economiza tempo, traz segurança e evita dor de cabeça.
5. Formatação: Parágrafos curtos, boa pontuação, leitura agradável e emojis elegantes.
⚠️ Data/hora atual: ${currentDateTime}.

--- BASE DE CONHECIMENTO OFICIAL (RAG) ---
${retrievedDocsText}
--- FIM DA BASE DE CONHECIMENTO ---`;

    let aiResponseText = '';

    // =========================================================================
    // ETAPA 2: PROVEDOR 1 - GOOGLE GEMINI FLASH (Se configurado)
    // =========================================================================
    if (GEMINI_API_KEY && !aiResponseText) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
        const contents = [
          { role: 'user', parts: [{ text: ragSystemContext + `\n\nPergunta do Visitante:\n${lastUserMessage}` }] }
        ];

        const resp = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (resp.ok) {
          const geminiData = await resp.json();
          aiResponseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }
      } catch (e) {
        console.warn('[Orbe RAG] Gemini provider skipped:', e);
      }
    }

    // =========================================================================
    // ETAPA 3: PROVEDOR 2 - HUGGING FACE ROUTER (Se configurado)
    // =========================================================================
    if (HUGGINGFACE_API_KEY && !aiResponseText) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const payloadMessages = [
          { role: 'system', content: ragSystemContext },
          ...messages
        ];

        const response = await fetch(HF_ROUTER_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: "Qwen/Qwen2.5-72B-Instruct",
            messages: payloadMessages,
            max_tokens: 450,
            temperature: 0.6
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          aiResponseText = data.choices?.[0]?.message?.content || '';
        }
      } catch (err) {
        console.warn('[Orbe RAG] HF Router skipped or timed out:', err);
      }
    }

    // =========================================================================
    // ETAPA 4: SÍNTESE RAG HUMANIZADA AUTÔNOMA (Zero Latência)
    // =========================================================================
    if (!aiResponseText) {
      const synthesized = synthesizeRagResponse(lastUserMessage, searchResults, currentDateTime);
      aiResponseText = synthesized.text;
    }

    // Log assíncrono para o dashboard
    const BACKEND_URL = (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
    if (BACKEND_URL) {
      fetch(`${BACKEND_URL}/api/admin/chat-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_message: lastUserMessage,
          ai_response: aiResponseText,
          sources_count: sources.length
        })
      }).catch(e => console.error("[Orbe RAG] Failed to push chat log:", e));
    }

    return NextResponse.json({
      response: aiResponseText,
      sources: sources
    });
  } catch (err) {
    console.error('[Orbe RAG] Unexpected error in chat route:', err);
    return NextResponse.json({ 
      response: 'Olá! Eu sou o **Orbe Assistant**. Estou à disposição para tirar qualquer dúvida sobre nossas ferramentas de um jeito simples e prático. Como posso te ajudar?',
      sources: []
    });
  }
}
