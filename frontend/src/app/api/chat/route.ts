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

    const ragSystemContext = `Você é o Orbe Assistant, o assistente sênior de IA hiper-inteligente da Orbe Systems (empresa brasileira de alta engenharia de software e cibersegurança).
Fale de forma técnica, fluida, direta e estritamente profissional em português do Brasil.
⚠️ INFORMAÇÃO TEMPORAL: Data/hora atual: ${currentDateTime}.
DIRETRIZES DE RAG:
Abaixo estão os trechos oficiais recuperados diretamente da Base de Conhecimento e Manuais de Arquitetura da Orbe Systems.
Use estas informações como fonte primária de verdade para responder à dúvida do usuário.
Nunca invente preços ou regras divergentes da documentação.

--- INÍCIO DOS DOCUMENTOS OFICIAIS RECUPERADOS VIA RAG ---
${retrievedDocsText}
--- FIM DOS DOCUMENTOS OFICIAIS RECUPERADOS VIA RAG ---`;

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
          { role: 'user', parts: [{ text: ragSystemContext + `\n\nPergunta do Usuário:\n${lastUserMessage}` }] }
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
    // ETAPA 3: PROVEDOR 2 - HUGGING FACE ROUTER (Se configurado e com créditos)
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
    // ETAPA 4: PROVEDOR 3 - SÍNTESE RAG AUTÔNOMA DETERMINÍSTICA (Zero Latência)
    // =========================================================================
    if (!aiResponseText) {
      const synthesized = synthesizeRagResponse(lastUserMessage, searchResults, currentDateTime);
      aiResponseText = synthesized.text;
    }

    // Fire-and-forget log sync para o painel /admin
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
      response: 'O **Orbe Assistant** está ativo com RAG integrado. Em que podemos auxiliar sua empresa hoje?',
      sources: []
    });
  }
}
