'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, X, Bot, Activity } from 'lucide-react';

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

      {/* Corona / Flare Effect (Activates on total eclipse) */}
      <div className={`absolute inset-[-12px] rounded-full border border-neon-cyan/0 transition-all duration-700 pointer-events-none
        ${isOpen ? 'animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] border-neon-cyan/60' : 'group-hover:border-neon-cyan/10 group-hover:scale-110'}
      `} />
    </div>
  );
};


export default function OrbeAssistant() {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'bot', text: string }[]>([
    { role: 'bot', text: 'Olá. Eu sou o Orbe Assistant. Como posso otimizar seu ecossistema hoje?' }
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

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
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

      let errorMessage = "⚠ Falha de comunicação com o Núcleo principal. O backend pode estar offline ou indisponível localmente.";
      if (!res.ok) {
        try {
          const errorData = await res.json();
          if (errorData.error) {
            errorMessage = `⚠️ Erro do Sistema: ${errorData.error}`;
          }
        } catch (e) { }
        throw new Error(errorMessage);
      }

      const data = await res.json();
      setMessages(prev => [...prev, { role: 'bot', text: data.response || "Resposta corrompida. Tente novamente." }]);
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'bot', text: error.message || "⚠ Falha de comunicação." }]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end pointer-events-none">

      {/* Chat Window */}
      {isOpen && (
        <div className="pointer-events-auto w-[320px] md:w-[380px] h-[450px] md:h-[500px] bg-black/95 backdrop-blur-xl border border-neon-cyan/50 rounded-lg mb-4 flex flex-col overflow-hidden shadow-[0_0_50px_rgba(0,255,204,0.15)] animate-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="bg-neon-cyan/10 border-b border-neon-cyan/30 p-3 flex justify-between items-center shadow-md">
            <div className="flex items-center gap-2">
              <Bot className="text-neon-cyan animate-pulse" size={18} />
              <span className="text-neon-cyan font-mono text-xs uppercase tracking-widest font-bold drop-shadow-[0_0_5px_rgba(0,255,204,0.8)]">Orbe Assistant</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-neon-cyan/50 hover:text-neon-cyan transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Chat Area */}
          <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto font-mono text-xs space-y-4 scrollbar-thin scrollbar-thumb-neon-cyan/20" style={{ background: 'radial-gradient(circle at center, rgba(0,255,204,0.03) 0%, rgba(0,0,0,1) 100%)' }}>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-md ${m.role === 'user'
                  ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30 shadow-[0_0_10px_rgba(0,255,204,0.1)]'
                  : 'bg-white/5 text-gray-300 border border-white/10 shadow-[inset_0_0_10px_rgba(255,255,255,0.02)]'
                  }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {isThinking && (
              <div className="flex justify-start">
                <div className="max-w-[85%] p-3 rounded-md bg-white/5 text-neon-blue border border-neon-blue/30 flex items-center gap-2 italic">
                  <span className="animate-pulse">Processando</span>
                  <span className="flex gap-0.5 mt-1">
                    <div className="w-1 h-1 bg-neon-blue rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1 h-1 bg-neon-blue rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1 h-1 bg-neon-blue rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-3 border-t border-neon-cyan/30 bg-black/80 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Digite seu comando..."
              disabled={isThinking}
              className="flex-1 bg-white/5 border border-neon-cyan/40 p-2 text-neon-cyan text-xs font-mono focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_10px_rgba(0,255,204,0.2)] placeholder:text-neon-cyan/30 disabled:opacity-50 transition-all rounded-sm"
            />
            <button
              onClick={handleSend}
              disabled={isThinking || !input.trim()}
              className="bg-neon-cyan/20 border border-neon-cyan/50 text-neon-cyan p-2 hover:bg-neon-cyan hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed rounded-sm"
            >
              <Send size={16} />
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
