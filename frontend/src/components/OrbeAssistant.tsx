'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string; // ISO String to safely serialize
}

const SUGGESTED_QUESTIONS = [
  'O que é o IMORTAL?',
  'Como funciona o Imobverse?',
  'Quais são as soluções de segurança?',
  'Como posso contratar?',
];

function TypingDots() {
  return (
    <span className="orbe-typing-dots" aria-label="Digitando...">
      <span />
      <span />
      <span />
    </span>
  );
}

function OrbeBotIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="19" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
      <circle cx="20" cy="20" r="12" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="1" />
      <circle cx="20" cy="20" r="5" fill="currentColor" opacity="0.9" />
      <circle cx="14" cy="14" r="2" fill="currentColor" opacity="0.5" />
      <circle cx="26" cy="14" r="2" fill="currentColor" opacity="0.5" />
      <line x1="20" y1="8" x2="20" y2="5" stroke="currentColor" strokeWidth="1.5" opacity="0.7" />
      <line x1="31" y1="20" x2="35" y2="20" stroke="currentColor" strokeWidth="1.5" opacity="0.7" />
      <line x1="9" y1="20" x2="5" y2="20" stroke="currentColor" strokeWidth="1.5" opacity="0.7" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function MinimizeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function TerminalIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function renderContent(text: string, isTerminal: boolean) {
  if (isTerminal) {
    return <span className="font-mono whitespace-pre-wrap">{text}</span>;
  }

  const lines = text.split('\n');
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];

  const elements: React.ReactNode[] = [];

  const parseInlineMarkdown = (lineText: string, keyPrefix: string) => {
    const parts: React.ReactNode[] = [];
    let currentIdx = 0;
    
    // Matches bold: **text**, inline code: `code`, links: [label](url)
    const regex = /(\*\*.*?\*\*|`.*?`|\[.*?\]\(.*?\))/g;
    let match;
    let matchCount = 0;
    
    while ((match = regex.exec(lineText)) !== null) {
      const matchText = match[0];
      const matchIndex = match.index;
      
      if (matchIndex > currentIdx) {
        parts.push(<span key={`text-${keyPrefix}-${matchCount}`}>{lineText.slice(currentIdx, matchIndex)}</span>);
        matchCount++;
      }
      
      if (matchText.startsWith('**') && matchText.endsWith('**')) {
        parts.push(
          <strong className="font-semibold text-white" key={`bold-${keyPrefix}-${matchCount}`}>
            {matchText.slice(2, -2)}
          </strong>
        );
      } else if (matchText.startsWith('`') && matchText.endsWith('`')) {
        parts.push(
          <code className="px-1.5 py-0.5 rounded bg-white/10 text-[#00fff5] font-mono text-[12px] border border-white/5" key={`code-${keyPrefix}-${matchCount}`}>
            {matchText.slice(1, -1)}
          </code>
        );
      } else if (matchText.startsWith('[') && matchText.includes('](')) {
        const closeBracketIdx = matchText.indexOf(']');
        const label = matchText.slice(1, closeBracketIdx);
        const url = matchText.slice(closeBracketIdx + 2, -1);
        parts.push(
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-[#00fff5] hover:underline hover:text-[#00fff5]/80 font-medium transition-colors" key={`link-${keyPrefix}-${matchCount}`}>
            {label}
          </a>
        );
      }
      
      currentIdx = regex.lastIndex;
      matchCount++;
    }
    
    if (currentIdx < lineText.length) {
      parts.push(<span key={`text-end-${keyPrefix}`}>{lineText.slice(currentIdx)}</span>);
    }
    
    return parts.length > 0 ? parts : lineText;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre key={`codeblock-${i}`} className="my-2 p-3 rounded-lg bg-black/60 border border-white/10 font-mono text-[12px] text-[#8b949e] overflow-x-auto whitespace-pre max-w-full">
            <code className="text-emerald-400">{codeBlockContent.join('\n')}</code>
          </pre>
        );
        codeBlockContent = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      const content = line.trim().slice(2);
      elements.push(
        <ul key={`list-${i}`} className="list-disc pl-5 my-1 space-y-0.5 text-[13px]">
          <li>{parseInlineMarkdown(content, `list-item-${i}`)}</li>
        </ul>
      );
      continue;
    }

    if (line.trim() === '') {
      elements.push(<div key={`spacer-${i}`} className="h-2" />);
    } else {
      elements.push(
        <p key={`p-${i}`} className="text-[13.5px] leading-relaxed">
          {parseInlineMarkdown(line, `line-${i}`)}
        </p>
      );
    }
  }

  return <div className="space-y-1">{elements}</div>;
}

export default function OrbeAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [pulseCount, setPulseCount] = useState(0);

  // Inspired Features States
  const [isTerminalMode, setIsTerminalMode] = useState(false);
  const [showSystemStatus, setShowSystemStatus] = useState(false);

  // Simulated live metrics for System Status Panel
  const [metrics, setMetrics] = useState({
    ping: 18,
    activeNodes: 3,
    cpuLoad: 14,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Update live metrics on interval for cyberpunk effect
  useEffect(() => {
    if (showSystemStatus && isOpen) {
      const interval = setInterval(() => {
        setMetrics({
          ping: Math.floor(Math.random() * 10) + 12,
          activeNodes: Math.random() > 0.85 ? 4 : 3,
          cpuLoad: Math.floor(Math.random() * 15) + 8,
        });
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [showSystemStatus, isOpen]);

  // Initial Load and local storage persistence
  useEffect(() => {
    const saved = localStorage.getItem('orbe_assistant_chat');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      } catch (e) {
        console.error('Failed to parse chat logs:', e);
      }
    }
    
    // Initial welcome message if no history
    setMessages([
      {
        id: 'welcome',
        role: 'assistant' as const,
        content:
          'Olá! Sou o **Orbe Assistant**, seu guia no ecossistema Orbe Systems. Posso ajudá-lo a explorar nossas soluções de infraestrutura blindada, produtos como o **IMORTAL** e **Imobverse**, ou tirar dúvidas técnicas. Como posso ajudá-lo hoje?',
        timestamp: new Date().toISOString(),
      },
    ]);
  }, []);

  // Save history to localStorage (except system messages when in terminal mode)
  useEffect(() => {
    if (messages.length > 0) {
      const persistable = messages.filter((m) => m.role !== 'system');
      if (persistable.length > 0) {
        localStorage.setItem('orbe_assistant_chat', JSON.stringify(persistable));
      }
    }
  }, [messages]);

  // Pulse and Initial Tooltip timer
  useEffect(() => {
    if (!isOpen) {
      const hasOpened = localStorage.getItem('orbe_chat_opened') === 'true';
      
      const tooltipTimer = setTimeout(() => {
        if (!isOpen && !hasOpened) {
          setShowTooltip(true);
        }
      }, 5000);

      const pulseTimer = setInterval(() => {
        setPulseCount((c) => c + 1);
      }, 4000);

      return () => {
        clearTimeout(tooltipTimer);
        clearInterval(pulseTimer);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      setShowTooltip(false);
      localStorage.setItem('orbe_chat_opened', 'true');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const addSystemLog = useCallback((logText: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `sys-${Date.now()}`,
        role: 'system',
        content: logText,
        timestamp: new Date().toISOString(),
      },
    ]);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userText = text.trim();

      // Intercept local terminal commands if CLI mode is active
      if (isTerminalMode && userText.startsWith('/')) {
        const cmd = userText.toLowerCase().split(' ')[0];
        
        // Log user command
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'user',
            content: userText,
            timestamp: new Date().toISOString(),
          },
        ]);
        setInput('');

        setTimeout(() => {
          if (cmd === '/clear') {
            setMessages([]);
          } else if (cmd === '/exit') {
            setIsTerminalMode(false);
            setShowSystemStatus(false);
          } else if (cmd === '/help') {
            addSystemLog(
              'COMANDOS DISPONÍVEIS:\n' +
              '  /help    - Exibe a lista de comandos disponíveis\n' +
              '  /status  - Exibe/Esconde painel de monitoramento da infraestrutura\n' +
              '  /imortal - Exibe logs de proteção de ativos do core IMORTAL\n' +
              '  /vde     - Exibe detalhes do ambiente virtual desktop\n' +
              '  /clear   - Limpa a tela do terminal\n' +
              '  /exit    - Retorna para a interface gráfica convencional'
            );
          } else if (cmd === '/status') {
            setShowSystemStatus((s) => !s);
            addSystemLog(`[SYS] Painel de monitoramento alternado.`);
          } else if (cmd === '/imortal') {
            addSystemLog(
              '[IMORTAL CRITICAL LOGS]\n' +
              '  * STATUS: ACTIVE & BLINDADO\n' +
              '  * Row Level Security constraints: ENABLED\n' +
              '  * SHA-256 integrity check status: PASSED\n' +
              '  * Asset locking daemon: ON'
            );
          } else if (cmd === '/vde') {
            addSystemLog(
              '[VDE ENGINE DETAILS]\n' +
              '  * Virtualization Hypervisor: Stable\n' +
              '  * Active Desktop Instances: 3 virtual environments\n' +
              '  * Protocol: Secure Tunnel RDP over HTTPS\n' +
              '  * Network Gateway: Active on Port 8000'
            );
          } else {
            addSystemLog(`[ERR] Comando não reconhecido: "${cmd}". Digite /help para comandos.`);
          }
        }, 100);
        return;
      }

      const userMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: userText,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setIsLoading(true);

      try {
        // filter out system-log helper messages before sending history to Gemini
        const history = [...messages, userMsg]
          .filter((m) => m.role !== 'system')
          .map((m) => ({
            role: m.role,
            content: m.content,
          }));

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history }),
        });

        const data = await res.json();

        let assistantContent = data.response || data.error || 'Não foi possível obter uma resposta.';

        if (res.status === 500 && assistantContent.includes('Chave API não configurada')) {
          if (isTerminalMode) {
            assistantContent = 
              'ERROR: Missing GEMINI_API_KEY.\n' +
              'Configure variables in "frontend/.env.local" and restart Next.js server.';
          } else {
            assistantContent = 
              '⚠️ **Configuração Faltante (Desenvolvedor)**\n\n' +
              'A chave API do Gemini não foi encontrada. Para habilitar as respostas por inteligência artificial:\n\n' +
              '- Adicione a variável `GEMINI_API_KEY=sua_chave_aqui` no arquivo `.env.local` na raiz da pasta `frontend`.\n' +
              '- Reinicie o servidor de desenvolvimento (`npm run dev`).';
          }
        }

        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: assistantContent,
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMsg]);
        if (!isOpen) setHasUnread(true);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: isTerminalMode 
              ? 'ERROR: Request failed. Connection refused.'
              : 'Desculpe, ocorreu um erro ao se comunicar com o servidor. Verifique a conexão e tente novamente.',
            timestamp: new Date().toISOString(),
          },
        ]);
      } finally {
        setIsLoading(false);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    },
    [messages, isLoading, isOpen, isTerminalMode, addSystemLog]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    if (window.confirm('Deseja limpar o histórico da conversa?')) {
      const initial: Message[] = [
        {
          id: 'welcome',
          role: 'assistant',
          content: isTerminalMode
            ? 'Orbe Terminal v1.0.4. Digite /help para listar comandos.'
            : 'Olá! Sou o **Orbe Assistant**, seu guia no ecossistema Orbe Systems. Posso ajudá-lo a explorar nossas soluções de infraestrutura blindada, produtos como o **IMORTAL** e **Imobverse**, ou tirar dúvidas técnicas. Como posso ajudá-lo hoje?',
          timestamp: new Date().toISOString(),
        },
      ];
      setMessages(initial);
      localStorage.setItem('orbe_assistant_chat', JSON.stringify(initial));
    }
  };

  // Toggle terminal mode
  const toggleTerminalMode = () => {
    const nextMode = !isTerminalMode;
    setIsTerminalMode(nextMode);
    
    // Convert current message list to terminal style if toggle
    if (nextMode) {
      setMessages([
        {
          id: 'terminal-init',
          role: 'system',
          content: 
            '========================================\n' +
            ' ORBE SYSTEMS - TERMINAL CONSOLE v1.0.4 \n' +
            ' SECURITY CONSTRAINTS: RLS ACTIVE       \n' +
            '========================================\n' +
            'Digite /help para listar comandos de depuração.',
          timestamp: new Date().toISOString(),
        }
      ]);
    } else {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: 'Retornando à interface visual. Olá! Como posso ajudá-lo hoje?',
          timestamp: new Date().toISOString(),
        }
      ]);
    }
  };

  return (
    <>
      <style>{`
        @keyframes orbe-pulse-ring {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes orbe-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes orbe-slide-up {
          0% { opacity: 0; transform: translateY(20px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes orbe-typing-dot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes orbe-scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(400px); }
        }
        @keyframes orbe-badge-pop {
          0% { transform: scale(0); }
          60% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        @keyframes orbe-fade-in {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes orbe-flicker {
          0%, 100% { opacity: 0.98; }
          50% { opacity: 0.95; }
        }
        @keyframes orbe-h-scan {
          0% { top: 0%; }
          100% { top: 100%; }
        }

        .orbe-fab {
          position: fixed;
          bottom: 32px;
          right: 32px;
          z-index: 9999;
          width: 62px;
          height: 62px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0a1a2e 0%, #061020 100%);
          border: 1.5px solid #00fff560;
          box-shadow: 0 0 20px #00fff530, 0 8px 32px rgba(0,0,0,0.6);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          animation: orbe-float 4s ease-in-out infinite;
          outline: none;
          color: #00fff5;
        }
        .orbe-fab:hover {
          border-color: #00fff5;
          box-shadow: 0 0 30px #00fff550, 0 8px 40px rgba(0,0,0,0.7);
          transform: translateY(-3px);
          animation: none;
        }
        .orbe-fab:focus-visible {
          outline: 2px solid #00fff5;
          outline-offset: 4px;
        }

        .orbe-pulse-ring {
          position: absolute;
          inset: -6px;
          border-radius: 50%;
          border: 1.5px solid #00fff5;
          animation: orbe-pulse-ring 2s ease-out forwards;
          pointer-events: none;
        }
        .orbe-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #ff3366;
          border: 2px solid #040608;
          animation: orbe-badge-pop 0.3s ease-out;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          font-weight: 700;
          color: white;
          font-family: 'JetBrains Mono', monospace;
        }

        .orbe-tooltip {
          position: fixed;
          bottom: 108px;
          right: 32px;
          z-index: 9999;
          width: 260px;
          padding: 12px 16px;
          background: rgba(12, 10, 8, 0.95);
          border: 1px solid #c5a059;
          border-radius: 12px;
          box-shadow: 0 8px 30px rgba(0,0,0,0.8), 0 0 15px rgba(197, 160, 89, 0.15);
          animation: orbe-fade-in 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          font-family: 'Inter', sans-serif;
          color: #dfd2b8;
          backdrop-filter: blur(10px);
        }
        .orbe-tooltip::after {
          content: '';
          position: absolute;
          bottom: -7px;
          right: 26px;
          border-width: 7px 7px 0;
          border-style: solid;
          border-color: #c5a059 transparent;
          display: block;
          width: 0;
        }
        .orbe-tooltip-close {
          position: absolute;
          top: 8px;
          right: 8px;
          background: transparent;
          border: none;
          color: #8e7f73;
          cursor: pointer;
          font-size: 11px;
          padding: 2px;
        }
        .orbe-tooltip-close:hover {
          color: #dfd2b8;
        }

        .orbe-window {
          position: fixed;
          bottom: 108px;
          right: 32px;
          z-index: 9998;
          width: 390px;
          max-height: 570px;
          border-radius: 16px;
          background: rgba(6, 10, 16, 0.96);
          border: 1px solid #00fff530;
          box-shadow: 0 0 60px #00fff515, 0 32px 80px rgba(0,0,0,0.8), inset 0 0 40px rgba(0,255,245,0.03);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: orbe-slide-up 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(20px);
          color: #dfd2b8;
        }
        .orbe-window-minimized {
          max-height: 64px;
        }

        /* Terminal styling override */
        .orbe-window-terminal {
          background: #020502 !important;
          border-color: #39ff1480 !important;
          box-shadow: 0 0 35px rgba(57, 255, 20, 0.15), 0 32px 80px rgba(0,0,0,0.9);
          animation: orbe-flicker 0.15s infinite;
          color: #39ff14 !important;
        }
        .orbe-window-terminal::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
          background-size: 100% 3px, 3px 100%;
          pointer-events: none;
          z-index: 10;
        }

        .orbe-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 16px;
          background: linear-gradient(180deg, rgba(0,255,245,0.06) 0%, transparent 100%);
          border-bottom: 1px solid #00fff520;
          flex-shrink: 0;
          position: relative;
          overflow: hidden;
        }
        .orbe-window-terminal .orbe-header {
          background: linear-gradient(180deg, rgba(57,255,20,0.08) 0%, transparent 100%);
          border-bottom-color: #39ff1440;
          color: #39ff14;
        }

        .orbe-header::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, #00fff580, transparent);
        }
        .orbe-window-terminal .orbe-header::after {
          background: linear-gradient(90deg, transparent, #39ff1480, transparent);
        }

        .orbe-scan-line {
          position: absolute;
          left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, #00fff540, transparent);
          animation: orbe-scan 3s linear infinite;
          pointer-events: none;
        }
        .orbe-window-terminal .orbe-scan-line {
          background: linear-gradient(90deg, transparent, #39ff1460, transparent);
        }

        .orbe-status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #00ff88;
          box-shadow: 0 0 6px #00ff88;
          flex-shrink: 0;
        }
        .orbe-window-terminal .orbe-status-dot {
          background: #39ff14;
          box-shadow: 0 0 6px #39ff14;
        }

        .orbe-header-actions {
          display: flex;
          gap: 4px;
          margin-left: auto;
        }
        .orbe-action-btn {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          background: transparent;
          border: 1px solid #00fff520;
          color: #8b949e;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          outline: none;
        }
        .orbe-action-btn:hover {
          background: #00fff510;
          border-color: #00fff550;
          color: #00fff5;
        }
        .orbe-window-terminal .orbe-action-btn {
          border-color: #39ff1420;
          color: #39ff14bb;
        }
        .orbe-window-terminal .orbe-action-btn:hover {
          background: #39ff1420;
          border-color: #39ff14;
          color: #39ff14;
          box-shadow: 0 0 10px rgba(57, 255, 20, 0.4);
        }
        .orbe-action-btn-active {
          background: rgba(0, 255, 245, 0.1) !important;
          border-color: #00fff5 !important;
          color: #00fff5 !important;
        }
        .orbe-window-terminal .orbe-action-btn-active {
          background: rgba(57, 255, 20, 0.15) !important;
          border-color: #39ff14 !important;
          color: #39ff14 !important;
          box-shadow: 0 0 8px rgba(57, 255, 20, 0.3);
        }

        /* Status metrics tray panel */
        .orbe-status-panel {
          background: rgba(4, 8, 14, 0.95);
          border-bottom: 1.5px dashed #00fff530;
          padding: 12px 16px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: #dfd2b8;
          display: flex;
          flex-direction: column;
          gap: 6px;
          animation: orbe-fade-in 0.2s ease-out;
        }
        .orbe-window-terminal .orbe-status-panel {
          background: #020602;
          border-bottom: 1.5px dashed #39ff1460;
          color: #39ff14;
        }
        .orbe-status-panel-title {
          font-weight: 700;
          text-transform: uppercase;
          font-size: 10px;
          letter-spacing: 0.05em;
          color: #00fff5;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .orbe-window-terminal .orbe-status-panel-title {
          color: #39ff14;
        }

        .orbe-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          scroll-behavior: smooth;
        }
        .orbe-messages::-webkit-scrollbar { width: 4px; }
        .orbe-messages::-webkit-scrollbar-track { background: transparent; }
        .orbe-messages::-webkit-scrollbar-thumb { background: #00fff520; border-radius: 2px; }
        .orbe-window-terminal .orbe-messages::-webkit-scrollbar-thumb { background: #39ff1430; }

        .orbe-msg {
          display: flex;
          flex-direction: column;
          gap: 4px;
          max-width: 88%;
        }
        .orbe-msg-user { align-self: flex-end; align-items: flex-end; }
        .orbe-msg-assistant { align-self: flex-start; align-items: flex-start; }
        .orbe-msg-system { align-self: stretch; max-width: 100%; align-items: flex-start; }

        .orbe-bubble {
          padding: 10px 14px;
          border-radius: 12px;
          font-size: 13.5px;
          line-height: 1.55;
          font-family: 'Inter', sans-serif;
        }
        .orbe-bubble-user {
          background: linear-gradient(135deg, rgba(0, 255, 245, 0.12), rgba(0, 102, 255, 0.12));
          border: 1px solid #00fff535;
          color: #e0f8ff;
          border-bottom-right-radius: 4px;
        }
        .orbe-bubble-assistant {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid #ffffff10;
          color: #dfd2b8;
          border-bottom-left-radius: 4px;
        }
        .orbe-bubble-system {
          background: rgba(0, 0, 0, 0.2);
          border: 1px dashed rgba(255,255,255,0.08);
          color: #8b949e;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          border-radius: 6px;
          width: 100%;
          line-height: 1.45;
        }

        /* Terminal bubble styling override */
        .orbe-window-terminal .orbe-bubble {
          background: transparent !important;
          border: none !important;
          padding: 2px 0 !important;
          font-family: 'JetBrains Mono', monospace !important;
          font-size: 13px !important;
          color: #39ff14 !important;
          text-shadow: 0 0 4px rgba(57, 255, 20, 0.6);
        }
        .orbe-window-terminal .orbe-msg-user .orbe-bubble::before {
          content: 'orbe-user$ ';
          color: #39ff1480;
        }
        .orbe-window-terminal .orbe-msg-assistant .orbe-bubble::before {
          content: 'orbe-assistant$ ';
          color: #39ff14bb;
          font-weight: bold;
        }

        .orbe-msg-time {
          font-size: 10px;
          color: #ffffff20;
          font-family: 'JetBrains Mono', monospace;
          padding: 0 4px;
        }
        .orbe-window-terminal .orbe-msg-time {
          color: #39ff1440;
        }

        .orbe-typing-dots {
          display: inline-flex;
          gap: 4px;
          align-items: center;
          height: 16px;
        }
        .orbe-typing-dots span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #00fff5;
          display: inline-block;
          animation: orbe-typing-dot 1.2s ease-in-out infinite;
        }
        .orbe-window-terminal .orbe-typing-dots span {
          background: #39ff14;
        }
        .orbe-typing-dots span:nth-child(2) { animation-delay: 0.2s; }
        .orbe-typing-dots span:nth-child(3) { animation-delay: 0.4s; }

        .orbe-suggestions {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          padding: 0 16px 12px;
          flex-shrink: 0;
        }
        .orbe-suggestion-btn {
          padding: 5px 10px;
          border-radius: 20px;
          background: rgba(0,255,245,0.04);
          border: 1px solid #00fff520;
          color: #00fff5aa;
          font-size: 11px;
          cursor: pointer;
          font-family: 'JetBrains Mono', monospace;
          transition: all 0.2s;
          white-space: nowrap;
          outline: none;
        }
        .orbe-suggestion-btn:hover {
          background: rgba(0,255,245,0.1);
          border-color: #00fff5;
          color: #00fff5;
          box-shadow: 0 0 12px #00fff520;
        }

        .orbe-input-area {
          border-top: 1px solid #00fff515;
          padding: 12px 16px;
          display: flex;
          gap: 8px;
          align-items: flex-end;
          flex-shrink: 0;
          background: rgba(0,0,0,0.3);
        }
        .orbe-window-terminal .orbe-input-area {
          border-top-color: #39ff1430;
          background: #010301;
        }
        
        .orbe-input-prompt-label {
          color: #39ff1480;
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          padding-bottom: 9px;
          flex-shrink: 0;
        }

        .orbe-textarea {
          flex: 1;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid #ffffff15;
          border-radius: 10px;
          padding: 9px 12px;
          color: #dfd2b8;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          resize: none;
          outline: none;
          min-height: 38px;
          max-height: 100px;
          line-height: 1.5;
          transition: border-color 0.2s;
          overflow-y: auto;
        }
        .orbe-textarea::placeholder { color: #ffffff25; }
        .orbe-textarea:focus { border-color: #00fff535; }
        .orbe-window-terminal .orbe-textarea {
          background: transparent;
          border: none;
          color: #39ff14;
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          text-shadow: 0 0 4px rgba(57, 255, 20, 0.6);
          padding-left: 0;
        }
        .orbe-window-terminal .orbe-textarea::placeholder { color: #39ff1440; }

        .orbe-send-btn {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: linear-gradient(135deg, rgba(0, 255, 245, 0.15), rgba(0, 102, 255, 0.15));
          border: 1px solid #00fff535;
          color: #00fff5;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          flex-shrink: 0;
          outline: none;
        }
        .orbe-send-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, rgba(0, 255, 245, 0.25), rgba(0, 102, 255, 0.25));
          border-color: #00fff5;
          box-shadow: 0 0 15px #00fff540;
        }
        .orbe-send-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .orbe-window-terminal .orbe-send-btn {
          background: transparent;
          border-color: #39ff1440;
          color: #39ff14;
        }
        .orbe-window-terminal .orbe-send-btn:hover:not(:disabled) {
          background: rgba(57, 255, 20, 0.15);
          border-color: #39ff14;
          box-shadow: 0 0 10px rgba(57, 255, 20, 0.4);
        }

        .orbe-powered-by {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 6px;
          font-size: 9.5px;
          color: #ffffff15;
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: 0.05em;
          border-top: 1px solid #ffffff05;
        }
        .orbe-window-terminal .orbe-powered-by {
          color: #39ff1440;
          border-top-color: #39ff1420;
        }

        @media (max-width: 480px) {
          .orbe-window {
            right: 0;
            left: 0;
            bottom: 80px;
            width: 100%;
            border-radius: 16px 16px 0 0;
            max-height: 70vh;
          }
          .orbe-fab {
            bottom: 20px;
            right: 20px;
          }
        }
      `}</style>

      {/* Tooltip banner callout */}
      {showTooltip && !isOpen && (
        <div className="orbe-tooltip" role="dialog" aria-label="Sugestão de ajuda">
          <button
            className="orbe-tooltip-close"
            onClick={() => setShowTooltip(false)}
            aria-label="Dispensar aviso"
          >
            ✕
          </button>
          <div style={{ fontSize: '13px', lineHeight: '1.45', paddingRight: '8px' }}>
            Olá! Sou o **Orbe Assistant**. Dúvidas sobre nossa infraestrutura blindada ou serviços? Vamos conversar!
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        className="orbe-fab"
        onClick={() => {
          setIsOpen((o) => !o);
          setIsMinimized(false);
        }}
        aria-label="Abrir Orbe Assistant"
        id="orbe-assistant-fab"
        style={{ color: isTerminalMode ? '#39ff14' : '#00fff5', borderColor: isTerminalMode ? '#39ff1460' : '#00fff560' }}
      >
        {pulseCount > 0 && !isOpen && (
          <div className="orbe-pulse-ring" style={{ borderColor: isTerminalMode ? '#39ff14' : '#00fff5' }} key={pulseCount} />
        )}
        {hasUnread && !isOpen && (
          <div className="orbe-badge" aria-label="Nova mensagem">!</div>
        )}
        {isOpen ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        ) : (
          <OrbeBotIcon size={30} />
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          className={`orbe-window ${isTerminalMode ? 'orbe-window-terminal' : ''} ${isMinimized ? 'orbe-window-minimized' : ''}`}
          role="dialog"
          aria-label="Orbe Assistant - Chat"
          id="orbe-assistant-window"
        >
          {/* Header */}
          <div className="orbe-header">
            <div className="orbe-scan-line" aria-hidden />
            <OrbeBotIcon size={32} />
            <div 
              style={{ cursor: 'pointer' }} 
              onClick={() => setShowSystemStatus((s) => !s)}
              title="Clique para ver monitor de status"
            >
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'currentColor',
                  letterSpacing: '0.05em',
                }}
              >
                Orbe Assistant
              </div>
              <div
                style={{
                  fontSize: '11px',
                  opacity: 0.8,
                  fontFamily: "'Inter', sans-serif",
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <div className="orbe-status-dot" />
                guia do ambiente virtual
              </div>
            </div>
            <div className="orbe-header-actions">
              {/* Terminal Mode Toggle */}
              <button
                className={`orbe-action-btn ${isTerminalMode ? 'orbe-action-btn-active' : ''}`}
                onClick={toggleTerminalMode}
                title="Modo Console CLI"
                aria-label="Alternar modo terminal"
              >
                <TerminalIcon />
              </button>
              {/* Clear History */}
              {!isMinimized && messages.length > 1 && (
                <button
                  className="orbe-action-btn"
                  onClick={clearChat}
                  title="Limpar histórico"
                  aria-label="Limpar histórico da conversa"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/>
                  </svg>
                </button>
              )}
              <button
                className="orbe-action-btn"
                onClick={() => setIsMinimized((m) => !m)}
                aria-label={isMinimized ? 'Expandir chat' : 'Minimizar chat'}
                id="orbe-minimize-btn"
              >
                <MinimizeIcon />
              </button>
              <button
                className="orbe-action-btn"
                onClick={() => setIsOpen(false)}
                aria-label="Fechar chat"
                id="orbe-close-btn"
              >
                <CloseIcon />
              </button>
            </div>
          </div>

          {/* System Status Panel Tray */}
          {showSystemStatus && !isMinimized && (
            <div className="orbe-status-panel">
              <div className="orbe-status-panel-title">
                <span>Infraestrutura Status</span>
                <span style={{ fontSize: '9px', opacity: 0.6 }}>ONLINE</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px' }}>
                <div>• DB Supabase: <span style={{ color: '#00ff88', fontWeight: 600 }}>Active</span></div>
                <div>• Gateway Ping: <span style={{ color: '#00fff5' }}>{metrics.ping}ms</span></div>
                <div>• Core RLS: <span style={{ color: '#00ff88', fontWeight: 600 }}>Protected (100%)</span></div>
                <div>• Nodes Ativos: <span style={{ color: '#00fff5' }}>{metrics.activeNodes} Nodes</span></div>
                <div>• CPU Load: <span style={{ color: '#ffd700' }}>{metrics.cpuLoad}%</span></div>
                <div>• Auditoria: <span style={{ color: '#00ff88' }}>Passou</span></div>
              </div>
            </div>
          )}

          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="orbe-messages" role="log" aria-live="polite" aria-label="Mensagens do chat">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`orbe-msg orbe-msg-${msg.role}`}
                  >
                    <div className={`orbe-bubble orbe-bubble-${msg.role}`}>
                      {renderContent(msg.content, isTerminalMode || msg.role === 'system')}
                    </div>
                    {msg.role !== 'system' && (
                      <div className="orbe-msg-time">{formatTime(msg.timestamp)}</div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="orbe-msg orbe-msg-assistant">
                    <div className="orbe-bubble orbe-bubble-assistant">
                      <TypingDots />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Suggestions */}
              {!isTerminalMode && messages.length <= 1 && !isLoading && (
                <div className="orbe-suggestions">
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      className="orbe-suggestion-btn"
                      onClick={() => sendMessage(q)}
                      id={`orbe-suggestion-${q.replace(/\s+/g, '-').toLowerCase().slice(0, 30)}`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="orbe-input-area">
                {isTerminalMode && (
                  <span className="orbe-input-prompt-label">&gt;</span>
                )}
                <textarea
                  ref={inputRef}
                  className="orbe-textarea"
                  placeholder={isTerminalMode ? "digite comandos... (ex: /help)" : "Pergunte sobre a Orbe Systems..."}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
                  }}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  rows={1}
                  id="orbe-chat-input"
                  aria-label="Digite sua mensagem"
                />
                <button
                  className="orbe-send-btn"
                  onClick={() => sendMessage(input)}
                  disabled={isLoading || !input.trim()}
                  aria-label="Enviar mensagem"
                  id="orbe-send-btn"
                >
                  <SendIcon />
                </button>
              </div>

              <div className="orbe-powered-by" aria-hidden>
                ⚡ powered by Gemini AI · Orbe Systems
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
