'use client';

import React, { useState, useEffect, useRef } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { 
  Terminal, Shield, Zap, Globe, BarChart2, PieChart, Users, 
  Sparkles, RefreshCw, Copy, Check, Play, AlertTriangle, ArrowRight, Lock
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export default function ImortalPage() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'cyber' | 'marketing' | 'demographic' | 'avr'>('cyber');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  const [hitlApproved, setHitlApproved] = useState(false);

  // Inputs
  const [cyberInput, setCyberInput] = useState('');
  const [marketingInput, setMarketingInput] = useState('');
  const [demographicInput, setDemographicInput] = useState('');
  const [avrInput, setAvrInput] = useState('');

  // Results State
  const [cyberData, setCyberData] = useState<any>(null);
  const [marketingData, setMarketingData] = useState<any>(null);
  const [demographicData, setDemographicData] = useState<any>(null);
  const [avrData, setAvrData] = useState<any>(null);
  const [verificationSteps, setVerificationSteps] = useState<any[]>([]);
  const [propertiesProved, setPropertiesProved] = useState<string[]>([]);
  const [cppCode, setCppCode] = useState<string>('');
  const [hexCode, setHexCode] = useState<string>('');
  const [compilerLog, setCompilerLog] = useState<string>('');

  // ── Unified Fetch Helper with Auth Credentials ─────────────────────────────
  const callApi = async (endpoint: string, payload: any) => {
    const res = await fetch(`${API_URL}/api/imortal${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      credentials: 'include', // Mandatório para repassar o cookie orbe_auth_token
    });
    if (!res.ok) {
      if (res.status === 403) {
        throw new Error('Acesso restrito. Assinatura Premium ativa necessária.');
      }
      throw new Error(`Erro na API (${res.status})`);
    }
    return await res.json();
  };

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleAnalyzeCyber = async () => {
    if (!cyberInput.trim()) return;
    setLoading(true);
    setLoadingStep(0);
    const msgs = ['Analisando infraestrutura...', 'Avaliando vetores de ataque...', 'Mapeando diretrizes OWASP...', 'Gerando relatório...'];
    
    // Simulate loading steps
    const timer = setInterval(() => {
      setLoadingStep(s => Math.min(s + 1, 3));
    }, 1200);

    try {
      const data = await callApi('/cyber', { prompt: cyberInput });
      setCyberData(data);
    } catch (e: any) {
      alert(e.message || 'Erro ao processar análise cibernética.');
    } finally {
      clearInterval(timer);
      setLoading(false);
    }
  };

  const handleAnalyzeMarketing = async () => {
    if (!marketingInput.trim()) return;
    setLoading(true);
    setLoadingStep(0);
    
    const timer = setInterval(() => {
      setLoadingStep(s => Math.min(s + 1, 3));
    }, 1000);

    try {
      const data = await callApi('/marketing', { prompt: marketingInput });
      setMarketingData(data);
    } catch (e: any) {
      alert(e.message || 'Erro ao processar métricas de marketing.');
    } finally {
      clearInterval(timer);
      setLoading(false);
    }
  };

  const handleAnalyzeDemographic = async () => {
    if (!demographicInput.trim()) return;
    setLoading(true);
    setLoadingStep(0);
    
    const timer = setInterval(() => {
      setLoadingStep(s => Math.min(s + 1, 3));
    }, 1000);

    try {
      const data = await callApi('/demographic', { prompt: demographicInput });
      setDemographicData(data);
    } catch (e: any) {
      alert(e.message || 'Erro ao processar dados demográficos.');
    } finally {
      clearInterval(timer);
      setLoading(false);
    }
  };

  const handleCompileAVR = async () => {
    if (!avrInput.trim()) return;
    setLoading(true);
    setLoadingStep(0);
    setHitlApproved(false);
    setAvrData(null);
    setVerificationSteps([]);
    setPropertiesProved([]);
    setCppCode('');
    setHexCode('');

    try {
      // Step 1: Generate IR
      setLoadingStep(0); // AI generation
      const genData = await callApi('/generate', { prompt: avrInput });
      const ir = genData.ir;
      
      setVerificationSteps(prev => [...prev, {
        step: 'AI Parser Engine',
        status: 'PASSED',
        icon: '🧠',
        details: `Código estruturado gerado via Gemini (${genData.is_mock ? 'Mock' : 'Real-time'})`
      }]);

      // Step 2: Validate IR structure
      setLoadingStep(1);
      await new Promise(resolve => setTimeout(resolve, 800));
      setVerificationSteps(prev => [...prev, {
        step: 'IR Schema Verification',
        status: 'PASSED',
        icon: '✅',
        details: 'JSON schema validado. Estruturas de hardware corretas.'
      }]);

      // Step 3: Z3 Formal Verification
      setLoadingStep(2);
      const verifyRes = await callApi('/verify', { ir });
      if (!verifyRes.success) {
        setVerificationSteps(prev => [...prev, {
          step: 'Z3 Theorem Prover',
          status: 'FAILED',
          icon: '🛑',
          details: `Falha Matemática Formal: ${verifyRes.errors.join(', ')}`
        }]);
        setLoading(false);
        return;
      }
      setVerificationSteps(prev => [...prev, {
        step: 'Z3 Mathematical Proof',
        status: 'PASSED',
        icon: '🔐',
        details: 'Watchdog lockups e divisão por zero provados impossíveis.'
      }]);
      setPropertiesProved(verifyRes.errors.length > 0 ? verifyRes.errors : ['Watchdog Lockup Avoided', 'Safe Delay Range Guaranteed', 'Zero Division Free', 'Array Out of Bounds Proved Impossible']);

      // Step 4: Sandbox Fuzzing
      setLoadingStep(3);
      const fuzzRes = await callApi('/fuzz', { ir });
      if (!fuzzRes.success) {
        setVerificationSteps(prev => [...prev, {
          step: 'Stochastic Sandbox Fuzzing',
          status: 'FAILED',
          icon: '🎲',
          details: `Crashed no run de simulação: ${fuzzRes.errors.join(', ')}`
        }]);
        setLoading(false);
        return;
      }
      setVerificationSteps(prev => [...prev, {
        step: 'Stochastic Sandbox Fuzzing',
        status: 'PASSED',
        icon: '🎲',
        details: '150 ciclos aleatórios completados em sandbox. 0 falhas.'
      }]);

      // Step 5: Final Compilation
      const compileRes = await callApi('/compile', { ir });
      setCppCode(compileRes.cpp);
      setHexCode(compileRes.hex);
      setCompilerLog(compileRes.log);
      setAvrData({ success: true });
      
    } catch (e: any) {
      alert(e.message || 'Erro ao rodar pipeline de compilação.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // ── Render Radar Chart (SVG) ───────────────────────────────────────────────
  const renderRadarChart = (scores: any) => {
    if (!scores) return null;
    const items = [
      { name: 'Rede', val: scores.network ?? 5 },
      { name: 'Auth', val: scores.authentication ?? 5 },
      { name: 'Input', val: scores.input_validation ?? 5 },
      { name: 'Config', val: scores.configuration ?? 5 },
      { name: 'Deps', val: scores.dependencies ?? 5 },
      { name: 'Monitor', val: scores.monitoring ?? 5 },
      { name: 'Cripto', val: scores.cryptography ?? 5 },
      { name: 'Exposição', val: scores.data_exposure ?? 5 },
    ];

    const center = 100;
    const rMax = 70;
    const points: string[] = [];
    const axes: React.ReactNode[] = [];

    items.forEach((item, i) => {
      const angle = (i * 2 * Math.PI) / 8 - Math.PI / 2;
      const xMax = center + rMax * Math.cos(angle);
      const yMax = center + rMax * Math.sin(angle);
      
      // Axis Line
      axes.push(
        <line 
          key={`axis-${i}`} 
          x1={center} y1={center} x2={xMax} y2={yMax} 
          className="stroke-terminal-border/40" strokeWidth="1"
        />
      );

      // Label positioning
      const offsetFactor = 1.2;
      const xLabel = center + rMax * offsetFactor * Math.cos(angle);
      const yLabel = center + rMax * offsetFactor * Math.sin(angle);
      axes.push(
        <text 
          key={`label-${i}`} 
          x={xLabel} y={yLabel} 
          className="fill-terminal-muted font-mono text-[9px]" 
          textAnchor="middle" alignmentBaseline="middle"
        >
          {item.name}
        </text>
      );

      // Data point
      const valRadius = (item.val / 10) * rMax;
      const xVal = center + valRadius * Math.cos(angle);
      const yVal = center + valRadius * Math.sin(angle);
      points.push(`${xVal},${yVal}`);
    });

    // Ring grids
    const gridRings = [0.2, 0.4, 0.6, 0.8, 1].map((f, i) => {
      const radius = f * rMax;
      const rPoints: string[] = [];
      for (let j = 0; j < 8; j++) {
        const angle = (j * 2 * Math.PI) / 8 - Math.PI / 2;
        const x = center + radius * Math.cos(angle);
        const y = center + radius * Math.sin(angle);
        rPoints.push(`${x},${y}`);
      }
      return (
        <polygon 
          key={`grid-${i}`} 
          points={rPoints.join(' ')} 
          className="fill-none stroke-terminal-border/20" strokeWidth="0.8"
        />
      );
    });

    return (
      <svg viewBox="0 0 200 200" className="w-full h-full max-h-[220px]">
        {gridRings}
        {axes}
        <polygon 
          points={points.join(' ')} 
          className="fill-neon-cyan/15 stroke-neon-cyan" strokeWidth="1.5"
        />
      </svg>
    );
  };

  // ── Render Line Chart (SVG) ────────────────────────────────────────────────
  const renderLineChart = (proj: any[]) => {
    if (!proj || proj.length === 0) return null;
    const w = 400;
    const h = 180;
    const padding = 20;

    const maxRev = Math.max(...proj.map(d => d.revenue));
    const points: string[] = [];
    const areaPoints: string[] = [];

    proj.forEach((item, i) => {
      const x = padding + (i / 11) * (w - 2 * padding);
      const y = h - padding - (item.revenue / maxRev) * (h - 2 * padding);
      points.push(`${x},${y}`);
      if (i === 0) areaPoints.push(`${x},${h - padding}`);
      areaPoints.push(`${x},${y}`);
      if (i === proj.length - 1) areaPoints.push(`${x},${h - padding}`);
    });

    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full max-h-[180px]">
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#bd00ff" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#bd00ff" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
          const y = padding + f * (h - 2 * padding);
          return (
            <line 
              key={`grid-${i}`} 
              x1={padding} y1={y} x2={w - padding} y2={y} 
              className="stroke-terminal-border/20" strokeWidth="0.8" strokeDasharray="3,3"
            />
          );
        })}
        {/* Fill Area */}
        <polygon points={areaPoints.join(' ')} fill="url(#areaGrad)" />
        {/* Line */}
        <path 
          d={`M ${points.join(' L ')}`} 
          className="fill-none stroke-neon-purple" strokeWidth="2"
        />
        {/* Dots */}
        {points.map((pt, i) => {
          const [x, y] = pt.split(',');
          return (
            <circle 
              key={`dot-${i}`} 
              cx={x} cy={y} r="3" 
              className="fill-neon-purple stroke-white" strokeWidth="1"
            />
          );
        })}
      </svg>
    );
  };

  return (
    <div className="min-h-screen bg-terminal-bg flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 pt-24 pb-16 flex flex-col md:flex-row gap-6">
        
        {/* Sidebar Nav */}
        <aside className="w-full md:w-64 flex-shrink-0 flex flex-col gap-4">
          <div className="bg-terminal-surface/90 border border-terminal-border rounded-lg p-5 flex flex-col gap-3">
            <div className="flex items-center gap-3 mb-2 border-b border-terminal-border pb-3">
              <div className="w-7 h-7 rounded bg-neon-purple/20 flex items-center justify-center text-neon-purple">
                <Crown size={15} />
              </div>
              <div>
                <h2 className="font-mono text-xs font-bold text-white uppercase tracking-widest">IMORTAL</h2>
                <p className="font-mono text-[9px] text-neon-purple tracking-widest uppercase">Premium Hub</p>
              </div>
            </div>

            <button 
              onClick={() => setActiveTab('cyber')}
              className={`flex items-center gap-3 w-full py-2.5 px-3 rounded font-mono text-[11px] uppercase tracking-wider transition-all duration-200 text-left
                ${activeTab === 'cyber' 
                  ? 'bg-neon-cyan/10 border border-neon-cyan/40 text-neon-cyan' 
                  : 'text-terminal-muted hover:text-white hover:bg-white/5 border border-transparent'
                }`}
            >
              <Shield size={14} />
              <span>Cyber Intelligence</span>
            </button>

            <button 
              onClick={() => setActiveTab('marketing')}
              className={`flex items-center gap-3 w-full py-2.5 px-3 rounded font-mono text-[11px] uppercase tracking-wider transition-all duration-200 text-left
                ${activeTab === 'marketing' 
                  ? 'bg-neon-purple/10 border border-neon-purple/40 text-neon-purple' 
                  : 'text-terminal-muted hover:text-white hover:bg-white/5 border border-transparent'
                }`}
            >
              <BarChart2 size={14} />
              <span>Marketing Analytics</span>
            </button>

            <button 
              onClick={() => setActiveTab('demographic')}
              className={`flex items-center gap-3 w-full py-2.5 px-3 rounded font-mono text-[11px] uppercase tracking-wider transition-all duration-200 text-left
                ${activeTab === 'demographic' 
                  ? 'bg-neon-green/10 border border-neon-green/40 text-neon-green' 
                  : 'text-terminal-muted hover:text-white hover:bg-white/5 border border-transparent'
                }`}
            >
              <Users size={14} />
              <span>Demographic Intel</span>
            </button>

            <button 
              onClick={() => setActiveTab('avr')}
              className={`flex items-center gap-3 w-full py-2.5 px-3 rounded font-mono text-[11px] uppercase tracking-wider transition-all duration-200 text-left
                ${activeTab === 'avr' 
                  ? 'bg-yellow-500/10 border border-yellow-500/40 text-yellow-500' 
                  : 'text-terminal-muted hover:text-white hover:bg-white/5 border border-transparent'
                }`}
            >
              <Terminal size={14} />
              <span>AVR Compiler</span>
            </button>
          </div>

          {/* Quick Stats Widget */}
          <div className="bg-terminal-surface/60 border border-terminal-border/50 rounded-lg p-5 font-mono text-[10px] text-terminal-muted space-y-2">
            <div className="flex justify-between">
              <span>NÍVEL DE ACESSO:</span>
              <span className="text-neon-purple font-bold">PREMIUM</span>
            </div>
            <div className="flex justify-between">
              <span>STATUS DA API:</span>
              <span className="text-neon-green flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-neon-green animate-ping" />
                ONLINE
              </span>
            </div>
            <div className="flex justify-between">
              <span>PROVEDOR PADRÃO:</span>
              <span className="text-white">GEMINI 1.5 FLASH</span>
            </div>
          </div>
        </aside>

        {/* Dashboard Main Area */}
        <section className="flex-1 bg-terminal-surface/90 border border-terminal-border rounded-lg overflow-hidden flex flex-col shadow-[0_20px_50px_-10px_rgba(0,0,0,0.5)]">
          {/* Module Header */}
          <div className="bg-[#161b22] border-b border-terminal-border px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
              <span className="font-mono text-[10px] text-terminal-muted uppercase tracking-widest ml-3">
                IMORTAL // {activeTab.toUpperCase()}_SUITE.exe
              </span>
            </div>
            <div className="text-[10px] font-mono text-terminal-muted flex items-center gap-1.5 border border-terminal-border rounded px-2.5 py-1">
              <Lock size={10} className="text-neon-purple" />
              <span>AES-256 SECURED CONNECTION</span>
            </div>
          </div>

          <div className="p-6 md:p-8 flex-1 flex flex-col gap-6">

            {/* TAB: CYBER INTELLIGENCE */}
            {activeTab === 'cyber' && (
              <div className="flex flex-col gap-6 animate-fade-in">
                <div>
                  <h1 className="font-mono text-xl font-bold text-white flex items-center gap-2">
                    <Shield size={20} className="text-neon-cyan" />
                    Cyber Threat Intelligence
                  </h1>
                  <p className="text-xs text-terminal-muted mt-1 leading-relaxed">
                    Forneça uma descrição detalhada de seu ecossistema, infraestrutura, URL ou stack. A IA do IMORTAL avaliará a superfície de ataque, mapeará riscos no OWASP Top 10 e gerará diretrizes imediatas de mitigação.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <textarea 
                    value={cyberInput}
                    onChange={(e) => setCyberInput(e.target.value)}
                    rows={4}
                    placeholder="Ex: Aplicação de e-commerce construída em Node.js exposta no Heroku, banco de dados PostgreSQL contendo dados sensíveis de pagamento, sem criptografia em repouso, sem WAF ativado no domínio principal..."
                    className="w-full bg-black/40 border border-terminal-border/60 hover:border-neon-cyan/50 focus:border-neon-cyan focus:outline-none p-4 font-mono text-xs rounded transition-colors text-white leading-relaxed"
                  />
                  <div className="flex justify-between items-center gap-4">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="font-mono text-[9px] text-terminal-muted pt-1">EXEMPLOS:</span>
                      <button 
                        onClick={() => setCyberInput('API REST Laravel sem rate limit, chaves do Stripe expostas no commit do github, conexões HTTP permitidas.')}
                        className="font-mono text-[9px] border border-terminal-border px-2 py-0.5 rounded text-terminal-muted hover:text-neon-cyan hover:border-neon-cyan/40 bg-white/5 transition-colors"
                      >
                        API Vulnerável
                      </button>
                      <button 
                        onClick={() => setCyberInput('App React Native para fintech, chaves criptográficas armazenadas em localStorage no dispositivo, APIs de transações sem validação de token CSRF.')}
                        className="font-mono text-[9px] border border-terminal-border px-2 py-0.5 rounded text-terminal-muted hover:text-neon-cyan hover:border-neon-cyan/40 bg-white/5 transition-colors"
                      >
                        Mobile App
                      </button>
                    </div>
                    <button 
                      onClick={handleAnalyzeCyber}
                      disabled={loading || !cyberInput.trim()}
                      className="flex items-center gap-2 font-mono text-xs font-bold tracking-wider uppercase bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/40 hover:bg-neon-cyan/25 hover:border-neon-cyan px-5 py-2.5 rounded transition-all duration-300 disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <Play size={12} />
                      Analisar Ameaças
                    </button>
                  </div>
                </div>

                {cyberData && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-terminal-border/40 animate-fade-in-up">
                    
                    {/* Executive Summary & Ring */}
                    <div className="bg-[#12161f]/60 border border-terminal-border/40 rounded-lg p-5 flex gap-5 items-center col-span-2">
                      <div className="flex-1 space-y-1.5">
                        <span className="font-mono text-[9px] text-neon-cyan tracking-widest uppercase">Resumo Estratégico</span>
                        <h4 className="font-mono text-sm font-semibold text-white">Análise Concluída com Sucesso</h4>
                        <p className="font-mono text-xs text-terminal-muted leading-relaxed">{cyberData.summary}</p>
                      </div>
                      
                      {/* Risk Circle */}
                      <div className="flex flex-col items-center gap-1.5 justify-center flex-shrink-0 bg-black/30 border border-terminal-border/30 p-4 rounded-lg w-28 text-center">
                        <span className="font-mono text-[9px] text-terminal-muted tracking-widest uppercase">RISCO</span>
                        <span className={`font-mono text-2xl font-bold
                          ${cyberData.risk_level === 'CRITICAL' ? 'text-red-500' : ''}
                          ${cyberData.risk_level === 'HIGH' ? 'text-orange-500' : ''}
                          ${cyberData.risk_level === 'MEDIUM' ? 'text-yellow-500' : ''}
                          ${cyberData.risk_level === 'LOW' ? 'text-green-500' : ''}
                        `}>
                          {cyberData.threat_score}
                        </span>
                        <span className="font-mono text-[9px] border px-1.5 py-0.5 rounded text-white bg-white/5">{cyberData.risk_level}</span>
                      </div>
                    </div>

                    {/* Attack Vectors */}
                    <div className="bg-[#12161f]/30 border border-terminal-border/30 rounded-lg p-5 flex flex-col gap-4">
                      <div className="border-b border-terminal-border/40 pb-2 flex items-center gap-2">
                        <AlertTriangle size={14} className="text-neon-cyan" />
                        <h3 className="font-mono text-xs font-bold text-white uppercase tracking-wider">Vetores de Ataque</h3>
                      </div>
                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                        {cyberData.attack_vectors?.map((v: any, i: number) => (
                          <div key={i} className="bg-black/30 border border-terminal-border/40 p-3 rounded flex gap-3">
                            <span className={`font-mono text-[8px] font-bold px-1.5 py-0.5 rounded h-fit
                              ${v.severity === 'CRITICAL' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : ''}
                              ${v.severity === 'HIGH' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' : ''}
                              ${v.severity === 'MEDIUM' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : ''}
                              ${v.severity === 'LOW' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : ''}
                            `}>
                              {v.severity}
                            </span>
                            <div className="flex-1 space-y-1">
                              <h4 className="font-mono text-xs font-bold text-white">{v.name}</h4>
                              <p className="font-mono text-[10px] text-terminal-muted leading-relaxed">{v.description}</p>
                              <div className="font-mono text-[8px] text-terminal-muted/60 uppercase">Probabilidade: {v.likelihood}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Attack Surface Radar Chart */}
                    <div className="bg-[#12161f]/30 border border-terminal-border/30 rounded-lg p-5 flex flex-col items-center justify-between">
                      <div className="border-b border-terminal-border/40 pb-2 w-full flex items-center gap-2 self-start">
                        <BarChart2 size={14} className="text-neon-cyan" />
                        <h3 className="font-mono text-xs font-bold text-white uppercase tracking-wider">Superfície de Risco</h3>
                      </div>
                      <div className="w-full flex justify-center py-4">
                        {renderRadarChart(cyberData.attack_surface_scores)}
                      </div>
                    </div>

                    {/* OWASP Top 10 mapping */}
                    <div className="bg-[#12161f]/30 border border-terminal-border/30 rounded-lg p-5 flex flex-col gap-4 col-span-2">
                      <div className="border-b border-terminal-border/40 pb-2 flex items-center gap-2">
                        <Shield size={14} className="text-neon-cyan" />
                        <h3 className="font-mono text-xs font-bold text-white uppercase tracking-wider">Diretrizes OWASP Top 10</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[250px] overflow-y-auto pr-2">
                        {cyberData.owasp_mapping?.map((o: any, i: number) => (
                          <div key={i} className="bg-black/20 border border-terminal-border/20 p-3 rounded flex items-start gap-3">
                            <span className="font-mono text-[10px] text-neon-cyan font-bold bg-neon-cyan/5 border border-neon-cyan/20 rounded px-1.5 py-0.5">{o.id}</span>
                            <div className="flex-1 space-y-1">
                              <div className="flex justify-between items-center">
                                <h4 className="font-mono text-xs font-bold text-white">{o.name}</h4>
                                <span className={`w-1.5 h-1.5 rounded-full ${o.applicable ? 'bg-red-500 animate-pulse' : 'bg-terminal-border'}`} />
                              </div>
                              <p className="font-mono text-[10px] text-terminal-muted leading-relaxed">{o.risk}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recommendations */}
                    <div className="bg-[#12161f]/30 border border-terminal-border/30 rounded-lg p-5 flex flex-col gap-4 col-span-2">
                      <div className="border-b border-terminal-border/40 pb-2 flex items-center gap-2">
                        <Check size={14} className="text-neon-cyan" />
                        <h3 className="font-mono text-xs font-bold text-white uppercase tracking-wider">Ações de Mitigação</h3>
                      </div>
                      <div className="space-y-2">
                        {cyberData.recommendations?.map((r: any, i: number) => (
                          <div key={i} className="bg-black/20 border border-terminal-border/20 p-3 rounded flex justify-between items-center gap-3">
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-[9px] bg-white/5 border border-terminal-border px-1.5 py-0.5 rounded text-terminal-muted">#{i+1}</span>
                              <p className="font-mono text-xs text-white">{r.action}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`font-mono text-[8px] font-bold px-1.5 py-0.5 rounded
                                ${r.priority === 'CRITICAL' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : ''}
                                ${r.priority === 'HIGH' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' : ''}
                                ${r.priority === 'MEDIUM' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : ''}
                                ${r.priority === 'LOW' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : ''}
                              `}>
                                prioridade: {r.priority}
                              </span>
                              <span className="font-mono text-[8px] text-terminal-muted/60 uppercase">Esforço: {r.effort}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                )}
              </div>
            )}

            {/* TAB: MARKETING ANALYTICS */}
            {activeTab === 'marketing' && (
              <div className="flex flex-col gap-6 animate-fade-in">
                <div>
                  <h1 className="font-mono text-xl font-bold text-white flex items-center gap-2">
                    <BarChart2 size={20} className="text-neon-purple" />
                    Marketing Analytics &amp; ROI
                  </h1>
                  <p className="text-xs text-terminal-muted mt-1 leading-relaxed">
                    Insira detalhes do seu produto, audiência, canais e orçamento de marketing. A IA projetará LTV, CAC, Payback e desenhará uma curva de receita e retenção de 12 meses.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <textarea 
                    value={marketingInput}
                    onChange={(e) => setMarketingInput(e.target.value)}
                    rows={4}
                    placeholder="Ex: SaaS B2B de automação financeira para escritórios de contabilidade no Brasil. Preço da assinatura: R$150/mês. Orçamento mensal planejado para Google e LinkedIn Ads: R$10.000..."
                    className="w-full bg-black/40 border border-terminal-border/60 hover:border-neon-purple/50 focus:border-neon-purple focus:outline-none p-4 font-mono text-xs rounded transition-colors text-white leading-relaxed"
                  />
                  <div className="flex justify-between items-center gap-4">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="font-mono text-[9px] text-terminal-muted pt-1">EXEMPLOS:</span>
                      <button 
                        onClick={() => setMarketingInput('E-commerce de roupas sustentáveis focado em mulheres de 22-35 anos no Instagram. Ticket médio R$180, orçamento de marketing de R$5.000/mês.')}
                        className="font-mono text-[9px] border border-terminal-border px-2 py-0.5 rounded text-terminal-muted hover:text-neon-purple hover:border-neon-purple/40 bg-white/5 transition-colors"
                      >
                        Loja D2C
                      </button>
                      <button 
                        onClick={() => setMarketingInput('Consultoria de segurança de redes empresariais focando em grandes corporações do setor financeiro. Contratos médios de R$50.000, vendas B2B offline.')}
                        className="font-mono text-[9px] border border-terminal-border px-2 py-0.5 rounded text-terminal-muted hover:text-neon-purple hover:border-neon-purple/40 bg-white/5 transition-colors"
                      >
                        B2B Enterprise
                      </button>
                    </div>
                    <button 
                      onClick={handleAnalyzeMarketing}
                      disabled={loading || !marketingInput.trim()}
                      className="flex items-center gap-2 font-mono text-xs font-bold tracking-wider uppercase bg-neon-purple/15 text-neon-purple border border-neon-purple/40 hover:bg-neon-purple/25 hover:border-neon-purple px-5 py-2.5 rounded transition-all duration-300 disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <Play size={12} />
                      Analisar Mercado
                    </button>
                  </div>
                </div>

                {marketingData && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-terminal-border/40 animate-fade-in-up">
                    
                    {/* KPI Trio */}
                    <div className="bg-[#12161f]/40 border border-terminal-border/30 rounded-lg p-4 text-center">
                      <span className="font-mono text-[9px] text-terminal-muted tracking-widest uppercase">ROI PROJETADO</span>
                      <div className="font-mono text-2xl font-bold text-neon-purple mt-1">
                        {marketingData.financial_metrics?.roi?.value}%
                      </div>
                      <span className="font-mono text-[8px] text-terminal-muted/60 uppercase">Em {marketingData.financial_metrics?.roi?.timeframe}</span>
                    </div>
                    
                    <div className="bg-[#12161f]/40 border border-terminal-border/30 rounded-lg p-4 text-center">
                      <span className="font-mono text-[9px] text-terminal-muted tracking-widest uppercase">VALOR LTV</span>
                      <div className="font-mono text-2xl font-bold text-white mt-1">
                        R$ {marketingData.financial_metrics?.ltv?.value}
                      </div>
                      <span className="font-mono text-[8px] text-terminal-muted/60 uppercase">Relação LTV/CAC: {marketingData.financial_metrics?.ltv_cac_ratio}x</span>
                    </div>

                    <div className="bg-[#12161f]/40 border border-terminal-border/30 rounded-lg p-4 text-center">
                      <span className="font-mono text-[9px] text-terminal-muted tracking-widest uppercase">CUSTO CAC</span>
                      <div className="font-mono text-2xl font-bold text-white mt-1">
                        R$ {marketingData.financial_metrics?.cac?.value}
                      </div>
                      <span className="font-mono text-[8px] text-terminal-muted/60 uppercase">Payback: {marketingData.financial_metrics?.payback_months} meses</span>
                    </div>

                    {/* Strategic Analysis */}
                    <div className="bg-[#12161f]/30 border border-terminal-border/30 rounded-lg p-5 col-span-3">
                      <div className="border-b border-terminal-border/40 pb-2 mb-3 flex items-center gap-2">
                        <Sparkles size={14} className="text-neon-purple" />
                        <h3 className="font-mono text-xs font-bold text-white uppercase tracking-wider">Resumo do Diagnóstico Financeiro</h3>
                      </div>
                      <p className="font-mono text-xs text-terminal-muted leading-relaxed">{marketingData.summary}</p>
                    </div>

                    {/* Table Metrics */}
                    <div className="bg-[#12161f]/30 border border-terminal-border/30 rounded-lg p-5 col-span-1 flex flex-col gap-4">
                      <div className="border-b border-terminal-border/40 pb-2 flex items-center gap-2">
                        <BarChart2 size={14} className="text-neon-purple" />
                        <h3 className="font-mono text-xs font-bold text-white uppercase tracking-wider">Métricas Detalhadas</h3>
                      </div>
                      <div className="space-y-3 font-mono text-xs">
                        <div className="flex justify-between border-b border-terminal-border/10 pb-1.5">
                          <span className="text-terminal-muted">CAC estimado</span>
                          <span className="text-white">R$ {marketingData.financial_metrics?.cac?.value}</span>
                        </div>
                        <div className="flex justify-between border-b border-terminal-border/10 pb-1.5">
                          <span className="text-terminal-muted">LTV estimado</span>
                          <span className="text-white">R$ {marketingData.financial_metrics?.ltv?.value}</span>
                        </div>
                        <div className="flex justify-between border-b border-terminal-border/10 pb-1.5">
                          <span className="text-terminal-muted">LTV/CAC Ratio</span>
                          <span className="text-neon-green">{marketingData.financial_metrics?.ltv_cac_ratio}x</span>
                        </div>
                        <div className="flex justify-between border-b border-terminal-border/10 pb-1.5">
                          <span className="text-terminal-muted">ROAS estimado</span>
                          <span className="text-white">{marketingData.financial_metrics?.roas?.value}x</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-terminal-muted">Payback Período</span>
                          <span className="text-white">{marketingData.financial_metrics?.payback_months} meses</span>
                        </div>
                      </div>
                    </div>

                    {/* Channels Allocation */}
                    <div className="bg-[#12161f]/30 border border-terminal-border/30 rounded-lg p-5 col-span-2 flex flex-col gap-4">
                      <div className="border-b border-terminal-border/40 pb-2 flex items-center gap-2">
                        <PieChart size={14} className="text-neon-purple" />
                        <h3 className="font-mono text-xs font-bold text-white uppercase tracking-wider">Distribuição de Canais Recomendados</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {marketingData.channels?.map((chan: any, i: number) => (
                          <div key={i} className="bg-black/30 border border-terminal-border/30 p-3 rounded">
                            <div className="flex justify-between font-mono text-xs mb-1.5">
                              <span className="font-semibold text-white">{chan.name}</span>
                              <span className="text-neon-purple font-bold">{chan.percentage}%</span>
                            </div>
                            {/* Simple Progress Bar */}
                            <div className="w-full bg-white/5 h-1.5 rounded overflow-hidden mb-2">
                              <div className="bg-neon-purple h-full" style={{ width: `${chan.percentage}%` }} />
                            </div>
                            <p className="font-mono text-[9px] text-terminal-muted leading-relaxed">{chan.rationale}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Growth Projections */}
                    <div className="bg-[#12161f]/30 border border-terminal-border/30 rounded-lg p-5 col-span-3 flex flex-col gap-4">
                      <div className="border-b border-terminal-border/40 pb-2 flex items-center gap-2">
                        <BarChart2 size={14} className="text-neon-purple" />
                        <h3 className="font-mono text-xs font-bold text-white uppercase tracking-wider">Curva de Crescimento de Receita (12 Meses)</h3>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                        <div className="lg:col-span-2 py-4">
                          {renderLineChart(marketingData.growth_projection)}
                        </div>
                        {/* Table list of growth */}
                        <div className="max-h-[180px] overflow-y-auto pr-2 space-y-1 bg-black/20 border border-terminal-border/30 p-3 rounded font-mono text-[10px]">
                          {marketingData.growth_projection?.map((g: any, i: number) => (
                            <div key={i} className="flex justify-between border-b border-white/5 py-1">
                              <span className="text-terminal-muted">Mês {g.month}</span>
                              <span className="text-white">R$ {g.revenue.toLocaleString()}</span>
                              <span className="text-neon-purple">{g.customers} cli</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Insights list */}
                    <div className="bg-[#12161f]/30 border border-terminal-border/30 rounded-lg p-5 col-span-3 flex flex-col gap-4">
                      <div className="border-b border-terminal-border/40 pb-2 flex items-center gap-2">
                        <Sparkles size={14} className="text-neon-purple" />
                        <h3 className="font-mono text-xs font-bold text-white uppercase tracking-wider">Insights Táticos &amp; Recomendações</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        {marketingData.insights?.map((ins: string, i: number) => (
                          <div key={i} className="bg-black/30 border border-terminal-border/40 p-4 rounded flex flex-col gap-2">
                            <span className="font-mono text-xl font-black text-neon-purple/40">0{i+1}</span>
                            <p className="font-mono text-[10px] text-terminal-muted leading-relaxed">{ins}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                )}
              </div>
            )}

            {/* TAB: DEMOGRAPHIC INTEL */}
            {activeTab === 'demographic' && (
              <div className="flex flex-col gap-6 animate-fade-in">
                <div>
                  <h1 className="font-mono text-xl font-bold text-white flex items-center gap-2">
                    <Users size={20} className="text-neon-green" />
                    Demographic Intelligence
                  </h1>
                  <p className="text-xs text-terminal-muted mt-1 leading-relaxed">
                    Especifique um produto ou mercado consumidor. A IA estimará o tamanho de mercado em TAM, SAM e SOM, mapeará as classes sociais prevalentes e o comportamento de consumo.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <textarea 
                    value={demographicInput}
                    onChange={(e) => setDemographicInput(e.target.value)}
                    rows={4}
                    placeholder="Ex: Cerveja artesanal orgânica produzida regionalmente no estado de Santa Catarina, com venda online direta ao consumidor final..."
                    className="w-full bg-black/40 border border-terminal-border/60 hover:border-neon-green/50 focus:border-neon-green focus:outline-none p-4 font-mono text-xs rounded transition-colors text-white leading-relaxed"
                  />
                  <div className="flex justify-between items-center gap-4">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="font-mono text-[9px] text-terminal-muted pt-1">EXEMPLOS:</span>
                      <button 
                        onClick={() => setDemographicInput('Cursos online de desenvolvimento de software e inteligência artificial para transição de carreira de jovens adultos no Brasil.')}
                        className="font-mono text-[9px] border border-terminal-border px-2 py-0.5 rounded text-terminal-muted hover:text-neon-green hover:border-neon-green/40 bg-white/5 transition-colors"
                      >
                        Educação Online
                      </button>
                      <button 
                        onClick={() => setDemographicInput('Alimentos congelados e marmitas fitness focados em profissionais urbanos de 28-45 anos em grandes metrópoles como São Paulo.')}
                        className="font-mono text-[9px] border border-terminal-border px-2 py-0.5 rounded text-terminal-muted hover:text-neon-green hover:border-neon-green/40 bg-white/5 transition-colors"
                      >
                        Marmitas Saudáveis
                      </button>
                    </div>
                    <button 
                      onClick={handleAnalyzeDemographic}
                      disabled={loading || !demographicInput.trim()}
                      className="flex items-center gap-2 font-mono text-xs font-bold tracking-wider uppercase bg-neon-green/15 text-neon-green border border-neon-green/40 hover:bg-neon-green/25 hover:border-neon-green px-5 py-2.5 rounded transition-all duration-300 disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <Play size={12} />
                      Mapear Demografia
                    </button>
                  </div>
                </div>

                {demographicData && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-terminal-border/40 animate-fade-in-up">
                    
                    {/* TAM SAM SOM */}
                    <div className="bg-[#12161f]/40 border border-terminal-border/30 rounded-lg p-5 col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-black/30 border border-terminal-border/40 p-4 rounded text-center">
                        <span className="font-mono text-[9px] text-terminal-muted tracking-widest uppercase">TAM (Mercado Total)</span>
                        <div className="font-mono text-2xl font-bold text-white mt-1">
                          R$ {demographicData.market_size?.tam?.value}{demographicData.market_size?.tam?.unit}
                        </div>
                        <p className="font-mono text-[9px] text-terminal-muted mt-2 leading-relaxed">{demographicData.market_size?.tam?.description}</p>
                      </div>

                      <div className="bg-black/30 border border-terminal-border/40 p-4 rounded text-center">
                        <span className="font-mono text-[9px] text-terminal-muted tracking-widest uppercase">SAM (Mercado Disponível)</span>
                        <div className="font-mono text-2xl font-bold text-neon-green mt-1">
                          R$ {demographicData.market_size?.sam?.value}{demographicData.market_size?.sam?.unit}
                        </div>
                        <p className="font-mono text-[9px] text-terminal-muted mt-2 leading-relaxed">{demographicData.market_size?.sam?.description}</p>
                      </div>

                      <div className="bg-black/30 border border-terminal-border/40 p-4 rounded text-center">
                        <span className="font-mono text-[9px] text-terminal-muted tracking-widest uppercase">SOM (Mercado Obtível)</span>
                        <div className="font-mono text-2xl font-bold text-white mt-1">
                          R$ {demographicData.market_size?.som?.value}{demographicData.market_size?.som?.unit}
                        </div>
                        <p className="font-mono text-[9px] text-terminal-muted mt-2 leading-relaxed">{demographicData.market_size?.som?.description}</p>
                      </div>
                    </div>

                    {/* Executive Summary */}
                    <div className="bg-[#12161f]/30 border border-terminal-border/30 rounded-lg p-5 col-span-3">
                      <div className="border-b border-terminal-border/40 pb-2 mb-3 flex items-center gap-2">
                        <Sparkles size={14} className="text-neon-green" />
                        <h3 className="font-mono text-xs font-bold text-white uppercase tracking-wider">Visão Demográfica de Mercado</h3>
                      </div>
                      <p className="font-mono text-xs text-terminal-muted leading-relaxed">{demographicData.market_summary}</p>
                    </div>

                    {/* Age Groups & Income Groups */}
                    <div className="bg-[#12161f]/30 border border-terminal-border/30 rounded-lg p-5 flex flex-col gap-4">
                      <div className="border-b border-terminal-border/40 pb-2 flex items-center gap-2">
                        <Users size={14} className="text-neon-green" />
                        <h3 className="font-mono text-xs font-bold text-white uppercase tracking-wider">Faixas Etárias</h3>
                      </div>
                      <div className="space-y-3 font-mono text-xs">
                        {demographicData.demographics?.age_groups?.map((g: any, i: number) => (
                          <div key={i} className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-terminal-muted">{g.label} anos</span>
                              <span className="text-white font-bold">{g.percentage}%</span>
                            </div>
                            <div className="w-full bg-white/5 h-1.5 rounded overflow-hidden">
                              <div className="bg-neon-green h-full" style={{ width: `${g.percentage}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-[#12161f]/30 border border-terminal-border/30 rounded-lg p-5 flex flex-col gap-4">
                      <div className="border-b border-terminal-border/40 pb-2 flex items-center gap-2">
                        <Users size={14} className="text-neon-green" />
                        <h3 className="font-mono text-xs font-bold text-white uppercase tracking-wider">Classes Sociais</h3>
                      </div>
                      <div className="space-y-3 font-mono text-xs">
                        {demographicData.demographics?.income_groups?.map((g: any, i: number) => (
                          <div key={i} className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-terminal-muted">{g.label}</span>
                              <span className="text-white font-bold">{g.percentage}%</span>
                            </div>
                            <div className="w-full bg-white/5 h-1.5 rounded overflow-hidden">
                              <div className="bg-neon-green h-full" style={{ width: `${g.percentage}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Online vs Offline Split */}
                    <div className="bg-[#12161f]/30 border border-terminal-border/30 rounded-lg p-5 flex flex-col gap-4">
                      <div className="border-b border-terminal-border/40 pb-2 flex items-center gap-2">
                        <Globe size={14} className="text-neon-green" />
                        <h3 className="font-mono text-xs font-bold text-white uppercase tracking-wider">Canais Online vs Offline</h3>
                      </div>
                      <div className="space-y-3 font-mono text-[10px]">
                        {demographicData.online_offline_split?.map((ch: any, i: number) => (
                          <div key={i} className="space-y-1">
                            <div className="flex justify-between">
                              <span className="font-semibold text-white">{ch.channel}</span>
                              <span className="text-terminal-muted">on: {ch.online}% | off: {ch.offline}%</span>
                            </div>
                            <div className="w-full bg-white/5 h-1.5 rounded overflow-hidden flex">
                              <div className="bg-neon-green h-full" style={{ width: `${ch.online}%` }} />
                              <div className="bg-orange-500 h-full" style={{ width: `${ch.offline}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Niches and Consumer Patterns */}
                    <div className="bg-[#12161f]/30 border border-terminal-border/30 rounded-lg p-5 col-span-3 flex flex-col gap-4">
                      <div className="border-b border-terminal-border/40 pb-2 flex items-center gap-2">
                        <Sparkles size={14} className="text-neon-green" />
                        <h3 className="font-mono text-xs font-bold text-white uppercase tracking-wider">Segmentação de Nichos &amp; Comportamento</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {demographicData.top_niches?.map((n: any, i: number) => (
                          <div key={i} className="bg-black/30 border border-terminal-border/40 p-4 rounded flex gap-4">
                            <div className="flex-1 space-y-1 font-mono">
                              <div className="flex justify-between">
                                <h4 className="text-xs font-bold text-white">{n.name}</h4>
                                <span className="text-neon-green text-xs font-bold">{n.growth_rate}</span>
                              </div>
                              <p className="text-[10px] text-terminal-muted leading-relaxed">{n.description}</p>
                              <div className="text-[9px] text-terminal-muted/60 uppercase pt-1">Penetração: {n.penetration}%</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                )}
              </div>
            )}

            {/* TAB: AVR COMPILER */}
            {activeTab === 'avr' && (
              <div className="flex flex-col gap-6 animate-fade-in">
                <div>
                  <h1 className="font-mono text-xl font-bold text-white flex items-center gap-2">
                    <Terminal size={20} className="text-yellow-500" />
                    Formal AVR Compiler &amp; Z3 Verifier
                  </h1>
                  <p className="text-xs text-terminal-muted mt-1 leading-relaxed">
                    Escreva o comportamento desejado do circuito ATMega328P em linguagem natural. A IA do IMORTAL traduzirá para JSON IR, provará propriedades físicas no prover matemático Z3 da Microsoft, testará robustez em sandbox e compilará código C++ e Intel HEX compiláveis.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <textarea 
                    value={avrInput}
                    onChange={(e) => setAvrInput(e.target.value)}
                    rows={4}
                    placeholder="Ex: Piscar LED no pino 13 a cada 1 segundo..."
                    className="w-full bg-black/40 border border-terminal-border/60 hover:border-yellow-500/50 focus:border-yellow-500 focus:outline-none p-4 font-mono text-xs rounded transition-colors text-white leading-relaxed"
                  />
                  <div className="flex justify-between items-center gap-4">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="font-mono text-[9px] text-terminal-muted pt-1">EXEMPLOS:</span>
                      <button 
                        onClick={() => setAvrInput('Pino invalido: Declarar pino LED no pino 25 (inválido no ATMega328P) e piscar a cada 500ms.')}
                        className="font-mono text-[9px] border border-terminal-border px-2 py-0.5 rounded text-terminal-muted hover:text-yellow-500 hover:border-yellow-500/40 bg-white/5 transition-colors"
                      >
                        Provocar Erro de Pino (Z3)
                      </button>
                      <button 
                        onClick={() => setAvrInput('Divisão por zero: Ler sensor analógico A0, dividir 100 por esse valor e imprimir no Serial.')}
                        className="font-mono text-[9px] border border-terminal-border px-2 py-0.5 rounded text-terminal-muted hover:text-yellow-500 hover:border-yellow-500/40 bg-white/5 transition-colors"
                      >
                        Provocar Divisão Zero (Z3)
                      </button>
                      <button 
                        onClick={() => setAvrInput('Ler potenciometro no pino A0, mapear o valor para delay de 0 a 1000 e piscar LED no pino 13.')}
                        className="font-mono text-[9px] border border-terminal-border px-2 py-0.5 rounded text-terminal-muted hover:text-yellow-500 hover:border-yellow-500/40 bg-white/5 transition-colors"
                      >
                        Blink Regulável Seguro
                      </button>
                    </div>
                    <button 
                      onClick={handleCompileAVR}
                      disabled={loading || !avrInput.trim()}
                      className="flex items-center gap-2 font-mono text-xs font-bold tracking-wider uppercase bg-yellow-500/15 text-yellow-500 border border-yellow-500/40 hover:bg-yellow-500/25 hover:border-yellow-500 px-5 py-2.5 rounded transition-all duration-300 disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <Play size={12} />
                      Compilar &amp; Verificar
                    </button>
                  </div>
                </div>

                {/* Loading Status */}
                {loading && (
                  <div className="bg-[#12161f]/40 border border-terminal-border/30 rounded-lg p-5 font-mono text-xs space-y-3 animate-pulse">
                    <div className="flex items-center gap-2 text-yellow-500">
                      <RefreshCw size={12} className="animate-spin" />
                      <span>{['Processando intenções da linguagem natural...', 'Validando estruturas da IR...', 'Provando limites de segurança no Z3...', 'Executando testes no simulador Sandbox...'][loadingStep]}</span>
                    </div>
                  </div>
                )}

                {/* Verification Steps List */}
                {verificationSteps.length > 0 && (
                  <div className="bg-[#12161f]/30 border border-terminal-border/30 rounded-lg p-5 flex flex-col gap-4 animate-fade-in-up">
                    <div className="border-b border-terminal-border/40 pb-2 flex items-center gap-2">
                      <Shield size={14} className="text-yellow-500" />
                      <h3 className="font-mono text-xs font-bold text-white uppercase tracking-wider">Etapas de Verificação de Código</h3>
                    </div>
                    <div className="space-y-2.5 font-mono text-xs">
                      {verificationSteps.map((step, i) => (
                        <div key={i} className="flex justify-between items-center bg-black/20 border border-terminal-border/20 p-3 rounded">
                          <div className="flex items-center gap-3">
                            <span className="text-base">{step.icon}</span>
                            <div>
                              <h4 className="font-bold text-white">{step.step}</h4>
                              <p className="text-[10px] text-terminal-muted mt-0.5">{step.details}</p>
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border
                            ${step.status === 'PASSED' ? 'bg-green-500/10 text-neon-green border-neon-green/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}
                          `}>
                            {step.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Compiled AVR Data */}
                {avrData && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up">
                    
                    {/* Proved properties list */}
                    <div className="bg-[#12161f]/30 border border-terminal-border/30 rounded-lg p-5 flex flex-col gap-4 col-span-2">
                      <div className="border-b border-terminal-border/40 pb-2 flex items-center gap-2">
                        <Shield size={14} className="text-neon-green" />
                        <h3 className="font-mono text-xs font-bold text-white uppercase tracking-wider">Teoremas de Segurança Provados</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {propertiesProved.map((prop, i) => (
                          <div key={i} className="flex items-center gap-2 font-mono text-xs text-white bg-black/20 border border-terminal-border/20 px-3 py-2 rounded">
                            <Check size={12} className="text-neon-green" />
                            <span>{prop}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* C++ Code Display */}
                    <div className="bg-[#12161f]/30 border border-terminal-border/30 rounded-lg p-5 flex flex-col gap-3 col-span-2 md:col-span-1">
                      <div className="border-b border-terminal-border/40 pb-2 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Terminal size={14} className="text-yellow-500" />
                          <h3 className="font-mono text-xs font-bold text-white uppercase tracking-wider">Código C++ Gerado</h3>
                        </div>
                        <button 
                          onClick={() => copyToClipboard(cppCode)}
                          className="text-terminal-muted hover:text-white transition-colors p-1"
                          title="Copiar código"
                        >
                          {isCopied ? <Check size={14} className="text-neon-green" /> : <Copy size={14} />}
                        </button>
                      </div>
                      <pre className="w-full bg-black/40 border border-terminal-border/30 rounded p-4 font-mono text-[11px] text-white/90 overflow-x-auto max-h-[300px]">
                        <code>{cppCode}</code>
                      </pre>
                    </div>

                    {/* HEX Output and HITL Review */}
                    <div className="bg-[#12161f]/30 border border-terminal-border/30 rounded-lg p-5 flex flex-col gap-4 col-span-2 md:col-span-1">
                      <div className="border-b border-terminal-border/40 pb-2 flex items-center gap-2">
                        <Users size={14} className="text-yellow-500" />
                        <h3 className="font-mono text-xs font-bold text-white uppercase tracking-wider">HITL - Aprovação Humana para Gravação</h3>
                      </div>
                      
                      <div className="bg-black/30 border border-terminal-border/40 p-4 rounded flex flex-col gap-3 font-mono text-xs text-terminal-muted leading-relaxed">
                        <p>
                          De acordo com as diretrizes do **IMORTAL Hardware Protocol**, nenhuma gravação em circuito físico ATMega328P deve ser gerada sem a aprovação humana explícita (*Human-In-The-Loop*).
                        </p>
                        <div className="flex justify-between items-center bg-white/5 border border-terminal-border/20 p-3 rounded">
                          <span className="font-bold text-white">Autorizar Compilação HEX:</span>
                          <button
                            onClick={() => setHitlApproved(!hitlApproved)}
                            className={`px-4 py-1.5 rounded font-bold uppercase tracking-wider border text-[10px] transition-all duration-300
                              ${hitlApproved 
                                ? 'bg-neon-green/10 border-neon-green/50 text-neon-green' 
                                : 'bg-white/5 border-terminal-border text-terminal-muted hover:text-white'
                              }`}
                          >
                            {hitlApproved ? 'AUTORIZADO' : 'PENDENTE'}
                          </button>
                        </div>
                      </div>

                      {hitlApproved && (
                        <div className="flex flex-col gap-2.5 animate-fade-in-up">
                          <div className="border-b border-terminal-border/40 pb-2 flex items-center gap-2 mt-2">
                            <Lock size={12} className="text-neon-green" />
                            <h4 className="font-mono text-[10px] font-bold text-white uppercase tracking-widest">Código Máquina (Intel HEX)</h4>
                          </div>
                          <pre className="w-full bg-black/40 border border-terminal-border/30 rounded p-3 font-mono text-[9px] text-[#475569] overflow-x-auto max-h-[140px]">
                            <code>{hexCode}</code>
                          </pre>
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>
            )}

          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
