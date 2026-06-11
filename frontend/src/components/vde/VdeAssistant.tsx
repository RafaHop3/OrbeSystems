'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bot, Send, Loader2, CheckCircle, XCircle, Cpu, Shield,
  FileText, Sparkles, Trash2, ChevronDown, ChevronUp,
  Activity, Copy, Check, TerminalSquare, Zap
} from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
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

// ─── Markdown-like renderer (no external deps) ────────────────────────────────

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="my-2 rounded-lg border border-white/10 overflow-hidden text-[10px]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 border-b border-white/10">
        <span className="font-mono text-terminal-muted">{lang || 'code'}</span>
        <button onClick={copy} className="flex items-center gap-1 text-terminal-muted hover:text-white transition-colors">
          {copied ? <Check size={10} className="text-neon-green" /> : <Copy size={10} />}
          {copied ? 'copiado' : 'copiar'}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto font-mono text-[10px] leading-relaxed text-neon-green bg-black/40 scrollbar-thin whitespace-pre-wrap break-words">
        {code}
      </pre>
    </div>
  );
}

function renderContent(text: string) {
  const parts: React.ReactNode[] = [];
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let last = 0, match: RegExpExecArray | null, idx = 0;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(<InlineText key={idx++} text={text.slice(last, match.index)} />);
    }
    parts.push(<CodeBlock key={idx++} lang={match[1] || undefined} code={match[2].trim()} />);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(<InlineText key={idx++} text={text.slice(last)} />);
  return parts;
}

function InlineText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-0.5">
      {lines.map((line, i) => {
        // bold **text**
        const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((p, j) => {
          if (p.startsWith('**') && p.endsWith('**'))
            return <strong key={j} className="text-white font-semibold">{p.slice(2, -2)}</strong>;
          if (p.startsWith('`') && p.endsWith('`'))
            return <code key={j} className="bg-white/10 text-neon-cyan px-1 rounded font-mono text-[10px]">{p.slice(1, -1)}</code>;
          return p;
        });
        return <p key={i} className={line === '' ? 'h-2' : 'leading-relaxed'}>{parts}</p>;
      })}
    </div>
  );
}

// ─── Job result card ──────────────────────────────────────────────────────────

function JobResultCard({ job }: { job: Job }) {
  const [open, setOpen] = useState(false);
  const statusColor = job.status === 'success' ? 'text-neon-green' : job.status === 'failed' ? 'text-red-400' : 'text-yellow-400';
  const dotColor = job.status === 'success' ? 'bg-neon-green' : job.status === 'failed' ? 'bg-red-500' : 'bg-yellow-400 animate-pulse';

  return (
    <div className="mt-2 border border-white/8 rounded-lg overflow-hidden bg-black/20 text-[10px]">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
          <span className="font-mono text-terminal-muted">{job.action.toUpperCase()}</span>
          {(job.status === 'pending' || job.status === 'running') && <Loader2 size={10} className="animate-spin text-yellow-400" />}
          {job.status === 'success' && <CheckCircle size={10} className="text-neon-green" />}
          {job.status === 'failed' && <XCircle size={10} className="text-red-400" />}
        </div>
        {open ? <ChevronUp size={10} className="text-terminal-muted" /> : <ChevronDown size={10} className="text-terminal-muted" />}
      </button>

      {open && (
        <div className="px-3 pb-3 pt-1 border-t border-white/5 space-y-2 font-mono">
          <div className="text-terminal-muted/60">Job: <span className="text-white/40">{job.job_id}</span></div>

          {job.error && (
            <div className="p-2 bg-red-500/10 border border-red-500/20 rounded text-red-400">{job.error}</div>
          )}

          {job.status === 'success' && job.result && (
            <>
              {job.action === 'compile_avr' && (
                <div className="space-y-2">
                  <div className="flex gap-4">
                    <span className="flex items-center gap-1"><Cpu size={10} className="text-neon-cyan" /> Z3: <b className={job.result.z3_verified ? 'text-neon-green' : 'text-red-400'}>{job.result.z3_verified ? 'OK' : 'FALHOU'}</b></span>
                    <span className="flex items-center gap-1"><Sparkles size={10} className="text-neon-cyan" /> Fuzz: <b className={job.result.fuzz_verified ? 'text-neon-green' : 'text-red-400'}>{job.result.fuzz_verified ? 'OK' : 'FALHOU'}</b></span>
                  </div>
                  {job.result.cpp_code && <CodeBlock lang="cpp" code={job.result.cpp_code} />}
                </div>
              )}
              {job.action === 'security_audit' && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Shield size={10} className="text-neon-purple" />
                    <span className={`font-bold ${job.result.security_score >= 75 ? 'text-neon-green' : job.result.security_score >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                      Score: {job.result.security_score}/100 ({job.result.risk_level})
                    </span>
                  </div>
                  {job.result.findings?.map((f: any, i: number) => (
                    <div key={i} className="p-1.5 bg-white/5 rounded"><span className="text-red-400">[{f.severity}]</span> {f.description}</div>
                  ))}
                </div>
              )}
              {job.action === 'generate_document' && job.result.document && (
                <div><FileText size={10} className="inline mr-1 text-neon-cyan" /><CodeBlock lang="markdown" code={job.result.document} /></div>
              )}
              {job.action === 'compress_data' && job.result.telemetry && (
                <div className="grid grid-cols-2 gap-1 p-2 bg-black/30 rounded">
                  <span>Original: {job.result.telemetry.original_size_bytes}B</span>
                  <span>Comprimido: {job.result.telemetry.compressed_size_bytes}B</span>
                  <span>Razão: {job.result.telemetry.compression_ratio}x</span>
                  <span className="text-neon-green font-bold">↓ {job.result.telemetry.saving_percentage}</span>
                </div>
              )}
              {job.action === 'convert_data' && job.result.converted_content && (
                <CodeBlock code={job.result.converted_content} />
              )}
              {job.action === 'chat_respond' && job.result.response?.explanation && (
                <div className="text-gray-300 font-sans leading-relaxed">{job.result.response.explanation}</div>
              )}
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
      <div className={`max-w-[82%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className={`rounded-2xl px-3 py-2 text-xs leading-relaxed ${
          isUser
            ? 'bg-neon-cyan/15 border border-neon-cyan/25 text-white rounded-br-sm'
            : 'bg-white/5 border border-white/8 text-gray-200 rounded-bl-sm'
        }`}>
          {renderContent(msg.content)}
        </div>
        <span className="text-[9px] text-terminal-muted/50 px-1">
          {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </span>
        {!isUser && job && <JobResultCard job={job} />}
      </div>
    </div>
  );
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex gap-2 items-end">
      <div className="w-6 h-6 rounded-full bg-neon-cyan/15 border border-neon-cyan/30 flex items-center justify-center shrink-0">
        <Bot size={12} className="text-neon-cyan" />
      </div>
      <div className="bg-white/5 border border-white/8 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5 items-center">
        {[0, 0.15, 0.3].map((d, i) => (
          <span key={i} className="w-1.5 h-1.5 rounded-full bg-neon-cyan/60 animate-bounce" style={{ animationDelay: `${d}s` }} />
        ))}
      </div>
    </div>
  );
}

// ─── Suggestion chips ─────────────────────────────────────────────────────────

const SUGGESTIONS = [
  { icon: <TerminalSquare size={10} />, text: 'piscar LED pino 13' },
  { icon: <Shield size={10} />, text: 'auditar Set-ExecutionPolicy Bypass' },
  { icon: <FileText size={10} />, text: 'gerar relatório de auditoria RLS' },
  { icon: <Zap size={10} />, text: 'comprime esse payload de telemetria' },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function VdeAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Olá! Sou o **Orbe Assistant** — seu copiloto no ambiente virtual.\n\nFale comigo em linguagem comum. Enquanto conversamos, processo tarefas **offline em background**: compilação AVR com prova formal Z3, auditoria SAST de scripts, geração de documentos e muito mais.\n\nComo posso ajudar?`,
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<Record<string, Job>>({});
  const [jobCount, setJobCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, []);

  // Poll background jobs
  const fetchJobs = useCallback(async () => {
    try {
      const token = localStorage.getItem('orbe_admin_token') || localStorage.getItem('orbe_auth_token');
      const res = await fetch(`${API_BASE_URL}/api/offline-agent/jobs`, {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
      if (res.ok) {
        const list: Job[] = await res.json();
        const map: Record<string, Job> = {};
        list.forEach(j => { map[j.job_id] = j; });
        setJobs(map);
        setJobCount(list.length);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 3000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  useEffect(() => { scrollToBottom(); }, [messages, loading]);

  const getToken = () =>
    localStorage.getItem('orbe_admin_token') || localStorage.getItem('orbe_auth_token');

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/offline-agent/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': getToken() ? `Bearer ${getToken()}` : ''
        },
        body: JSON.stringify({ prompt: text.trim() })
      });

      if (res.ok) {
        const data = await res.json();
        const assistantMsg: ChatMessage = {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: data.explanation ||
            `Entendido! Executando **${data.action || 'tarefa'}** em background.\nAcompanhe o progresso no card abaixo — o resultado aparece assim que concluir.`,
          timestamp: new Date(),
          jobId: data.job_id,
        };
        setMessages(prev => [...prev, assistantMsg]);
        fetchJobs();
      } else {
        setMessages(prev => [...prev, {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ Não consegui conectar ao agente offline. Verifique se o backend está rodando em \`${API_BASE_URL}\`.`,
          timestamp: new Date(),
        }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `**Erro de conexão:** O backend offline não está acessível. Execute \`uvicorn main:app --reload\` no diretório \`backend/\`.`,
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    setMessages([{
      id: 'welcome-2',
      role: 'assistant',
      content: 'Histórico limpo. Como posso ajudar?',
      timestamp: new Date(),
    }]);
  };

  const pendingJobs = Object.values(jobs).filter(j => j.status === 'pending' || j.status === 'running').length;

  return (
    <aside
      className="w-full lg:w-[380px] shrink-0 m-3 lg:m-4 rounded-xl border border-neon-cyan/20 overflow-hidden flex flex-col max-h-[calc(100vh-120px)] shadow-[0_0_40px_rgba(0,255,245,0.05)]"
      style={{ background: 'rgba(9, 11, 15, 0.92)', backdropFilter: 'blur(24px)' }}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-black/30">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-7 h-7 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center">
              <Bot size={14} className="text-neon-cyan" />
            </div>
            {pendingJobs > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-yellow-400 flex items-center justify-center text-[7px] font-bold text-black">
                {pendingJobs}
              </span>
            )}
          </div>
          <div>
            <div className="text-xs font-semibold text-white leading-none">Orbe Assistant</div>
            <div className="flex items-center gap-1 mt-0.5">
              <Activity size={8} className="text-neon-green animate-pulse" />
              <span className="text-[9px] font-mono text-terminal-muted">offline agent online</span>
            </div>
          </div>
        </div>
        <button
          onClick={clearChat}
          className="p-1.5 rounded-lg hover:bg-white/5 text-terminal-muted hover:text-white transition-colors"
          title="Limpar conversa"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
        {messages.map(msg => (
          <ChatBubble
            key={msg.id}
            msg={msg}
            job={msg.jobId ? jobs[msg.jobId] : undefined}
          />
        ))}
        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* ── Suggestions (only when no user messages yet) ── */}
      {messages.length <= 1 && !loading && (
        <div className="px-4 pb-3 grid grid-cols-2 gap-1.5">
          {SUGGESTIONS.map((s, i) => (
            <button
              key={i}
              onClick={() => sendMessage(s.text)}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-white/8 bg-white/3 hover:bg-white/8 hover:border-neon-cyan/20 text-[10px] text-terminal-muted hover:text-white transition-all text-left"
            >
              <span className="text-neon-cyan/60 shrink-0">{s.icon}</span>
              {s.text}
            </button>
          ))}
        </div>
      )}

      {/* ── Input ── */}
      <div className="px-3 pb-3 pt-1 border-t border-white/5">
        <div className="flex gap-2 items-end bg-white/4 border border-white/10 rounded-xl px-3 py-2 focus-within:border-neon-cyan/40 focus-within:shadow-[0_0_12px_rgba(0,255,245,0.08)] transition-all">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={e => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
            onKeyDown={handleKeyDown}
            placeholder="Escreva em dialeto comum… (Enter para enviar)"
            disabled={loading}
            className="flex-1 bg-transparent text-xs text-white placeholder-terminal-muted/50 outline-none resize-none font-sans leading-relaxed min-h-[20px] max-h-[120px] scrollbar-thin"
            style={{ height: '20px' }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="w-7 h-7 rounded-lg bg-neon-cyan/20 hover:bg-neon-cyan/30 border border-neon-cyan/30 flex items-center justify-center text-neon-cyan disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0 mb-0.5"
          >
            {loading
              ? <Loader2 size={12} className="animate-spin" />
              : <Send size={12} />
            }
          </button>
        </div>
        <p className="text-center text-[8px] text-terminal-muted/30 mt-1.5 font-mono">
          Shift+Enter para nova linha · agente processa offline em background
        </p>
      </div>
    </aside>
  );
}
