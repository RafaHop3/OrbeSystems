'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Zap, RefreshCw, Server, Cpu, Database,
  AlertTriangle, CheckCircle, Play, FileJson, Clock, Loader2, ArrowRight,
  FileText, Download, Code, Sparkles, Sliders, Scissors, FileCode, Check,
  Link2Off, WifiOff, Bot
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { Repository } from '@/types/repository';

import { API_BASE_URL } from '@/lib/api';

const API_URL = API_BASE_URL;

interface InspectionItem {
  id: string;
  property_id: string;
  component_name: string;
  owner_baseline_url: string;
  checkout_url: string | null;
  status: string;
  deterioration_grade: string | null;
  analysis_log: string | null;
  updated_at: string | null;
}

// ── Web Audio API Cyber Synthesizer ──────────────────────────────────────────
const playCyberBeep = (freq = 800, duration = 0.05, type: OscillatorType = 'sine') => {
  if (typeof window === 'undefined') return;
  // Respect user prefers-reduced-motion / accessibility limits
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return; // Silent mode if reduced motion/sensory is preferred
  
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    // Low volume (-20dB to -30dB target for subtle click / high frequency chirp)
    gainNode.gain.setValueAtTime(0.008, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    console.warn("Audio Context blocked or unsupported:", e);
  }
};

// ── Geometrical Cyberpunk Particle Emitter (Data Burst) ──────────────────────
function DataBurst({ trigger }: { trigger: number }) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    if (trigger === 0 || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      alpha: number;
      decay: number;
    }> = [];

    // Brand rigid colors: Cyan (#00f2fe) and Purple (#a855f7)
    const colors = ['#00f2fe', '#a855f7', '#00ffcc', '#ec4899'];

    // Create 30 rigid geometric square/line particles
    for (let i = 0; i < 30; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6 - 1.5,
        size: Math.random() * 4 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1.0,
        decay: Math.random() * 0.04 + 0.02
      });
    }

    let active = true;
    const render = () => {
      if (!active) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let alive = false;
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;

        if (p.alpha > 0) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
          ctx.restore();
        }
      });

      if (alive) {
        requestAnimationFrame(render);
      } else {
        active = false;
      }
    };

    render();
    return () => {
      active = false;
    };
  }, [trigger]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={150}
      className="absolute pointer-events-none z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
    />
  );
}

// ── SVG Sparkline Telemetry with Neon Glow ──────────────────────────────────
function TelemetrySparkline({ data }: { data: number[] }) {
  if (data.length === 0) return null;
  const width = 120;
  const height = 24;
  const padding = 2;
  const max = Math.max(...data, 100);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const points = data.map((val, index) => {
    const x = padding + (index / (data.length - 1 || 1)) * (width - padding * 2);
    const y = height - padding - ((val - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible select-none">
      <defs>
        <filter id="spark-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      
      {/* Background guide line */}
      <line 
        x1={0} y1={height/2} x2={width} y2={height/2} 
        stroke="rgba(255,255,255,0.05)" 
        strokeWidth="1" 
        strokeDasharray="2 4"
      />

      {/* Glow path */}
      <polyline
        fill="none"
        stroke="#00f2fe"
        strokeWidth="1.5"
        points={points}
        filter="url(#spark-glow)"
        className="opacity-60"
      />
      {/* Solid path */}
      <polyline
        fill="none"
        stroke="#00f2fe"
        strokeWidth="1.5"
        points={points}
      />
    </svg>
  );
}

export default function VdeUserDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'webhooks' | 'tools' | 'repos' | 'events'>('overview');
  const [apiFailed, setApiFailed] = useState<boolean>(false);
  
  // Test Events States
  const [testEvents, setTestEvents] = useState<any[]>([]);
  const [eventsLoading, setEventsLoading] = useState<boolean>(false);
  const [eventFilterService, setEventFilterService] = useState<string>('');
  const [eventFilterStatus, setEventFilterStatus] = useState<string>('');
  const [newEventForm, setNewEventForm] = useState({
    event_type: 'custom_test',
    service: 'dashboard',
    status: 'success',
    message: 'User triggered test event from dashboard'
  });
  
  // Imobverse States
  const [properties, setProperties] = useState<any[]>([]);
  const [inspections, setInspections] = useState<InspectionItem[]>([]);
  const [selectedPropId, setSelectedPropId] = useState<string>('');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [checkoutUrl, setCheckoutUrl] = useState<string>('');
  const [customCheckout, setCustomCheckout] = useState<boolean>(false);
  
  // Simulator state
  const [simLoading, setSimLoading] = useState<boolean>(false);
  const [simLogs, setSimLogs] = useState<string[]>([]);
  const [aiResponse, setAiResponse] = useState<any | null>(null);
  
  // Repositories state
  const [repos, setRepos] = useState<Repository[]>([]);
  const [reposLoading, setReposLoading] = useState<boolean>(false);
  
  // Loading & seed states
  const [loading, setLoading] = useState<boolean>(false);
  const [seeding, setSeeding] = useState<boolean>(false);

  // ── Smart Utilities States (DocGen, Converter, Compressor) ─────────────────
  const [docTemplate, setDocTemplate] = useState<'contract' | 'audit' | 'leads'>('contract');
  const [docTitle, setDocTitle] = useState('CONTRATO DE PARCERIA TECNOLÓGICA');
  const [docContent, setDocContent] = useState('');
  const [docClientName, setDocClientName] = useState('Orbe Systems Partner');
  const [docStatus, setDocStatus] = useState<'idle' | 'generated'>('idle');

  const [convertInput, setConvertInput] = useState('{\n  "nome": "Orbe Systems",\n  "status": "ativo"\n}');
  const [convertMode, setConvertMode] = useState<'json2csv' | 'csv2json' | 'md2html'>('json2csv');
  const [convertOutput, setConvertOutput] = useState('');

  const [compressInput, setCompressInput] = useState('Orbe Systems '.repeat(30));
  const [compressOutput, setCompressOutput] = useState('');
  const [compressRatio, setCompressRatio] = useState<string>('0%');
  const [isCompressed, setIsCompressed] = useState(false);
  const [compressHistory, setCompressHistory] = useState<number[]>([100, 85, 70, 52]);
  const [burstTrigger, setBurstTrigger] = useState<number>(0);

  // Manual Reconnect Function
  const handleManualReconnect = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/projects`);
      if (res.ok) {
        setApiFailed(false);
        fetchData();
        fetchRepos();
        playCyberBeep(900, 0.08, 'sine');
      } else {
        playCyberBeep(200, 0.2, 'sawtooth');
      }
    } catch {
      playCyberBeep(200, 0.2, 'sawtooth');
    } finally {
      setLoading(false);
    }
  };

  // Fetch repositories
  const fetchRepos = async () => {
    setReposLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/projects`);
      if (res.ok) {
        const data = await res.json();
        setRepos(data);
        setApiFailed(false);
      } else {
        if (res.status >= 500) {
          setApiFailed(true);
        }
      }
    } catch (err) {
      console.error('Failed to fetch repos:', err);
      setApiFailed(true);
    } finally {
      setReposLoading(false);
    }
  };

  // Fetch properties and inspections
  const fetchData = async () => {
    if (user?.role !== 'premium') return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/imobverse/my-properties`, { credentials: 'include' });
      if (res.ok) {
        const props = await res.json();
        setProperties(props);
        if (props.length > 0) {
          setSelectedPropId(props[0].id);
        }
        setApiFailed(false);
      } else {
        if (res.status >= 500) {
          setApiFailed(true);
        }
      }
    } catch (err) {
      console.error('Failed to fetch property list:', err);
      setApiFailed(true);
    } finally {
      setLoading(false);
    }
  };

  // Fetch test events
  const fetchTestEvents = async () => {
    setEventsLoading(true);
    try {
      let url = `${API_URL}/api/test-events?limit=50`;
      if (eventFilterService) url += `&service=${eventFilterService}`;
      if (eventFilterStatus) url += `&status=${eventFilterStatus}`;
      const res = await fetch(url, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setTestEvents(data);
        setApiFailed(false);
      } else {
        if (res.status >= 500) {
          setApiFailed(true);
        }
      }
    } catch (err) {
      console.error('Failed to fetch test events:', err);
      setApiFailed(true);
    } finally {
      setEventsLoading(false);
    }
  };

  // Create test event
  const handleCreateTestEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/test-events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          event_type: newEventForm.event_type,
          service: newEventForm.service,
          status: newEventForm.status,
          message: newEventForm.message,
          details: { client_ip: "127.0.0.1", user_role: user?.role }
        })
      });
      if (res.ok) {
        setNewEventForm(prev => ({ ...prev, message: '' }));
        fetchTestEvents();
        playCyberBeep(900, 0.08, 'sine');
      }
    } catch (err) {
      console.error('Failed to create test event:', err);
    }
  };

  // Clear test events
  const handleClearTestEvents = async () => {
    if (!confirm('Deseja limpar todos os eventos de teste?')) return;
    try {
      const res = await fetch(`${API_URL}/api/test-events`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok || res.status === 204) {
        fetchTestEvents();
        playCyberBeep(400, 0.15, 'sawtooth');
      } else {
        alert('Apenas administradores podem limpar os eventos de teste.');
      }
    } catch (err) {
      console.error('Failed to clear events:', err);
    }
  };

  useEffect(() => {
    fetchData();
    fetchRepos();
  }, [user]);

  // Fetch events when tab changes or filters change
  useEffect(() => {
    if (activeTab === 'events' && user) {
      fetchTestEvents();
    }
  }, [activeTab, eventFilterService, eventFilterStatus, user]);

  // Fetch inspections when property changes
  useEffect(() => {
    if (!selectedPropId) return;
    const fetchInspections = async () => {
      try {
        const res = await fetch(`${API_URL}/api/imobverse/properties/${selectedPropId}/inspections`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setInspections(data);
          if (data.length > 0) {
            setSelectedItemId(data[0].id);
          } else {
            setSelectedItemId('');
          }
        }
      } catch (err) {
        console.error('Failed to fetch inspections:', err);
      }
    };
    fetchInspections();
  }, [selectedPropId]);

  // Auto-seed a test property and inspection item
  const handleSeed = async () => {
    setSeeding(true);
    try {
      const propRes = await fetch(`${API_URL}/api/imobverse/properties`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: 'Apartamento Duplex Cyberpunk (Demo Vistoria)',
          description: 'Lindo apartamento duplex com vista para as luzes neon da cidade de Neo-São Paulo. Baseline de vistoria pré-definido pela Orbe Systems.',
          price: 4200.0,
          deal_type: 'aluguel',
          property_type: 'apartamento',
          city: 'São Paulo',
          neighborhood: 'Vila Olímpia',
          street_address: 'Av. Brigadeiro Faria Lima, 4500',
          cover_image_url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'
        })
      });

      if (!propRes.ok) throw new Error('Falha ao criar imóvel de teste.');
      const newProp = await propRes.json();

      const inspectRes = await fetch(`${API_URL}/api/imobverse/inspections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          property_id: newProp.id,
          component_name: 'quadro_eletrico',
          owner_baseline_url: 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=800'
        })
      });

      if (!inspectRes.ok) throw new Error('Falha ao criar item de vistoria.');
      await fetchData();
    } catch (err) {
      console.error(err);
      alert('Erro ao auto-configurar ambiente de teste. Verifique se você está logado em uma conta Premium.');
    } finally {
      setSeeding(false);
    }
  };

  // Run the simulation
  const handleSimulate = async () => {
    if (!selectedItemId) return;
    setSimLoading(true);
    setAiResponse(null);
    const time = () => new Date().toLocaleTimeString();
    
    setSimLogs([
      `[${time()}] 🚀 Iniciando simulação de submissão de checkout...`,
      `[${time()}] Enviando payload de Checkout para /api/imobverse/inspections/checkout...`,
    ]);

    try {
      const finalUrl = checkoutUrl || 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e-dirty?w=800';
      const res = await fetch(`${API_URL}/api/imobverse/inspections/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          inspection_item_id: selectedItemId,
          checkout_url: finalUrl,
        })
      });

      if (!res.ok) throw new Error(`Servidor retornou HTTP ${res.status}`);

      setSimLogs(prev => [
        ...prev,
        `[${time()}] ✅ Registro inicial de checkout concluído. Status do item de vistoria: PENDING.`,
        `[${time()}] 🤖 Chamada de tarefa assíncrona disparada para o worker do LLM (Background Task)...`,
        `[${time()}] Iniciando sondagem (polling) dos resultados gerados pelo Gemini Cloud/Ollama...`
      ]);

      let attempts = 0;
      const maxAttempts = 15;
      
      const poll = setInterval(async () => {
        attempts++;
        setSimLogs(prev => [...prev, `[${time()}] [Sondagem #${attempts}] Verificando status do item de vistoria no banco...`]);
        
        try {
          const checkRes = await fetch(`${API_URL}/api/imobverse/properties/${selectedPropId}/inspections`, { credentials: 'include' });
          if (checkRes.ok) {
            const data = await checkRes.json();
            const updatedItem = data.find((x: any) => x.id === selectedItemId);
            
            if (updatedItem && updatedItem.status !== 'pending') {
              clearInterval(poll);
              
              setSimLogs(prev => [
                ...prev,
                `[${time()}] 🎯 Análise automatizada integrada com sucesso!`,
                `[${time()}] Status final da vistoria: ${updatedItem.status.toUpperCase()}`,
                `[${time()}] Grau de deterioração detectado pela IA: ${updatedItem.deterioration_grade?.toUpperCase()}`,
                `[${time()}] Justificativa da IA: "${updatedItem.analysis_log}"`
              ]);
              
              setAiResponse({
                inspection_item_id: updatedItem.id,
                status: updatedItem.status,
                divergencia_detectada: updatedItem.status === 'rejected',
                grau_de_deterioracao: updatedItem.deterioration_grade,
                justificativa: updatedItem.analysis_log,
                updated_at: updatedItem.updated_at
              });
              
              setSimLoading(false);
              fetchData();
            }
          }
        } catch (err) {
          console.error(err);
        }

        if (attempts >= maxAttempts) {
          clearInterval(poll);
          setSimLogs(prev => [...prev, `[${time()}] ⚠️ Timeout de sondagem excedido. A IA pode estar demorando mais que o esperado.`]);
          setSimLoading(false);
        }
      }, 2000);

    } catch (err: any) {
      setSimLogs(prev => [...prev, `[${time()}] ❌ Erro na simulação: ${err.message}`]);
      setSimLoading(false);
    }
  };

  // ── Document Generation Algorithm ──────────────────────────────────────────
  const generateDocument = async () => {
    // Try Backend API (Premium Only)
    try {
      const res = await fetch(`${API_URL}/api/suite-inteligente/generate-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          template_type: docTemplate,
          company_name: docTemplate === 'contract' ? 'Orbe Systems Ltda.' : 'MoneyLayer Social Fund',
          auditor_name: docClientName,
          vulnerabilities: docTemplate === 'audit' ? [
            { severity: 'CRITICAL', component: 'Auth Middleware', description: 'Broken Object Level Authorization na API de pagamento.', status: 'Pendente' },
            { severity: 'HIGH', component: 'Data Layer', description: 'Ausência de criptografia em repouso nos campos de valor social.', status: 'Mitigado' }
          ] : []
        })
      });
      if (res.ok) {
        const data = await res.json();
        setDocContent(data.document);
        setDocStatus('generated');
        return;
      }
    } catch (e) {
      console.warn("Backend API doc generation failed, falling back to local builder:", e);
    }

    // Local Fallback Builder
    let result = '';
    const now = new Date().toLocaleDateString('pt-BR');
    if (docTemplate === 'contract') {
      result = `# CONTRATO DE PRESTAÇÃO DE SERVIÇOS E LICENCIAMENTO TECNOLÓGICO\n\n` +
        `**CONTRATANTE:** Orbe Systems Ltda.\n` +
        `**CONTRATADO:** ${docClientName}\n` +
        `**DATA DE EMISSÃO:** ${now}\n\n` +
        `### Cláusula 1ª - Do Objeto\n` +
        `O presente instrumento regula o licenciamento não-exclusivo do motor de Inteligência Artificial da Orbe Systems para validação de integridade física de imóveis (Imobverse SDK).\n\n` +
        `### Cláusula 2ª - Dos Níveis de Serviço (SLA)\n` +
        `O tempo de resposta do orquestrador via API Vercel/Render não deverá exceder 8 segundos sob operação estável.\n\n` +
        `Assinado digitalmente em ambiente seguro Orbe VDE.`;
    } else if (docTemplate === 'audit') {
      result = `# RELATÓRIO DE AUDITORIA DE SEGURANÇA E CONFORMIDADE DE DADOS\n\n` +
        `**ALVO:** OrbeSystems API Gateway v1.3.0\n` +
        `**AUDITOR:** ${docClientName}\n` +
        `**STATUS:** APROVADO COM RESSALVAS\n` +
        `**DATA:** ${now}\n\n` +
        `### Vulnerabilidades Analisadas\n` +
        `1. **Políticas de CORS**: Configuração de wildcard restrito para origin \`*.orbesystems.com.br\` testado com sucesso.\n` +
        `2. **Concorrência SQLite**: Habilitado timeout de 30 segundos nas transações para mitigar write locks.\n\n` +
        `### Conclusão\n` +
        `O gateway cumpre todos os requisitos do padrão Zero Trust.`;
    } else {
      result = `# LEADS DE INTERRUPÇÃO E INTELIGÊNCIA IMOBILIÁRIA\n\n` +
        `**GERADO POR:** Orbe Systems Reputation Engine\n` +
        `**OPERADOR:** ${docClientName}\n` +
        `**DATA:** ${now}\n\n` +
        `### Lista de Alvos Suspeitos (Lead Scores)\n` +
        `| ID Imóvel | Score Anterior | Score Atual | Risco de Inadimplência |\n` +
        `|---|---|---|---|\n` +
        `| prop-90a8 | 4.8 | 3.3 | Alto (Deterioração Crítica) |\n` +
        `| prop-72b1 | 5.0 | 4.9 | Mínimo |`;
    }
    setDocContent(result);
    setDocStatus('generated');
  };

  const downloadDoc = () => {
    const element = document.createElement("a");
    const file = new Blob([docContent], {type: 'text/markdown'});
    element.href = URL.createObjectURL(file);
    element.download = `${docTemplate}_documento.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // ── Powerful File Converter ────────────────────────────────────────────────
  const handleConvert = async () => {
    // Try Backend API
    try {
      const res = await fetch(`${API_URL}/api/suite-inteligente/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          mode: convertMode,
          content: convertInput
        })
      });
      if (res.ok) {
        const data = await res.json();
        setConvertOutput(data.result);
        return;
      }
    } catch (e) {
      console.warn("Backend API conversion failed, falling back to local logic:", e);
    }

    // Local Fallback Converter
    try {
      if (convertMode === 'json2csv') {
        const obj = JSON.parse(convertInput);
        const keys = Object.keys(Array.isArray(obj) ? obj[0] : obj);
        const values = Array.isArray(obj) ? obj : [obj];
        const csv = [
          keys.join(','),
          ...values.map(row => keys.map(k => JSON.stringify(row[k] ?? '')).join(','))
        ].join('\n');
        setConvertOutput(csv);
      } else if (convertMode === 'csv2json') {
        const lines = convertInput.trim().split('\n');
        const headers = lines[0].split(',');
        const json = lines.slice(1).map(line => {
          const vals = line.split(',');
          return headers.reduce((acc, h, i) => {
            acc[h.trim()] = vals[i]?.replace(/^"|"$/g, '').trim() ?? '';
            return acc;
          }, {} as any);
        });
        setConvertOutput(JSON.stringify(json, null, 2));
      } else if (convertMode === 'md2html') {
        let html = convertInput
          .replace(/^# (.*$)/gim, '<h1>$1</h1>')
          .replace(/^## (.*$)/gim, '<h2>$1</h2>')
          .replace(/^### (.*$)/gim, '<h3>$1</h3>')
          .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
          .replace(/\*(.*)\*/gim, '<em>$1</em>')
          .replace(/\n/g, '<br />');
        setConvertOutput(html);
      }
    } catch (err: any) {
      setConvertOutput(`[Conversor] Erro de Parsing: ${err.message}`);
    }
  };

  // ── High-Power Text/Code Compressor ──────────────────────────────
  const handleCompress = async () => {
    if (!compressInput) return;
    setIsCompressed(true);

    // Try Backend API
    try {
      const res = await fetch(`${API_URL}/api/suite-inteligente/compress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          content: compressInput,
          max_dict_size: 4096
        })
      });
      if (res.ok) {
        const data = await res.json();
        setCompressOutput(JSON.stringify(data.compressed_tokens));
        const origLen = compressInput.length;
        const compLen = JSON.stringify(data.compressed_tokens).length;
        const ratio = origLen > compLen 
          ? `${((1 - compLen / origLen) * 100).toFixed(1)}%` 
          : '0.0% (Texto muito pequeno para compressão de dicionário)';
        setCompressRatio(ratio);
        return;
      }
    } catch (e) {
      console.warn("Backend API compression failed, falling back to local logic:", e);
    }

    // Local Fallback LZW Compressor
    let dict = new Map<string, number>();
    let words = compressInput.split(/(\s+)/);
    let outputArr: string[] = [];
    let count = 0;
    
    words.forEach(w => {
      if (w.length > 3 && !dict.has(w)) {
        dict.set(w, count++);
      }
      if (dict.has(w)) {
        outputArr.push(`$${dict.get(w)}`);
      } else {
        outputArr.push(w);
      }
    });

    const dictStr = JSON.stringify(Object.fromEntries(dict));
    const compressedStr = `${dictStr}|||${outputArr.join('')}`;
    
    setCompressOutput(compressedStr);
    const origLen = compressInput.length;
    const compLen = compressedStr.length;
    const ratio = origLen > compLen 
      ? `${((1 - compLen / origLen) * 100).toFixed(1)}%` 
      : '0.0% (Texto muito pequeno para compressão de dicionário)';
    setCompressRatio(ratio);
  };

  return (
    <div className="flex-1 m-2 md:m-3 rounded-lg overflow-hidden border border-terminal-border flex flex-col bg-[#0d1117]">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#161b22] border-b border-terminal-border">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-neon-cyan animate-pulse" />
          <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
            Painel do Usuário Orbe Systems
          </span>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex gap-2">
          {[
            { id: 'overview', label: 'Geral', icon: Server },
            { id: 'webhooks', label: 'Orquestrador IA', icon: Cpu },
            { id: 'tools', label: 'Suite Inteligente', icon: Sparkles },
            { id: 'repos', label: 'Repositórios', icon: Database },
            { id: 'events', label: 'Eventos de Teste', icon: Clock }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded font-mono text-[10px] uppercase tracking-wider transition-all border ${
                  activeTab === tab.id
                    ? 'bg-neon-cyan/15 text-neon-cyan border-neon-cyan/35'
                    : 'text-terminal-muted hover:text-white border-transparent'
                }`}
              >
                <Icon size={12} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Panel Content */}
      <div className="flex-1 p-4 md:p-6 overflow-y-auto min-h-0 space-y-6">
        
        {apiFailed && activeTab !== 'tools' ? (
          <GracefulFailureView onReconnect={handleManualReconnect} isReconnecting={loading} />
        ) : (
          <>
            {/* TAB: Overview */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* User Profile Card */}
            <div className="lg:col-span-1 bg-white/3 border border-white/8 rounded-xl p-5 space-y-4">
              <h3 className="font-mono text-sm font-bold text-white border-b border-white/5 pb-2 uppercase tracking-wide">
                Identidade Técnica
              </h3>
              
              <div className="space-y-3 font-mono text-xs text-terminal-muted">
                <div>
                  <div className="text-[10px] text-white/40 uppercase">E-mail de Acesso</div>
                  <div className="text-white font-semibold mt-0.5">{user?.email || 'anonimo@orbesystems.com.br'}</div>
                </div>
                <div>
                  <div className="text-[10px] text-white/40 uppercase">Nível de Acesso</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {user?.role === 'premium' ? (
                      <span className="text-neon-purple font-bold flex items-center gap-1">
                        <Zap size={12} /> PREMIUM ADMIN
                      </span>
                    ) : (
                      <span className="text-white/60">CONTA STANDARD</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-white/40 uppercase">Créditos de Processamento IA</div>
                  <div className="text-neon-green font-bold mt-0.5">10 / 10 Ciclos</div>
                </div>
                <div>
                  <div className="text-[10px] text-white/40 uppercase">Região da Gateway</div>
                  <div className="text-white mt-0.5">sa-east-1 (São Paulo)</div>
                </div>
              </div>

              {user?.role !== 'premium' && (
                <a
                  href="/assinar"
                  className="block text-center w-full py-2 bg-gradient-to-r from-neon-purple to-neon-blue text-white rounded-lg font-mono text-xs font-bold hover:shadow-neon-purple transition-all"
                >
                  Adquirir Licença Premium
                </a>
              )}
            </div>

            {/* Quick Stats & System Health */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Info Banner */}
              <div className="bg-neon-cyan/5 border border-neon-cyan/20 rounded-xl p-4 flex gap-3.5 items-start">
                <ShieldCheck className="text-neon-cyan shrink-0 mt-0.5" size={20} />
                <div>
                  <h4 className="font-mono text-xs font-bold text-white uppercase tracking-wide">
                    Ambiente Virtual Operacional
                  </h4>
                  <p className="font-sans text-xs text-terminal-muted mt-1 leading-relaxed">
                    Sua conta Orbe está conectada à nossa infraestrutura de IA e microsserviços. 
                    Navegue nas abas para gerenciar modelos, testar webhooks ou explorar repositórios.
                  </p>
                </div>
              </div>

              {/* System Components Status Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { name: 'API Gateway', status: apiFailed ? 'OFFLINE' : 'ON', desc: 'FastAPI / main.py' },
                  { name: 'Reputation Engine', status: apiFailed ? 'OFFLINE' : 'ON', desc: 'Calculadora de Score' },
                  { name: 'Suite de Utilidades', status: 'ON', desc: 'DocGen & Conversor (Offline Mode)' }
                ].map((srv, idx) => (
                  <div key={idx} className="bg-white/2 border border-white/5 rounded-xl p-4">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-xs font-semibold text-white">{srv.name}</span>
                      <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                        srv.status === 'ON' ? 'bg-neon-green/15 text-neon-green' : 'bg-red-500/15 text-red-400'
                      }`}>{srv.status}</span>
                    </div>
                    <p className="font-mono text-[10px] text-terminal-muted mt-2">{srv.desc}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* TAB: Webhooks & LLM Simulator */}
        {activeTab === 'webhooks' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Controller Block */}
              <div className="bg-white/3 border border-white/8 rounded-xl p-5 space-y-4">
                <h3 className="font-mono text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wide">
                  <Cpu size={16} className="text-neon-cyan" />
                  Simular Vistoria com LLM
                </h3>
                <p className="font-sans text-xs text-terminal-muted leading-relaxed">
                  Envie fotos de check-out de componentes para que nossa IA as analise e aplique 
                  penalidades automáticas na engine de reputação de imóveis.
                </p>

                {properties.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-white/10 rounded-lg">
                    <AlertTriangle className="text-yellow-500 mx-auto mb-2" size={24} />
                    <p className="font-mono text-xs text-terminal-muted mb-3">Nenhum imóvel cadastrado no Imobverse.</p>
                    <button
                      onClick={handleSeed}
                      disabled={seeding}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-neon-cyan/20 border border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/35 text-xs font-bold font-mono rounded transition-all"
                    >
                      {seeding ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Play size={12} />
                      )}
                      Auto-Configurar Imóvel Demo
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Imóvel Selector */}
                    <div>
                      <label className="block font-mono text-[10px] text-terminal-muted uppercase mb-1.5">Imóvel</label>
                      <select
                        value={selectedPropId}
                        onChange={e => setSelectedPropId(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 font-mono text-xs text-white outline-none"
                      >
                        {properties.map(p => (
                          <option key={p.id} value={p.id} className="bg-[#111118]">
                            {p.title} (Score: {p.reputation_score.toFixed(1)})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Component Selector */}
                    <div>
                      <label className="block font-mono text-[10px] text-terminal-muted uppercase mb-1.5">Componente / Item de Vistoria</label>
                      {inspections.length === 0 ? (
                        <div className="text-xs font-mono text-red-400">Nenhum componente cadastrado neste imóvel.</div>
                      ) : (
                        <select
                          value={selectedItemId}
                          onChange={e => setSelectedItemId(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 font-mono text-xs text-white outline-none"
                        >
                          {inspections.map(i => (
                            <option key={i.id} value={i.id} className="bg-[#111118]">
                              {i.component_name} (Status: {i.status})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Checkout Photo Presets */}
                    <div>
                      <label className="block font-mono text-[10px] text-terminal-muted uppercase mb-1.5">Foto de Checkout</label>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <button
                          type="button"
                          onClick={() => {
                            setCheckoutUrl('https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=800');
                            setCustomCheckout(false);
                          }}
                          className={`py-2 px-3 rounded font-mono text-[10px] border text-center transition-all ${
                            !customCheckout && checkoutUrl.includes('dirty') === false
                              ? 'bg-neon-green/15 text-neon-green border-neon-green/30'
                              : 'bg-white/5 text-terminal-muted border-white/10 hover:text-white'
                          }`}
                        >
                          Sem Defeitos
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCheckoutUrl('https://images.unsplash.com/photo-1544725176-7c40e5a71c5e-dirty?w=800');
                            setCustomCheckout(false);
                          }}
                          className={`py-2 px-3 rounded font-mono text-[10px] border text-center transition-all ${
                            !customCheckout && checkoutUrl.includes('dirty')
                              ? 'bg-red-500/15 text-red-400 border-red-500/30'
                              : 'bg-white/5 text-terminal-muted border-white/10 hover:text-white'
                          }`}
                        >
                          Deteriorada (Erro)
                        </button>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setCustomCheckout(true);
                          setCheckoutUrl('');
                        }}
                        className={`w-full py-1.5 rounded font-mono text-[10px] border text-center transition-all ${
                          customCheckout
                            ? 'bg-neon-cyan/15 text-neon-cyan border-neon-cyan/30'
                            : 'bg-white/5 text-terminal-muted border-white/10 hover:text-white'
                        }`}
                      >
                        URL Customizada
                      </button>

                      {customCheckout && (
                        <input
                          value={checkoutUrl}
                          onChange={e => setCheckoutUrl(e.target.value)}
                          placeholder="https://exemplo.com/foto.jpg"
                          className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 mt-2 font-mono text-xs text-white outline-none"
                        />
                      )}
                    </div>

                    {/* Trigger Button */}
                    <button
                      onClick={handleSimulate}
                      disabled={simLoading || !selectedItemId}
                      className="w-full py-2.5 bg-gradient-to-r from-neon-cyan to-neon-blue text-white rounded-lg font-mono text-xs font-bold hover:shadow-neon-cyan transition-all flex items-center justify-center gap-2 disabled:opacity-55 disabled:cursor-not-allowed"
                    >
                      {simLoading ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          Processando com LLM...
                        </>
                      ) : (
                        <>
                          <Play size={12} />
                          Enviar Foto & Analisar via IA
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Log Monitor Block */}
              <div className="bg-black border border-white/10 rounded-xl p-5 flex flex-col min-h-[300px] font-mono text-xs">
                <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
                  <span className="text-white/80 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                    <Clock size={12} className="text-neon-cyan" />
                    Monitor de Eventos e Payloads
                  </span>
                  <span className="text-[10px] text-neon-cyan">LIVE LOGS</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 leading-relaxed max-h-[260px] pr-2">
                  {simLogs.length === 0 ? (
                    <div className="text-white/20 italic py-12 text-center">
                      Aguardando início de simulação...
                    </div>
                  ) : (
                    simLogs.map((log, idx) => (
                      <div key={idx} className={
                        log.includes('✅') || log.includes('🎯')
                          ? 'text-neon-green'
                          : log.includes('❌') || log.includes('⚠️')
                          ? 'text-red-400'
                          : log.includes('Response:') || log.includes('payload')
                          ? 'text-neon-cyan/90'
                          : 'text-white/50'
                      }>
                        {log}
                      </div>
                    ))
                  )}
                </div>

                {/* Final AI Output JSON display */}
                {aiResponse && (
                  <div className="mt-4 border-t border-white/10 pt-3">
                    <div className="text-[10px] text-white/40 uppercase mb-2 flex items-center gap-1">
                      <FileJson size={10} /> Payload do Webhook Processado:
                    </div>
                    <pre className="p-3 bg-white/2 border border-white/5 rounded-lg text-[10px] text-neon-green overflow-x-auto max-h-[120px]">
                      {JSON.stringify(aiResponse, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* TAB: Suite Inteligente (DocGen & Conversor & Compactador) */}
        {activeTab === 'tools' && (
          <div className="space-y-6">
            
            {/* Top Grid: DocGen & Converter */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Document Generator */}
              <div className="bg-white/3 border border-white/8 rounded-xl p-5 space-y-4">
                <h3 className="font-mono text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wide">
                  <FileText size={16} className="text-neon-cyan" />
                  Gerador de Documentos Smart
                </h3>
                <p className="font-sans text-xs text-terminal-muted leading-relaxed">
                  Crie documentações estruturadas e relatórios de auditoria prontos para uso através de templates otimizados.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block font-mono text-[9px] text-terminal-muted uppercase mb-1">Modelo de Template</label>
                    <select
                      value={docTemplate}
                      onChange={e => setDocTemplate(e.target.value as any)}
                      className="w-full bg-white/5 border border-white/10 rounded px-2.5 py-1.5 font-mono text-xs text-white outline-none"
                    >
                      <option value="contract" className="bg-[#111118]">Contrato de Licenciamento</option>
                      <option value="audit" className="bg-[#111118]">Relatório de Auditoria RLS</option>
                      <option value="leads" className="bg-[#111118]">Relatório de Leads IMOB</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-mono text-[9px] text-terminal-muted uppercase mb-1">Nome da Contraparte (Variável)</label>
                    <input
                      value={docClientName}
                      onChange={e => setDocClientName(e.target.value)}
                      placeholder="Empresa / Auditor"
                      className="w-full bg-white/5 border border-white/10 rounded px-2.5 py-1.5 font-mono text-xs text-white outline-none focus:border-neon-cyan/50"
                    />
                  </div>

                  <button
                    onClick={generateDocument}
                    className="w-full py-2 bg-neon-cyan/20 border border-neon-cyan/40 text-neon-cyan rounded font-mono text-xs font-bold hover:bg-neon-cyan/35 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Sparkles size={13} />
                    Gerar Documento
                  </button>
                </div>

                {docStatus === 'generated' && (
                  <div className="mt-4 border-t border-white/5 pt-4 space-y-3">
                    <pre className="p-3 bg-black/40 border border-white/5 rounded-lg text-[10px] text-white/95 overflow-y-auto max-h-[140px] font-mono leading-relaxed whitespace-pre-wrap">
                      {docContent}
                    </pre>
                    <button
                      onClick={downloadDoc}
                      className="w-full py-1.5 bg-neon-green/10 border border-neon-green/30 text-neon-green hover:bg-neon-green/20 rounded font-mono text-xs transition-all flex items-center justify-center gap-1.5"
                    >
                      <Download size={13} />
                      Exportar em Markdown (.md)
                    </button>
                  </div>
                )}
              </div>

              {/* Advanced Converter */}
              <div className="bg-white/3 border border-white/8 rounded-xl p-5 space-y-4">
                <h3 className="font-mono text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wide">
                  <Sliders size={16} className="text-neon-cyan" />
                  Conversor de Estruturas
                </h3>
                <p className="font-sans text-xs text-terminal-muted leading-relaxed">
                  Traduza formatos de dados instantaneamente para interações rápidas com APIs.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block font-mono text-[9px] text-terminal-muted uppercase mb-1">Operação</label>
                    <select
                      value={convertMode}
                      onChange={e => setConvertMode(e.target.value as any)}
                      className="w-full bg-white/5 border border-white/10 rounded px-2.5 py-1.5 font-mono text-xs text-white outline-none"
                    >
                      <option value="json2csv" className="bg-[#111118]">JSON para CSV</option>
                      <option value="csv2json" className="bg-[#111118]">CSV para JSON</option>
                      <option value="md2html" className="bg-[#111118]">Markdown para HTML</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-mono text-[9px] text-white/30 uppercase mb-1">Entrada</label>
                      <textarea
                        value={convertInput}
                        onChange={e => setConvertInput(e.target.value)}
                        className="w-full h-32 bg-black/45 border border-white/10 rounded p-2 font-mono text-[10px] text-white outline-none resize-none"
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[9px] text-white/30 uppercase mb-1">Saída</label>
                      <textarea
                        value={convertOutput}
                        readOnly
                        placeholder="Resultado da conversão..."
                        className="w-full h-32 bg-black/75 border border-white/10 rounded p-2 font-mono text-[10px] text-neon-green outline-none resize-none"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleConvert}
                    className="w-full py-2 bg-neon-cyan/20 border border-neon-cyan/40 text-neon-cyan rounded font-mono text-xs font-bold hover:bg-neon-cyan/35 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Code size={13} />
                    Executar Conversão
                  </button>
                </div>
              </div>

            </div>

            {/* Bottom Section: Dictionary Compressor */}
            <div className="bg-white/3 border border-white/8 rounded-xl p-5 space-y-4">
              <h3 className="font-mono text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wide">
                <Scissors size={16} className="text-neon-cyan" />
                Compactador de Texto & Código de Alta Performance
              </h3>
              <p className="font-sans text-xs text-terminal-muted leading-relaxed">
                Algoritmo de compressão baseado em dicionário estático-dinâmico LZW otimizado para scripts e códigos de configuração.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-[9px] text-white/30 uppercase mb-1.5">Código / Texto Original</label>
                  <textarea
                    value={compressInput}
                    onChange={e => setCompressInput(e.target.value)}
                    className="w-full h-24 bg-black/35 border border-white/10 rounded p-2.5 font-mono text-[10px] text-white outline-none resize-none"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[9px] text-white/30 uppercase mb-1.5">Buffer Compactado</label>
                  <textarea
                    value={compressOutput}
                    readOnly
                    placeholder="Buffer compactado..."
                    className="w-full h-24 bg-black/75 border border-white/10 rounded p-2.5 font-mono text-[10px] text-neon-purple outline-none resize-none"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/5 pt-4">
                <div className="flex gap-4 text-xs font-mono">
                  <div>
                    <span className="text-white/40">Tamanho Original:</span>{' '}
                    <span className="text-white font-bold">{compressInput.length} B</span>
                  </div>
                  <div>
                    <span className="text-white/40">Tamanho Compactado:</span>{' '}
                    <span className="text-white font-bold">{compressOutput.length} B</span>
                  </div>
                  <div>
                    <span className="text-neon-green font-bold">Taxa de Compressão: {compressRatio}</span>
                  </div>
                </div>

                <button
                  onClick={handleCompress}
                  className="px-6 py-2 bg-gradient-to-r from-neon-cyan to-neon-blue text-white rounded font-mono text-xs font-bold hover:shadow-neon-cyan transition-all"
                >
                  Compactar Arquivo
                </button>
              </div>
            </div>

          </div>
        )}

        {/* TAB: Repositories list */}
        {activeTab === 'repos' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wide">
                Repositórios Orbe Systems
              </h3>
              <button
                onClick={fetchRepos}
                disabled={reposLoading}
                className="p-1.5 hover:bg-white/5 rounded text-terminal-muted hover:text-white"
                title="Sincronizar"
              >
                <RefreshCw size={14} className={reposLoading ? 'animate-spin' : ''} />
              </button>
            </div>

            {reposLoading ? (
              <div className="text-center py-12 text-terminal-muted font-mono text-xs">
                Carregando repositórios...
              </div>
            ) : repos.length === 0 ? (
              <div className="text-center py-12 text-terminal-muted border border-dashed border-white/10 rounded-xl font-mono text-xs">
                Nenhum repositório de projeto cadastrado no banco de dados.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {repos.map(repo => (
                  <div key={repo.id} className="bg-white/3 border border-white/8 rounded-xl p-4 flex flex-col justify-between hover:border-neon-cyan/30 transition-all">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-mono text-xs font-bold text-white truncate max-w-[70%]">
                          {repo.name}
                        </span>
                        {repo.is_featured && (
                          <span className="font-mono text-[9px] text-neon-purple px-1.5 py-0.5 rounded border border-neon-purple/20 bg-neon-purple/5">
                            DESTAQUE
                           </span>
                        )}
                      </div>
                      
                      <p className="font-sans text-[11px] text-terminal-muted line-clamp-3 mb-4 leading-relaxed">
                        {repo.description || 'Sem descrição cadastrada para este projeto.'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/5 pt-3">
                      <span className="font-mono text-[10px] text-neon-cyan">
                        {repo.language || 'Codebase'}
                      </span>
                      {repo.html_url && (
                        <a
                          href={repo.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[10px] text-white hover:text-neon-cyan flex items-center gap-1 transition-all"
                        >
                          Ver no GitHub <ArrowRight size={10} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: Test Events List & Dispatcher */}
        {activeTab === 'events' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div>
                <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wide">
                  Console de Monitoramento de Eventos
                </h3>
                <p className="font-sans text-xs text-terminal-muted mt-0.5">
                  Visualização em tempo real de logs de teste, prova matemática do IMORTAL, e auditoria de segurança.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={fetchTestEvents}
                  disabled={eventsLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded font-mono text-[10px] uppercase text-white hover:bg-white/10 transition-all"
                >
                  <RefreshCw size={11} className={eventsLoading ? 'animate-spin' : ''} />
                  Atualizar
                </button>
                <button
                  onClick={handleClearTestEvents}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded font-mono text-[10px] uppercase text-red-400 hover:bg-red-500/20 transition-all"
                >
                  Limpar Logs
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap gap-4 bg-white/2 border border-white/5 rounded-lg p-3.5">
              <div className="flex items-center gap-2">
                <label className="font-mono text-[10px] text-white/40 uppercase">Filtrar Serviço:</label>
                <select
                  value={eventFilterService}
                  onChange={e => setEventFilterService(e.target.value)}
                  className="bg-black/40 border border-white/10 rounded px-2.5 py-1 font-mono text-xs text-white outline-none"
                >
                  <option value="">Todos os Serviços</option>
                  <option value="gateway">Gateway API</option>
                  <option value="imobverse">Imobverse</option>
                  <option value="imortal">IMORTAL</option>
                  <option value="powershell_bot">PowerShell Bot</option>
                  <option value="suite_inteligente">Suite Inteligente</option>
                  <option value="dashboard">Dashboard VDE</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="font-mono text-[10px] text-white/40 uppercase">Status:</label>
                <select
                  value={eventFilterStatus}
                  onChange={e => setEventFilterStatus(e.target.value)}
                  className="bg-black/40 border border-white/10 rounded px-2.5 py-1 font-mono text-xs text-white outline-none"
                >
                  <option value="">Todos</option>
                  <option value="success">Sucesso</option>
                  <option value="failed">Falha</option>
                  <option value="warning">Aviso</option>
                  <option value="info">Informação</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Event list */}
              <div className="lg:col-span-2 space-y-3">
                <div className="bg-black/30 border border-white/5 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white/5 border-b border-white/5 font-mono text-[10px] text-white/40 uppercase">
                          <th className="p-3">Data/Hora</th>
                          <th className="p-3">Serviço</th>
                          <th className="p-3">Tipo</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Mensagem</th>
                        </tr>
                      </thead>
                      <tbody className="font-mono text-xs text-white/80 divide-y divide-white/5">
                        {eventsLoading ? (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-terminal-muted">
                              Buscando registros na tabela...
                            </td>
                          </tr>
                        ) : testEvents.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-terminal-muted">
                              Nenhum evento registrado com os filtros ativos.
                            </td>
                          </tr>
                        ) : (
                          testEvents.map(evt => {
                            const isSuccess = evt.status === 'success';
                            const isFailed = evt.status === 'failed';
                            const isWarning = evt.status === 'warning';
                            return (
                              <React.Fragment key={evt.id}>
                                <tr className="hover:bg-white/2 transition-colors">
                                  <td className="p-3 text-[10px] text-white/45">
                                    {new Date(evt.created_at).toLocaleString('pt-BR')}
                                  </td>
                                  <td className="p-3">
                                    <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px]">
                                      {evt.service}
                                    </span>
                                  </td>
                                  <td className="p-3 text-[10px] uppercase font-semibold text-neon-cyan">
                                    {evt.event_type}
                                  </td>
                                  <td className="p-3">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      isSuccess ? 'bg-neon-green/15 text-neon-green' :
                                      isFailed ? 'bg-red-500/15 text-red-400' :
                                      isWarning ? 'bg-yellow-500/15 text-yellow-400' :
                                      'bg-neon-cyan/15 text-neon-cyan'
                                    }`}>
                                      {evt.status.toUpperCase()}
                                    </span>
                                  </td>
                                  <td className="p-3 max-w-[200px] truncate" title={evt.message}>
                                    {evt.message}
                                  </td>
                                </tr>
                                {evt.details && (
                                  <tr className="bg-black/60">
                                    <td colSpan={5} className="p-3 text-[10px] text-terminal-muted border-t border-b border-white/5">
                                      <div className="flex gap-2 items-start pl-4">
                                        <span className="text-neon-purple font-bold">PAYLOAD:</span>
                                        <pre className="text-neon-green/90 whitespace-pre-wrap leading-relaxed max-w-full overflow-x-auto">
                                          {JSON.stringify(evt.details)}
                                        </pre>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Creator Form */}
              <div className="lg:col-span-1">
                <div className="bg-white/3 border border-white/8 rounded-xl p-5 space-y-4">
                  <h4 className="font-mono text-xs font-bold text-white uppercase tracking-wide border-b border-white/5 pb-2">
                    Disparar Evento de Teste
                  </h4>
                  <form onSubmit={handleCreateTestEvent} className="space-y-4">
                    <div>
                      <label className="block font-mono text-[9px] text-white/40 uppercase mb-1">Tipo do Evento</label>
                      <input
                        value={newEventForm.event_type}
                        onChange={e => setNewEventForm(prev => ({ ...prev, event_type: e.target.value }))}
                        className="w-full bg-black/40 border border-white/10 rounded px-2.5 py-1.5 font-mono text-xs text-white outline-none focus:border-neon-cyan/50"
                        required
                        placeholder="e.g. simulation_run"
                      />
                    </div>

                    <div>
                      <label className="block font-mono text-[9px] text-white/40 uppercase mb-1">Serviço</label>
                      <select
                        value={newEventForm.service}
                        onChange={e => setNewEventForm(prev => ({ ...prev, service: e.target.value }))}
                        className="w-full bg-black/40 border border-white/10 rounded px-2.5 py-1.5 font-mono text-xs text-white outline-none focus:border-neon-cyan/50"
                      >
                        <option value="dashboard">Dashboard VDE</option>
                        <option value="gateway">Gateway API</option>
                        <option value="imobverse">Imobverse</option>
                        <option value="imortal">IMORTAL</option>
                        <option value="powershell_bot">PowerShell Bot</option>
                        <option value="suite_inteligente">Suite Inteligente</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-mono text-[9px] text-white/40 uppercase mb-1">Status</label>
                      <select
                        value={newEventForm.status}
                        onChange={e => setNewEventForm(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full bg-black/40 border border-white/10 rounded px-2.5 py-1.5 font-mono text-xs text-white outline-none focus:border-neon-cyan/50"
                      >
                        <option value="success">Sucesso (success)</option>
                        <option value="failed">Falha (failed)</option>
                        <option value="warning">Aviso (warning)</option>
                        <option value="info">Informação (info)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-mono text-[9px] text-white/40 uppercase mb-1">Mensagem descritiva</label>
                      <textarea
                        value={newEventForm.message}
                        onChange={e => setNewEventForm(prev => ({ ...prev, message: e.target.value }))}
                        className="w-full h-20 bg-black/40 border border-white/10 rounded p-2 font-mono text-xs text-white outline-none focus:border-neon-cyan/50 resize-none"
                        required
                        placeholder="Descreva o que ocorreu no teste..."
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-gradient-to-r from-neon-cyan to-neon-blue text-white rounded font-mono text-xs font-bold hover:shadow-neon-cyan transition-all flex items-center justify-center gap-1.5"
                    >
                      <Play size={12} />
                      Disparar Evento
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
            )}

          </>
        )}

      </div>
    </div>
  );
}

// ── Helper Components for Graceful Failure Design ────────────────────────────

function BrokenLattice() {
  return (
    <div className="relative w-full h-48 flex items-center justify-center overflow-hidden">
      <svg width="240" height="180" viewBox="0 0 240 180" className="overflow-visible">
        <defs>
          <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-magenta" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Fractured Orb */}
        <g transform="translate(120, 90)">
          {/* Left half */}
          <path
            d="M -35,0 C -35,-20 -20,-35 0,-35 L -2,-10 L 5,5 L -5,12 L 2,35 C -20,35 -35,20 -35,0 Z"
            fill="none"
            stroke="#00f2fe"
            strokeWidth="2"
            filter="url(#glow-cyan)"
            className="animate-pulse"
          />
          {/* Right half slightly offset to show fracture */}
          <path
            d="M 35,0 C 35,-20 20,-35 0,-35 L -2,-10 L 5,5 L -5,12 L 2,35 C 20,35 35,20 35,0 Z"
            fill="none"
            stroke="#ff007f"
            strokeWidth="2"
            filter="url(#glow-magenta)"
            transform="translate(8, 4) rotate(5)"
            className="animate-pulse"
          />
        </g>

        {/* Network lattice lines - fragmented */}
        <line x1="40" y1="50" x2="80" y2="70" stroke="#00f2fe" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
        <line x1="200" y1="50" x2="160" y2="75" stroke="#ff007f" strokeWidth="1" strokeDasharray="2 2" opacity="0.4" />
        <line x1="50" y1="130" x2="90" y2="110" stroke="#00f2fe" strokeWidth="1" opacity="0.3" />
        <line x1="190" y1="130" x2="150" y2="115" stroke="#ff007f" strokeWidth="1" opacity="0.3" />

        {/* Broken links indicators */}
        <circle cx="80" cy="70" r="3" fill="#ff007f" filter="url(#glow-magenta)" />
        <circle cx="160" cy="75" r="3" fill="#00f2fe" filter="url(#glow-cyan)" />
        
        {/* Floating particles escaping */}
        <circle cx="100" cy="45" r="2" fill="#00f2fe" opacity="0.8" className="animate-bounce" style={{ animationDuration: '3s' }} />
        <circle cx="145" cy="50" r="1.5" fill="#ff007f" opacity="0.6" className="animate-ping" style={{ animationDuration: '2.5s' }} />
        <circle cx="75" cy="100" r="2" fill="#00f2fe" opacity="0.7" />
        <circle cx="165" cy="105" r="1" fill="#ff007f" opacity="0.5" />
        <circle cx="120" cy="140" r="2.5" fill="#00f2fe" opacity="0.9" className="animate-pulse" />
      </svg>
    </div>
  );
}

interface GracefulFailureViewProps {
  onReconnect: () => void;
  isReconnecting: boolean;
}

function GracefulFailureView({ onReconnect, isReconnecting }: GracefulFailureViewProps) {
  return (
    <div className="relative min-h-[500px] w-full flex flex-col lg:flex-row items-center justify-center gap-8 py-8 px-4 bg-[#0a0c10]/40 rounded-xl overflow-hidden">
      {/* Background stars / cosmic dust */}
      <div className="absolute inset-0 bg-radial-gradient from-purple-900/10 via-transparent to-transparent pointer-events-none opacity-40" />

      {/* Side Panel: CODEX ORBE */}
      <div className="w-full lg:w-64 bg-[#161b22]/50 border border-white/5 rounded-xl p-5 font-mono text-xs flex flex-col justify-between h-auto lg:h-[380px] shrink-0">
        <div>
          <div className="flex items-center gap-2 text-neon-cyan border-b border-white/5 pb-2 mb-4">
            <span className="font-bold tracking-wider">CODEX ORBE</span>
          </div>
          <div className="space-y-4 text-terminal-muted leading-relaxed">
            <div>
              <span className="text-white/40 block text-[9px] uppercase">Protocolo Ativo</span>
              <span className="text-white font-semibold">Protocolo II</span>
            </div>
            <div>
              <span className="text-white/40 block text-[9px] uppercase">Estado de Rede</span>
              <span className="text-red-400 font-semibold uppercase flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                Desconectado
              </span>
            </div>
            <div>
              <span className="text-white/40 block text-[9px] uppercase">Modo de Operação</span>
              <span className="text-yellow-500 font-bold uppercase">MODO CONTINGÊNCIA</span>
            </div>
          </div>
        </div>
        <div className="text-[10px] text-white/20 mt-6 lg:mt-0 leading-relaxed border-t border-white/5 pt-3">
          As ferramentas locais na aba "Suite de Utilidades" continuam operacionais através do processamento offline.
        </div>
      </div>

      {/* Central Card: Gracioso Data Fracture */}
      <div 
        className="flex-1 max-w-xl bg-[#0d1117]/80 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8 flex flex-col items-center text-center relative overflow-hidden"
        style={{
          boxShadow: '0 0 30px rgba(0, 242, 254, 0.03), 0 0 30px rgba(255, 0, 127, 0.03)',
          borderImage: 'linear-gradient(to bottom right, rgba(0, 242, 254, 0.3), rgba(255, 0, 127, 0.3)) 1'
        }}
      >
        {/* Glowing border overlays */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-neon-cyan/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-neon-purple/50 to-transparent" />

        {/* Top left card indicator inside the card */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <Link2Off className="text-neon-purple animate-pulse" size={16} />
          <span className="font-mono text-[9px] text-white/45 tracking-widest">ERROR_CODE: 0x500_CORS</span>
        </div>

        {/* Fragmented Satellites Hologram */}
        <BrokenLattice />

        {/* Info */}
        <div className="space-y-3 mt-4">
          <h2 className="font-mono text-base md:text-lg font-bold text-white tracking-wider uppercase flex items-center justify-center gap-2">
            CONEXÃO ORBE: SINAL INTERROMPIDO
          </h2>
          <p className="font-mono text-xs text-neon-purple font-semibold tracking-wide">
            Integridade do Backend: Falha (HTTP 500/CORS)
          </p>
          <p className="font-sans text-xs text-terminal-muted max-w-md mx-auto leading-relaxed">
            Tentando reconexão automática. Funcionalidades offline ativas no seu terminal.
          </p>
        </div>

        {/* Manual Reconnect Button */}
        <div className="mt-8 w-full max-w-xs">
          <button
            onClick={onReconnect}
            disabled={isReconnecting}
            className="w-full py-3 bg-gradient-to-r from-neon-cyan/10 to-neon-purple/10 hover:from-neon-cyan/20 hover:to-neon-purple/20 border border-neon-cyan/40 hover:border-neon-purple/60 rounded-xl font-mono text-xs font-bold text-[#00f2fe] tracking-widest transition-all duration-300 shadow-[0_0_15px_rgba(0,242,254,0.1)] hover:shadow-[0_0_25px_rgba(255,0,127,0.2)] flex items-center justify-center gap-2"
          >
            {isReconnecting ? (
              <>
                <Loader2 size={13} className="animate-spin text-[#00f2fe]" />
                RECONECTANDO...
              </>
            ) : (
              <>
                <RefreshCw size={13} className="text-[#00f2fe]" style={{ animation: 'spin 8s linear infinite' }} />
                TENTAR RECONEXÃO MANUAL (OPCIONAL)
              </>
            )}
          </button>
        </div>
      </div>

      {/* Orbe Assistant chat bubble in corner */}
      <div className="absolute bottom-4 right-4 max-w-xs bg-[#161b22] border border-neon-cyan/35 rounded-xl p-4 shadow-[0_4px_12px_rgba(0,242,254,0.08)] flex gap-3 items-start animate-fade-in">
        <div className="w-8 h-8 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center shrink-0">
          <Bot className="text-neon-cyan" size={16} />
        </div>
        <div className="font-mono text-[11px] leading-relaxed">
          <div className="text-white/40 text-[9px] uppercase font-bold tracking-wider">Orbe Assistant</div>
          <p className="text-white/95 mt-1 font-sans">
            "Perda de sinal detectada. Estou monitorando, Rafael."
          </p>
        </div>
      </div>
    </div>
  );
}

