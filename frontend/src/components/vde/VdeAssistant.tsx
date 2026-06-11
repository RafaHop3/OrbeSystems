'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  HelpCircle, 
  MessageSquare, 
  Send, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Cpu, 
  Shield, 
  FileText, 
  BookOpen, 
  Sparkles, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Activity,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

const STEPS = [
  {
    title: 'Iniciando o ambiente Orbe VDE',
    body: 'Ambiente virtual no navegador: terminal, WebIDE e auditoria sem instalar IDEs pesadas na sua máquina. Soberania técnica direto no browser.',
  },
  {
    title: 'Terminal-first & cyber safety',
    body: 'Use a aba Terminal para comandos e logs. A aba WebIDE simula o fluxo de engenharia cirúrgica — consultoria e automação no ambiente do cliente.',
  },
  {
    title: 'Infraestrutura blindada',
    body: 'Explore IMORTAL e Imobverse nas ferramentas premium. RLS, auditoria e hardening fazem parte do ecossistema Orbe Systems.',
  },
];

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

export default function VdeAssistant() {
  const [activeTab, setActiveTab] = useState<'tutorial' | 'agent'>('agent');
  const [step, setStep] = useState(0);
  
  // Agent Chat state
  const [promptInput, setPromptInput] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  
  // Terminal audio simulation sound
  const playClick = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gain.gain.setValueAtTime(0.005, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.02);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.02);
    } catch (_) {}
  };

  // Fetch all background jobs on tab load and periodically
  const fetchJobs = async () => {
    try {
      const token = localStorage.getItem('orbe_admin_token') || localStorage.getItem('orbe_auth_token');
      const res = await fetch(`${API_BASE_URL}/api/offline-agent/jobs`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      }
    } catch (e) {
      console.warn("Failed to fetch offline jobs:", e);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 4000); // Poll every 4 seconds to catch background updates
    return () => clearInterval(interval);
  }, []);

  const handleSendPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim()) return;

    playClick();
    setLoading(true);
    const text = promptInput;
    setPromptInput('');

    try {
      const token = localStorage.getItem('orbe_admin_token') || localStorage.getItem('orbe_auth_token');
      const res = await fetch(`${API_BASE_URL}/api/offline-agent/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ prompt: text })
      });
      
      if (res.ok) {
        const data = await res.json();
        // Expand the newly created job
        setExpandedJobId(data.job_id);
        fetchJobs();
      }
    } catch (err) {
      console.error("Failed to submit offline job:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!confirm("Tem certeza que deseja limpar o histórico de tarefas do agente?")) return;
    playClick();
    try {
      const token = localStorage.getItem('orbe_admin_token') || localStorage.getItem('orbe_auth_token');
      await fetch(`${API_BASE_URL}/api/offline-agent/jobs`, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      setJobs([]);
      setExpandedJobId(null);
    } catch (e) {
      console.error("Failed to clear offline jobs:", e);
    }
  };

  const current = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <aside
      className="w-full lg:w-[360px] shrink-0 m-3 lg:m-4 rounded-xl border border-neon-cyan/20 overflow-hidden flex flex-col max-h-[calc(100vh-120px)] shadow-[0_0_30px_rgba(0,0,0,0.5)]"
      style={{
        background: 'rgba(10, 12, 16, 0.88)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Top Header tab bar */}
      <div className="flex bg-black/40 border-b border-white/5">
        <button
          onClick={() => { playClick(); setActiveTab('agent'); }}
          className={`flex-1 py-3 px-4 font-mono text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition-all ${
            activeTab === 'agent' 
              ? 'border-neon-cyan text-white bg-white/5' 
              : 'border-transparent text-terminal-muted hover:text-white'
          }`}
        >
          <Activity size={12} className={activeTab === 'agent' ? 'text-neon-cyan animate-pulse' : ''} />
          Agente Offline
        </button>
        <button
          onClick={() => { playClick(); setActiveTab('tutorial'); }}
          className={`flex-1 py-3 px-4 font-mono text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition-all ${
            activeTab === 'tutorial' 
              ? 'border-neon-cyan text-white bg-white/5' 
              : 'border-transparent text-terminal-muted hover:text-white'
          }`}
        >
          <BookOpen size={12} />
          Manual VDE
        </button>
      </div>

      {activeTab === 'tutorial' ? (
        // OLD TUTORIAL CONTENT
        <div className="flex-1 flex flex-col justify-between min-h-0">
          <div className="p-4 flex-1 overflow-y-auto">
            <h3 className="font-sans text-base font-bold text-white mb-3 leading-snug">
              {current.title}
            </h3>
            <p className="font-sans text-xs text-terminal-muted leading-relaxed">{current.body}</p>
            <div className="flex gap-2 mt-5">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { playClick(); setStep(i); }}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    i === step ? 'bg-neon-cyan' : 'bg-white/10 hover:bg-white/20'
                  }`}
                  aria-label={`Passo ${i + 1}`}
                />
              ))}
            </div>
          </div>

          <div className="p-4 border-t border-white/5 flex gap-2">
            <button
              type="button"
              onClick={() => { playClick(); alert("Pergunte ao Agente Offline na outra aba! Ele processa suas intenções offline."); }}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-white/10 bg-white/5 font-mono text-[10px] text-terminal-muted hover:text-white hover:border-neon-cyan/30 transition-colors"
            >
              <HelpCircle size={12} className="text-red-400" />
              perguntar
            </button>
            <button
              type="button"
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-white/10 bg-white/5 font-mono text-[10px] text-terminal-muted hover:text-white hover:border-neon-cyan/30 transition-colors"
            >
              <MessageSquare size={12} />
              feedback
            </button>
          </div>
        </div>
      ) : (
        // PROACTIVE OFFLINE AGENT CHAT & BACKGROUND MONITOR
        <div className="flex-1 flex flex-col min-h-0">
          {/* Active / Completed Jobs Feed */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 scrollbar-thin">
            <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-widest text-terminal-muted/60 mb-2">
              <span>Fila de Tarefas Offline</span>
              {jobs.length > 0 && (
                <button 
                  onClick={handleClearHistory} 
                  className="flex items-center gap-1 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={10} /> Limpar
                </button>
              )}
            </div>

            {jobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
                <Bot size={28} className="text-terminal-muted/40" />
                <p className="font-mono text-[10px] text-terminal-muted">
                  Nenhuma atividade offline rodando.<br />
                  Fale com a IA no campo abaixo em dialeto comum.
                </p>
                <div className="bg-white/5 p-2 rounded border border-white/5 text-[9px] text-terminal-muted max-w-xs leading-normal">
                  Experimente:<br />
                  <span className="text-neon-cyan/80">"piscar led no pino 13"</span><br />
                  <span className="text-neon-purple/80">"auditar Set-ExecutionPolicy Bypass"</span>
                </div>
              </div>
            ) : (
              jobs.map((job) => {
                const isExpanded = expandedJobId === job.job_id;
                
                return (
                  <div 
                    key={job.job_id} 
                    className="border border-white/5 rounded-lg bg-black/20 overflow-hidden text-xs transition-all duration-300"
                  >
                    {/* Job Header */}
                    <div 
                      onClick={() => { playClick(); setExpandedJobId(isExpanded ? null : job.job_id); }}
                      className="p-3 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                    >
                      <div className="space-y-0.5 max-w-[80%]">
                        <div className="font-mono text-[9px] text-terminal-muted flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            job.status === 'success' ? 'bg-neon-green' :
                            job.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'
                          }`} />
                          {job.action.toUpperCase()}
                        </div>
                        <div className="font-sans text-white/90 truncate font-medium">
                          {job.user_prompt}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 text-terminal-muted">
                        {job.status === 'pending' || job.status === 'running' ? (
                          <Loader2 size={12} className="animate-spin text-yellow-500" />
                        ) : job.status === 'success' ? (
                          <CheckCircle size={12} className="text-neon-green" />
                        ) : (
                          <XCircle size={12} className="text-red-500" />
                        )}
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </div>
                    </div>

                    {/* Expanded Content (Technical Results) */}
                    {isExpanded && (
                      <div className="p-3 border-t border-white/5 bg-black/45 space-y-2 text-[10px] font-mono leading-relaxed text-terminal-muted border-dashed">
                        <div>
                          <span className="text-neon-cyan">Job ID:</span> {job.job_id}
                        </div>
                        
                        {job.error && (
                          <div className="text-red-400 p-2 bg-red-500/10 border border-red-500/20 rounded">
                            <span className="font-bold">Error:</span> {job.error}
                          </div>
                        )}

                        {/* Renders result depending on action */}
                        {job.status === 'success' && job.result && (
                          <div className="space-y-2 pt-1 border-t border-white/5">
                            {job.action === 'compile_avr' && (
                              <>
                                <div className="flex items-center gap-2">
                                  <Cpu size={12} className="text-neon-cyan" />
                                  <span>Prova Formal (Z3):</span>
                                  <span className={job.result.z3_verified ? 'text-neon-green font-bold' : 'text-red-400 font-bold'}>
                                    {job.result.z3_verified ? 'APROVADA' : 'FALHOU'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Sparkles size={12} className="text-neon-cyan" />
                                  <span>Fuzzing Sandbox:</span>
                                  <span className={job.result.fuzz_verified ? 'text-neon-green font-bold' : 'text-red-400 font-bold'}>
                                    {job.result.fuzz_verified ? 'APROVADO (150 runs)' : 'FALHOU'}
                                  </span>
                                </div>
                                
                                {job.result.cpp_code && (
                                  <div className="space-y-1">
                                    <div className="text-white">Código Fonte C++ Gerado:</div>
                                    <pre className="bg-black/50 p-2 rounded border border-white/5 overflow-x-auto text-[9px] max-h-32 scrollbar-thin text-neon-green">
                                      {job.result.cpp_code}
                                    </pre>
                                  </div>
                                )}
                              </>
                            )}

                            {job.action === 'security_audit' && (
                              <>
                                <div className="flex items-center gap-2">
                                  <Shield size={12} className="text-neon-purple" />
                                  <span>Score de Segurança:</span>
                                  <span className={`font-bold ${
                                    job.result.security_score >= 75 ? 'text-neon-green' :
                                    job.result.security_score >= 40 ? 'text-yellow-500' : 'text-red-500'
                                  }`}>
                                    {job.result.security_score} / 100 ({job.result.risk_level})
                                  </span>
                                </div>
                                
                                {job.result.findings && job.result.findings.length > 0 ? (
                                  <div className="space-y-1.5">
                                    <div className="text-white">Pontos Críticos Identificados:</div>
                                    <div className="space-y-1">
                                      {job.result.findings.map((f: any, idx: number) => (
                                        <div key={idx} className="p-1.5 bg-white/5 rounded border border-white/5">
                                          <span className="text-red-400 font-bold">[{f.severity}]</span> {f.description}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-neon-green">✓ Nenhum risco de segurança encontrado no script.</div>
                                )}
                              </>
                            )}

                            {job.action === 'generate_document' && (
                              <div className="space-y-1">
                                <div className="text-white flex items-center gap-1">
                                  <FileText size={12} className="text-neon-cyan" />
                                  Documento Gerado (Markdown):
                                </div>
                                <pre className="bg-black/50 p-2 rounded border border-white/5 overflow-x-auto text-[9px] max-h-32 scrollbar-thin text-gray-300 whitespace-pre-wrap">
                                  {job.result.document}
                                </pre>
                              </div>
                            )}

                            {job.action === 'compress_data' && job.result.telemetry && (
                              <div className="space-y-1">
                                <div className="text-white">Métricas de Otimização:</div>
                                <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-black/50 rounded border border-white/5 text-[9px]">
                                  <div>Original: {job.result.telemetry.original_size_bytes} B</div>
                                  <div>Comprimido: {job.result.telemetry.compressed_size_bytes} B</div>
                                  <div>Razão: {job.result.telemetry.compression_ratio}x</div>
                                  <div className="text-neon-green font-bold">Economia: {job.result.telemetry.saving_percentage}</div>
                                </div>
                              </div>
                            )}

                            {job.action === 'convert_data' && (
                              <div className="space-y-1">
                                <div className="text-white">Resultado da Conversão:</div>
                                <pre className="bg-black/50 p-2 rounded border border-white/5 overflow-x-auto text-[9px] max-h-32 scrollbar-thin text-neon-cyan whitespace-pre-wrap">
                                  {job.result.converted_content}
                                </pre>
                              </div>
                            )}

                            {job.action === 'chat_respond' && job.result.response && (
                              <div className="p-2 bg-black/30 rounded border border-white/5 text-gray-300 font-sans leading-relaxed">
                                {job.result.response.explanation}
                                {job.result.response.warnings && job.result.response.warnings.length > 0 && (
                                  <div className="mt-1.5 border-t border-white/5 pt-1.5 space-y-0.5 text-[9px] text-yellow-500 font-mono">
                                    {job.result.response.warnings.map((w: string, idx: number) => (
                                      <div key={idx}>⚠️ {w}</div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Chat dialog inputs */}
          <form 
            onSubmit={handleSendPrompt}
            className="p-3 border-t border-white/5 bg-[#12161f]/80 flex gap-2 items-center"
          >
            <input 
              type="text"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="Escreva em dialeto comum..."
              disabled={loading}
              className="flex-1 min-w-0 bg-[#0d1117] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-terminal-muted/60 outline-none focus:border-neon-cyan/50 focus:shadow-[0_0_10px_rgba(0,255,245,0.1)] font-sans transition-all"
            />
            <button
              type="submit"
              disabled={loading || !promptInput.trim()}
              className="w-8 h-8 rounded-lg bg-neon-cyan/15 hover:bg-neon-cyan/20 border border-neon-cyan/30 flex items-center justify-center text-neon-cyan disabled:opacity-40 disabled:hover:bg-transparent transition-colors shrink-0"
              aria-label="Enviar"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </form>
        </div>
      )}
    </aside>
  );
}
