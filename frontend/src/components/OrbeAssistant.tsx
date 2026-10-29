'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, X, Bot, Activity, BookOpen, Sparkles } from 'lucide-react';

interface ChatSource {
  title: string;
  id: string;
}

interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
  sources?: ChatSource[];
}

const QUICK_PROMPTS = [
  "Como o IMORTAL evita que sistemas travem?",
  "Como o Ghost Engine protege minha privacidade?",
  "Como funciona o ERP INHO com PIX?",
  "Como funciona o login seguro da Orbe?"
];

// ── Ultra-Stable CSS Cyberpunk Core ──
const RobotCoreWidget = ({ isOpen, isThinking = false }: { isOpen: boolean; isThinking?: boolean }) => {
  return (
    <div className={`group relative w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center cursor-pointer transition-all duration-700 ${isOpen ? 'scale-110' : 'hover:scale-105'}`}>

      {/* The Sun (Glowing Backdrop Base) */}
      <div className={`absolute inset-0 rounded-full bg-neon-cyan shadow-[0_0_20px_rgba(0,242,254,0.3)] transition-all duration-700 ease-in-out
        ${isOpen ? 'shadow-[0_0_80px_rgba(0,242,254,0.8)] scale-105' : 'group-hover:shadow-[0_0_40px_rgba(0,242,254,0.6)]'}
      `} />

      {/* The Moon (Dark sliding circle) */}
      <div className={`absolute bg-[#030508] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] z-10 flex items-center justify-center rounded-full
        ${isOpen
          ? 'inset-0 scale-100 border-2 border-neon-cyan/40 shadow-inner'
          : 'inset-0.5 translate-x-4 -translate-y-2 scale-90 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:scale-95'}
      `}>
        {isOpen ? (
          <Activity size={24} className="text-neon-cyan animate-pulse drop-shadow-[0_0_8px_rgba(0,242,254,1)]" />
        ) : (
          <Activity size={18} className="text-neon-cyan/20 opacity-0 group-hover:opacity-100 transition-opacity delay-200 duration-500" />
        )}
      </div>

      {/* Corona / Flare Effect */}
      <div className={`absolute inset-[-12px] rounded-full border border-neon-cyan/0 transition-all duration-700 pointer-events-none
        ${isOpen ? 'animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] border-neon-cyan/60' : 'group-hover:border-neon-cyan/10 group-hover:scale-110'}
      `} />
    </div>
  );
};

export default function OrbeAssistant() {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      role: 'bot', 
      text: 'Olá! Eu sou o **Orbe Assistant**. 😊\n\nEstou aqui para tirar suas dúvidas sobre tecnologia, segurança ou qualquer uma das nossas ferramentas de um jeito simples e direto. Como posso te ajudar hoje?' 
    }
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  if (!mounted) return null;

  const sendMessage = async (userMessage: string) => {
    if (!userMessage.trim()) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsThinking(true);

    try {
      const res = await fetch(`/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ messages: [{ role: 'user', content: userMessage }] })
      });

      let errorMessage = "⚠ Não consegui me conectar no momento. Por favor, tente novamente em instantes.";
      if (!res.ok) {
        try {
          const errorData = await res.json();
          if (errorData.error) {
            errorMessage = `⚠️ ${errorData.error}`;
          }
        } catch (e) { }
        throw new Error(errorMessage);
      }

      const data = await res.json();
      setMessages(prev => [
        ...prev, 
        { 
          role: 'bot', 
          text: data.response || "Tudo certo! Como posso te ajudar mais?",
          sources: data.sources || []
        }
      ]);
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'bot', text: error.message || "⚠ Tive um problema de conexão. Tente novamente." }]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleSend = () => {
    sendMessage(input.trim());
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end pointer-events-none">

      {/* Chat Window */}
      {isOpen && (
        <div className="pointer-events-auto w-[340px] md:w-[420px] h-[480px] md:h-[540px] bg-black/95 backdrop-blur-xl border border-neon-cyan/50 rounded-lg mb-4 flex flex-col overflow-hidden shadow-[0_0_50px_rgba(0,255,204,0.15)] animate-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="bg-neon-cyan/10 border-b border-neon-cyan/30 p-3 flex justify-between items-center shadow-md">
            <div className="flex items-center gap-2">
              <Bot className="text-neon-cyan animate-pulse" size={18} />
              <div className="flex flex-col">
                <span className="text-neon-cyan font-sans text-xs uppercase tracking-wider font-bold drop-shadow-[0_0_5px_rgba(0,255,204,0.8)]">
                  Orbe Assistant
                </span>
                <span className="text-[10px] text-cyan-400/80 font-sans">
                  Atendimento Inteligente &amp; Segurança
                </span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-neon-cyan/50 hover:text-neon-cyan transition-colors" title="Fechar">
              <X size={18} />
            </button>
          </div>

          {/* Chat Area */}
          <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto font-sans text-xs space-y-4 scrollbar-thin scrollbar-thumb-neon-cyan/20" style={{ background: 'radial-gradient(circle at center, rgba(0,255,204,0.03) 0%, rgba(0,0,0,1) 100%)' }}>
            {messages.map((m, i) => (
              <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[90%] p-3.5 rounded-xl leading-relaxed whitespace-pre-wrap ${m.role === 'user'
                  ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30 shadow-[0_0_10px_rgba(0,255,204,0.1)] rounded-br-none'
                  : 'bg-white/5 text-slate-100 border border-white/10 shadow-[inset_0_0_10px_rgba(255,255,255,0.02)] rounded-bl-none'
                  }`}>
                  {m.text}

                  {/* Fontes Oficiais RAG */}
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-col gap-1">
                      <span className="text-[10px] text-neon-cyan/80 font-semibold flex items-center gap-1">
                        <BookOpen size={11} /> Base Oficial Consultada:
                      </span>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {m.sources.map((s, idx) => (
                          <span 
                            key={idx} 
                            title={s.title}
                            className="text-[9px] bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan/90 px-1.5 py-0.5 rounded cursor-default"
                          >
                            {s.title.split(':')[0]}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isThinking && (
              <div className="flex justify-start">
                <div className="max-w-[85%] p-3 rounded-xl bg-white/5 text-neon-cyan border border-neon-cyan/30 flex items-center gap-2 italic">
                  <Sparkles size={14} className="animate-spin text-neon-cyan" />
                  <span className="animate-pulse">Pensando em uma resposta clara...</span>
                  <span className="flex gap-0.5 mt-1">
                    <div className="w-1 h-1 bg-neon-cyan rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1 h-1 bg-neon-cyan rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1 h-1 bg-neon-cyan rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Prompts Bar */}
          {messages.length <= 2 && (
            <div className="px-3 py-2 bg-black/70 border-t border-white/5 flex gap-1.5 overflow-x-auto scrollbar-none">
              {QUICK_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(prompt)}
                  className="whitespace-nowrap text-[10px] font-sans bg-neon-cyan/10 hover:bg-neon-cyan/25 border border-neon-cyan/25 text-neon-cyan px-2.5 py-1 rounded-full transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input Area */}
          <div className="p-3 border-t border-neon-cyan/30 bg-black/85 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Digite sua dúvida de forma simples..."
              disabled={isThinking}
              className="flex-1 bg-white/5 border border-neon-cyan/40 p-2.5 text-slate-100 text-xs font-sans focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_10px_rgba(0,255,204,0.2)] placeholder:text-slate-400 disabled:opacity-50 transition-all rounded-md"
            />
            <button
              onClick={handleSend}
              disabled={isThinking || !input.trim()}
              className="bg-neon-cyan/20 border border-neon-cyan/50 text-neon-cyan px-3 py-2 hover:bg-neon-cyan hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed rounded-md"
              title="Enviar mensagem"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Robot Core Toggle */}
      <div onClick={() => setIsOpen(!isOpen)} className="pointer-events-auto">
        <RobotCoreWidget isOpen={isOpen} isThinking={isThinking} />
      </div>
    </div>
  );
}
