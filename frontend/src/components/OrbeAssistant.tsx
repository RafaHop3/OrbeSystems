'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, X, Bot, Activity } from 'lucide-react';

// ── Ultra-Stable CSS Cyberpunk Core ──
const RobotCoreWidget = ({ isThinking = false }: { isThinking?: boolean }) => {
  return (
    <div className={`relative w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 ${isThinking ? 'scale-110 shadow-[0_0_50px_rgba(255,0,255,0.6)]' : 'hover:scale-105 shadow-[0_0_30px_rgba(0,255,204,0.3)] hover:shadow-[0_0_40px_rgba(0,255,204,0.6)]'}`}>

      {/* Outer Rotating Ring */}
      <div className={`absolute inset-0 rounded-full border-2 border-dashed ${isThinking ? 'border-neon-purple animate-[spin_2s_linear_infinite]' : 'border-neon-cyan/50 animate-[spin_8s_linear_infinite]'}`} />

      {/* Middle Counter-Rotating Ring */}
      <div className={`absolute inset-2 rounded-full border border-dotted ${isThinking ? 'border-neon-purple animate-[spin_1.5s_linear_reverse_infinite]' : 'border-neon-green/40 animate-[spin_12s_linear_reverse_infinite]'}`} />

      {/* Inner Glowing Core */}
      <div className={`absolute inset-4 rounded-full bg-black flex items-center justify-center border ${isThinking ? 'border-neon-purple/80' : 'border-neon-cyan/80'}`}>
        <div className={`w-full h-full rounded-full transition-all duration-300 ${isThinking ? 'bg-neon-purple/40 animate-pulse' : 'bg-neon-cyan/20'} flex items-center justify-center`}>
          <Activity size={18} className={isThinking ? 'text-neon-purple animate-bounce' : 'text-neon-cyan'} />
        </div>
      </div>

      {/* Decorative Sparkles (CSS Ping) */}
      <div className={`absolute top-0 right-1 w-2 h-2 rounded-full ${isThinking ? 'bg-neon-purple' : 'bg-neon-green'} animate-ping`} />
      <div className={`absolute bottom-1 left-2 w-1.5 h-1.5 rounded-full ${isThinking ? 'bg-neon-purple' : 'bg-neon-cyan'} animate-ping`} style={{ animationDelay: '500ms' }} />
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
                <div className="max-w-[85%] p-3 rounded-md bg-white/5 text-neon-purple border border-neon-purple/30 flex items-center gap-2 italic">
                  <span className="animate-pulse">Processando</span>
                  <span className="flex gap-0.5 mt-1">
                    <div className="w-1 h-1 bg-neon-purple rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1 h-1 bg-neon-purple rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1 h-1 bg-neon-purple rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
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
        <RobotCoreWidget isThinking={isThinking && isOpen} />
      </div>
    </div>
  );
}
