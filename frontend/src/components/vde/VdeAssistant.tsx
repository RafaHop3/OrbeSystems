'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bot, Send, Loader2, CheckCircle, XCircle, Cpu, Shield,
  FileText, Sparkles, Trash2, ChevronDown, ChevronUp,
  Activity, Copy, Check, TerminalSquare, Zap, BrainCircuit
} from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  jobId?: string;
}

interface Job {
  job_id: string;
  user_prompt: string;
  action: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  started_at: string;
  completed_at: string | null;
  result: any;
  error: string | null;
}

// ─── Thinking phases shown while loading ─────────────────────────────────────

const THINKING_PHRASES = [
  'Classificando intenção com o OrbeOfflinePlanner...',
  'Consultando o motor de inferência...',
  'Analisando contexto e parâmetros...',
  'Despachando tarefa para o daemon offline...',
  'Aguardando confirmação do agente...',
];

function ThinkingIndicator() {
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [charIdx, setCharIdx] = useState(0);

  // Typewriter per phrase
  useEffect(() => {
    const phrase = THINKING_PHRASES[phraseIdx % THINKING_PHRASES.length];
    if (charIdx < phrase.length) {
      const t = setTimeout(() => {
        setDisplayed(phrase.slice(0, charIdx + 1));
        setCharIdx(c => c + 1);
      }, 22);
      return () => clearTimeout(t);
    } else {
      // Pause then next phrase
      const t = setTimeout(() => {
        setPhraseIdx(i => i + 1);
        setCharIdx(0);
        setDisplayed('');
      }, 1200);
      return () => clearTimeout(t);
    }
  }, [charIdx, phraseIdx]);

  return (
    <div className="flex gap-2 items-end">
      <div className="w-6 h-6 rounded-full bg-neon-cyan/15 border border-neon-cyan/30 flex items-center justify-center shrink-0">
        <BrainCircuit size={12} className="text-neon-cyan animate-pulse" />
      </div>
      <div className="bg-white/5 border border-white/8 rounded-2xl rounded-bl-sm px-3 py-2.5 max-w-[80%]">
        <div className="flex items-center gap-1.5 mb-1">
          {[0, 0.12, 0.24].map((d, i) => (
            <span
              key={i}
              className="w-1 h-1 rounded-full bg-neon-cyan/50 animate-bounce"
              style={{ animationDelay: `${d}s` }}
            />
          ))}
        </div>
        <p className="font-mono text-[10px] text-neon-cyan/70 leading-relaxed min-h-[14px]">
          {displayed}
          <span className="animate-pulse">▍</span>
        </p>
      </div>
    </div>
  );
}

// ─── Code block with copy ─────────────────────────────────────────────────────

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="my-1.5 rounded-lg border border-white/10 overflow-hidden text-[10px]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 border-b border-white/10">
        <span className="font-mono text-terminal-muted">{lang || 'code'}</span>
        <button onClick={copy} className="flex items-center gap-1 text-terminal-muted hover:text-white transition-colors">
          {copied ? <Check size={10} className="text-neon-green" /> : <Copy size={10} />}
          <span>{copied ? 'copiado' : 'copiar'}</span>
        </button>
      </div>
      <pre className="p-3 overflow-x-auto font-mono text-[10px] leading-relaxed text-neon-green bg-black/40 whitespace-pre-wrap break-words max-h-40">
        {code}
      </pre>
    </div>
  );
}

// ─── Inline text with bold/code support ──────────────────────────────────────

function InlineText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div>
      {lines.map((line, i) => {
        if (line === '') return <div key={i} className="h-1.5" />;
        const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((p, j) => {
          if (p.startsWith('**') && p.endsWith('**'))
            return <strong key={j} className="text-white font-semibold">{p.slice(2, -2)}</strong>;
          if (p.startsWith('`') && p.endsWith('`'))
            return <code key={j} className="bg-white/10 text-neon-cyan px-1 rounded font-mono text-[10px]">{p.slice(1, -1)}</code>;
          return <span key={j}>{p}</span>;
        });
        return <p key={i} className="leading-relaxed">{parts}</p>;
      })}
    </div>
  );
}

function renderContent(text: string) {
  const nodes: React.ReactNode[] = [];
  const re = /```(\w*)\n?([\s\S]*?)```/g;
  let last = 0, m: RegExpExecArray | null, k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(<InlineText key={k++} text={text.slice(last, m.index)} />);
    nodes.push(<CodeBlock key={k++} lang={m[1] || undefined} code={m[2].trim()} />);
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(<InlineText key={k++} text={text.slice(last)} />);
  return nodes;
}

// ─── Job result card ──────────────────────────────────────────────────────────

function JobResultCard({ job }: { job: Job }) {
  const [open, setOpen] = useState(false);
  const dot = job.status === 'success' ? 'bg-neon-green' : job.status === 'failed' ? 'bg-red-500' : 'bg-yellow-400 animate-pulse';

  return (
    <div className="mt-1.5 border border-white/8 rounded-xl overflow-hidden bg-black/20 text-[10px] font-mono">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-colors">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
          <span className="text-terminal-muted">{job.action.toUpperCase()}</span>
          {(job.status === 'pending' || job.status === 'running') &&
            <Loader2 size={9} className="animate-spin text-yellow-400" />}
          {job.status === 'success' && <CheckCircle size={9} className="text-neon-green" />}
          {job.status === 'failed' && <XCircle size={9} className="text-red-400" />}
        </div>
        {open ? <ChevronUp size={10} className="text-terminal-muted" /> : <ChevronDown size={10} className="text-terminal-muted" />}
      </button>

      {open && (
        <div className="px-3 pb-3 pt-1 border-t border-white/5 space-y-1.5">
          <div className="text-white/30">id: {job.job_id}</div>
          {job.error && <div className="p-2 bg-red-500/10 border border-red-500/20 rounded text-red-400">{job.error}</div>}

          {job.status === 'success' && job.result && (
            <>
              {job.action === 'compile_avr' && (
                <div className="space-y-1.5">
                  <div className="flex gap-4 text-[10px]">
                    <span><Cpu size={9} className="inline mr-1 text-neon-cyan" />Z3: <b className={job.result.z3_verified ? 'text-neon-green' : 'text-red-400'}>{job.result.z3_verified ? 'APROVADO' : 'FALHOU'}</b></span>
                    <span><Sparkles size={9} className="inline mr-1 text-neon-cyan" />Fuzz: <b className={job.result.fuzz_verified ? 'text-neon-green' : 'text-red-400'}>{job.result.fuzz_verified ? 'OK (150 runs)' : 'FALHOU'}</b></span>
                  </div>
                  {job.result.cpp_code && <CodeBlock lang="cpp" code={job.result.cpp_code} />}
                </div>
              )}
              {job.action === 'security_audit' && (
                <div className="space-y-1">
                  <div><Shield size={9} className="inline mr-1 text-neon-purple" />
                    Score: <span className={`font-bold ${job.result.security_score >= 75 ? 'text-neon-green' : job.result.security_score >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {job.result.security_score}/100 ({job.result.risk_level})</span>
                  </div>
                  {job.result.findings?.map((f: any, i: number) => (
                    <div key={i} className="p-1.5 bg-white/5 rounded">
                      <span className="text-red-400">[{f.severity}]</span> {f.description}
                    </div>
                  ))}
                </div>
              )}
              {job.action === 'generate_document' && job.result.document &&
                <CodeBlock lang="markdown" code={job.result.document} />}
              {job.action === 'compress_data' && job.result.telemetry && (
                <div className="grid grid-cols-2 gap-1 p-2 bg-black/30 rounded">
                  <span>Original: {job.result.telemetry.original_size_bytes}B</span>
                  <span>Comprimido: {job.result.telemetry.compressed_size_bytes}B</span>
                  <span>Razão: {job.result.telemetry.compression_ratio}x</span>
                  <span className="text-neon-green">↓ {job.result.telemetry.saving_percentage}</span>
                </div>
              )}
              {job.action === 'convert_data' && job.result.converted_content &&
                <CodeBlock code={job.result.converted_content} />}
              {job.action === 'chat_respond' && job.result.response?.explanation &&
                <div className="text-gray-300 font-sans">{job.result.response.explanation}</div>}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Chat Bubble ──────────────────────────────────────────────────────────────

function ChatBubble({ msg, job }: { msg: ChatMessage; job?: Job }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end`}>
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-neon-cyan/15 border border-neon-cyan/30 flex items-center justify-center shrink-0 mb-0.5">
          <Bot size={12} className="text-neon-cyan" />
        </div>
      )}
      <div className={`max-w-[84%] flex flex-col ${isUser ? 'items-end' : 'items-start'} gap-0.5`}>
        <div className={`rounded-2xl px-3 py-2 text-xs leading-relaxed ${isUser
          ? 'bg-neon-cyan/15 border border-neon-cyan/25 text-white rounded-br-sm'
          : 'bg-white/5 border border-white/8 text-gray-200 rounded-bl-sm'}`}>
          {renderContent(msg.content)}
        </div>
        {!isUser && job && <JobResultCard job={job} />}
      </div>
    </div>
  );
}

// ─── Quick suggestions ────────────────────────────────────────────────────────

const SUGGESTIONS = [
  { icon: <TerminalSquare size={10} />, label: 'piscar LED pino 13' },
  { icon: <Shield size={10} />, label: 'auditar Set-ExecutionPolicy Bypass' },
  { icon: <FileText size={10} />, label: 'gerar relatório de auditoria RLS' },
  { icon: <Zap size={10} />, label: 'comprimir payload de telemetria' },
];

// ─── Welcome message (stable, no Date) ───────────────────────────────────────

const WELCOME: ChatMessage = {
  id: 'orbe-welcome',
  role: 'assistant',
  content: `Olá! Sou o **Orbe Assistant** — seu copiloto no ambiente virtual.\n\nFale comigo em linguagem natural. Enquanto conversamos, processo tarefas **offline em background**: compilação AVR com prova formal Z3, auditoria SAST de scripts PowerShell, geração de documentos e conversão de dados.\n\nComo posso ajudar?`,
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function VdeAssistant() {
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<Record<string, Job>>({});
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Avoid hydration mismatch — render nothing interactive until mounted
  useEffect(() => { setMounted(true); }, []);

  const scrollDown = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
  }, []);

  const fetchJobs = useCallback(async () => {
    try {
      const token = typeof window !== 'undefined'
        ? (localStorage.getItem('orbe_admin_token') || localStorage.getItem('orbe_auth_token'))
        : null;
      const res = await fetch(`${API_BASE_URL}/api/offline-agent/jobs`, {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
      if (res.ok) {
        const list: Job[] = await res.json();
        setJobs(prev => {
          const next: Record<string, Job> = {};
          list.forEach(j => { next[j.job_id] = j; });
          return next;
        });
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchJobs();
    const id = setInterval(fetchJobs, 3000);
    return () => clearInterval(id);
  }, [fetchJobs]);

  useEffect(() => { scrollDown(); }, [messages, loading, scrollDown]);

  const getToken = () =>
    typeof window !== 'undefined'
      ? (localStorage.getItem('orbe_admin_token') || localStorage.getItem('orbe_auth_token'))
      : null;

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = '20px';
    setLoading(true);

    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/offline-agent/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ prompt: text.trim() })
      });

      if (res.ok) {
        const data = await res.json();
        const reply: ChatMessage = {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: data.explanation ||
            `Entendido! Tarefa **${data.action || 'offline'}** despachada para o daemon.\nAcompanhe o resultado no card abaixo — atualiza automaticamente.`,
          jobId: data.job_id,
        };
        setMessages(prev => [...prev, reply]);
        fetchJobs();
      } else {
        setMessages(prev => [...prev, {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ Backend offline não respondeu (status ${res.status}). Verifique se a API está rodando.`,
        }]);
      }
    } catch {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `**Erro de conexão.** Execute \`uvicorn main:app --reload\` no diretório \`backend/\` e tente novamente.`,
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  const pendingCount = Object.values(jobs).filter(j => j.status === 'pending' || j.status === 'running').length;
  const showSuggestions = messages.length <= 1 && !loading;

  // Prevent SSR / hydration mismatch
  if (!mounted) return (
    <aside className="w-full lg:w-[380px] shrink-0 m-3 lg:m-4 rounded-xl border border-neon-cyan/20 bg-black/80 flex items-center justify-center min-h-[200px]">
      <Loader2 size={20} className="text-neon-cyan animate-spin" />
    </aside>
  );

  return (
    <aside
      className="w-full lg:w-[380px] shrink-0 m-3 lg:m-4 rounded-xl border border-neon-cyan/20 overflow-hidden flex flex-col max-h-[calc(100vh-120px)] shadow-[0_0_40px_rgba(0,255,245,0.05)]"
      style={{ background: 'rgba(9,11,15,0.93)', backdropFilter: 'blur(24px)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-black/30 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-7 h-7 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center">
              <Bot size={14} className="text-neon-cyan" />
            </div>
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-yellow-400 flex items-center justify-center text-[7px] font-bold text-black animate-pulse">
                {pendingCount}
              </span>
            )}
          </div>
          <div>
            <div className="text-xs font-semibold text-white leading-none">Orbe Assistant</div>
            <div className="flex items-center gap-1 mt-0.5">
              <Activity size={8} className="text-neon-green animate-pulse" />
              <span className="text-[9px] font-mono text-terminal-muted">guia do ambiente virtual</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => setMessages([WELCOME])}
          title="Limpar conversa"
          className="p-1.5 rounded-lg hover:bg-white/5 text-terminal-muted hover:text-white transition-colors"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10 min-h-0">
        {messages.map(msg => (
          <ChatBubble key={msg.id} msg={msg} job={msg.jobId ? jobs[msg.jobId] : undefined} />
        ))}

        {/* Thinking indicator while loading */}
        {loading && <ThinkingIndicator />}

        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {showSuggestions && (
        <div className="px-3 pb-2 grid grid-cols-2 gap-1.5 shrink-0">
          {SUGGESTIONS.map((s, i) => (
            <button
              key={i}
              onClick={() => send(s.label)}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-white/8 bg-white/3 hover:bg-white/8 hover:border-neon-cyan/25 text-[10px] text-terminal-muted hover:text-white transition-all text-left gap-x-2"
            >
              <span className="text-neon-cyan/60 shrink-0">{s.icon}</span>
              <span className="truncate">{s.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-3 pb-3 pt-2 border-t border-white/5 shrink-0">
        <div className="flex gap-2 items-end bg-white/4 border border-white/10 rounded-xl px-3 py-2 focus-within:border-neon-cyan/40 focus-within:shadow-[0_0_12px_rgba(0,255,245,0.07)] transition-all">
          <textarea
            ref={(el) => { (inputRef as any).current = el; (textareaRef as any).current = el; }}
            rows={1}
            value={input}
            onChange={e => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
            onKeyDown={handleKey}
            placeholder="Escreva em dialeto comum… (Enter envia)"
            disabled={loading}
            className="flex-1 bg-transparent text-xs text-white placeholder-terminal-muted/40 outline-none resize-none font-sans leading-relaxed scrollbar-thin"
            style={{ minHeight: '20px', maxHeight: '120px', height: '20px' }}
          />
          <button
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            className="w-7 h-7 rounded-lg bg-neon-cyan/20 hover:bg-neon-cyan/30 border border-neon-cyan/30 flex items-center justify-center text-neon-cyan disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          </button>
        </div>
        <p className="text-center text-[8px] text-terminal-muted/25 mt-1.5 font-mono select-none">
          Shift+Enter nova linha · agente processa offline em background
        </p>
      </div>
    </aside>
  );
}
