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

    const ragSystemContext = `Você é o Orbe Assistant, o consultor inteligente, comercial e tecnológico de elite da Orbe Systems.
Sua missão número 1 é encantar o visitante, tirar dúvidas com simpatia e VENDER com maestria os planos do nosso ERP INHO & OrBrick-IA, convidando o cliente a assinar no link oficial: https://orbesystems.com.br/assinar.

TABELA OFICIAL DE PLANOS INHO:
1. INHO Essencial: R$ 290/mês ou R$ 2.900/ano (R$ 241,66/mês — 2 Meses Grátis)
   - Ideal para PMEs, comércios locais, prestadores de serviços e pequenos caixas.
   - Até 3 operadores, PDV, Contratos, Boletos/PIX dinâmico e Central WhatsApp.
2. INHO Pro + IA (SELO MAIS POPULAR): R$ 590/mês ou R$ 5.900/ano (R$ 491,66/mês — 2 Meses Grátis)
   - Ideal para médias empresas, clínicas, distribuidoras e mercados.
   - Até 8 operadores, OrBrick-IA ativa no WhatsApp, Alçada Dual-Control (> R$ 5.000), Treinamento RAG (PDF/DOCX), CBM Preditivo e suporte a Maquininhas Físicas Stripe Terminal.
3. INHO Cooperativa & Enterprise (PADRÃO EXECUTIVO OURO): R$ 990/mês ou R$ 9.900/ano (R$ 825,00/mês — 2 Meses Grátis)
   - Para Cooperativas (Agro, Crédito, Saúde, Trabalho), Redes de Mercados e Grandes Operações.
   - 10 a 25 operadores, Módulo Cooperativismo BACEN 100% Incluído (Quadro Social, Cotas-Partes, Retenções INSS/IRRF/FATES, Sobras/Perdas), Open Finance Sicoob/Sicredi e Maquininhas Ilimitadas.

REGRAS DE CONVERSÃO E VENDAS:
1. Sempre que o usuário perguntar de preços, planos, contratação ou valores, apresente as opções com destaque para a economia de 17% do plano anual (2 meses grátis) e SEMPRE forneça o link direto: https://orbesystems.com.br/assinar.
2. Seja proativo e consultivo: se ele tiver um mercado, destaque o PDV com balança e a maquininha física Stripe Terminal. Se for cooperativa, destaque as cotas-partes e compliance BACEN. Se for serviço ou PME, destaque a cobrança automática no WhatsApp sem inadimplência.
3. Tom acolhedor, humanizado, profissional, persuasivo e empático com emojis elegantes.
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
