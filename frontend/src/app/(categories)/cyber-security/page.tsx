'use client';

import React, { useState, useEffect } from 'react';
import { 
  Shield, ArrowLeft, ArrowRight, Code2, Network, Terminal, Lock, Play, 
  CheckCircle2, AlertTriangle, Key, RefreshCw, Server, Cpu, Database
} from 'lucide-react';
import Link from 'next/link';
import ScrollReveal from '@/components/ScrollReveal';

type ServiceId = 'devsecops' | 'api-hardening' | 'infra-sec';

interface ServiceDetail {
  id: ServiceId;
  title: string;
  focus: string;
  hook: string;
  description: string;
  icon: React.ComponentType<any>;
  details: string[];
  command: string;
  consoleLines: { text: string; type: 'info' | 'warning' | 'error' | 'success' }[];
}

const SERVICES: ServiceDetail[] = [
  {
    id: 'devsecops',
    title: 'Auditoria de Código e DevSecOps',
    focus: 'Foco em Python / Web',
    hook: 'Proteja seu produto antes do lançamento',
    description: 'Analisar repositórios Git de startups ou pequenas empresas atrás de vulnerabilidades que possam comprometer a segurança, propriedade intelectual ou chaves de acesso.',
    icon: Code2,
    details: [
      'Identificação de SQL Injection em queries cruas ou query builders.',
      'Varredura automatizada e manual por credenciais/chaves expostas no código (Git Secrets).',
      'Validação de fluxo de autenticação e tokens (quebra de controle de acesso).',
      'Configuração de esteiras CI/CD seguras para auditoria contínua de pacotes externos.'
    ],
    command: './audit_git_repository.py --target=startup-repo --depth=full',
    consoleLines: [
      { text: '[SYS] Inicializando varredura profunda no repositório git...', type: 'info' },
      { text: '[SCAN] Buscando por tokens expostos em commits passados...', type: 'info' },
      { text: '[CRITICAL] Chave de API da AWS exposta em "src/config/aws.py" na linha 14!', type: 'error' },
      { text: '[SCAN] Analisando injeções de código SQL em rotas de entrada...', type: 'info' },
      { text: '[WARNING] SQL Injection detectado em "src/controllers/auth.py" (raw query interpolation)', type: 'warning' },
      { text: '[SCAN] Verificando assinaturas de autenticação JWT...', type: 'info' },
      { text: '[CRITICAL] JWT Decode sem validação de chave pública encontrado em "src/utils/security.py"', type: 'error' },
      { text: '[STATUS] Auditoria concluída. 3 vulnerabilidades críticas encontradas.', type: 'error' },
      { text: '[SUGESTÃO] Proteja seu produto antes do lançamento! Corrija os patches pendentes.', type: 'success' }
    ]
  },
  {
    id: 'api-hardening',
    title: 'Hardenização e Proteção de APIs',
    focus: 'FastAPI, Flask, Express, etc.',
    hook: 'Camadas robustas para APIs expostas',
    description: 'Elevar o nível de segurança de APIs existentes, garantindo que ataques comuns sejam repelidos a nível de rede e aplicação de forma automatizada.',
    icon: Shield,
    details: [
      'Implementação de Rate Limiting granular por IP e API Key para evitar DDoS.',
      'Configuração de CORS estrito, bloqueando requisições de origens não autorizadas.',
      'Autenticação JWT segura com expiração curta e rota de refresh criptografada.',
      'Criptografia de dados sensíveis em repouso e trânsito (AES-256 e SSL A+).'
    ],
    command: 'curl -i -X GET https://api.orbesystems.com.br/v1/secure-endpoint',
    consoleLines: [
      { text: '[TEST] Enviando múltiplas requisições sequenciais (stress test)...', type: 'info' },
      { text: '[OK] Rate Limiter acionado: HTTP 429 Too Many Requests após 60 req/min.', type: 'success' },
      { text: '[TEST] Validando CORS policy de domínio externo malicioso...', type: 'info' },
      { text: '[OK] Requisição bloqueada pelo navegador: Access-Control-Allow-Origin ausente.', type: 'success' },
      { text: '[TEST] Validando cookies com flags de segurança...', type: 'info' },
      { text: '[OK] Secure, HttpOnly e SameSite=Strict validados em todos os cabeçalhos.', type: 'success' },
      { text: '[STATUS] Módulos de proteção de API ativos com integridade de 100%.', type: 'success' }
    ]
  },
  {
    id: 'infra-sec',
    title: 'Redes e Acesso Seguro (Infra/Sec)',
    focus: 'VPN / WireGuard / Firewalls',
    hook: 'Perímetro fechado e blindado',
    description: 'Implementar túneis VPN privados utilizando WireGuard para que sua equipe acesse infraestruturas de nuvem de forma segura, junto com auditorias profundas de regras de firewall.',
    icon: Network,
    details: [
      'Configuração e implantação de túneis privados WireGuard de alta performance.',
      'Políticas de firewall de privilégio mínimo (fechamento completo de portas não utilizadas).',
      'Isolamento de servidores internos de banco de dados (VPCs e redes privadas).',
      'Configuração de IDS/IPS (Sistemas de detecção e prevenção de intrusão).'
    ],
    command: 'wg show && ufw status verbose',
    consoleLines: [
      { text: '[INFRA] Listando status do firewall local (UFW)...', type: 'info' },
      { text: '[STATUS] Firewall ativo. Portas liberadas: 443 (HTTPS), 51820 (WireGuard UDP).', type: 'success' },
      { text: '[INFRA] Inicializando túnel privado seguro (interface wg0)...', type: 'info' },
      { text: '[OK] Tunnel wg0 estabelecido. Endereçamento CIDR: 10.0.10.0/24.', type: 'success' },
      { text: '[TEST] Testando handshake bidirecional com peer remoto...', type: 'info' },
      { text: '[OK] Conexão encriptada estabelecida com sucesso. Latência média: 12ms.', type: 'success' },
      { text: '[STATUS] Acesso seguro restrito e isolado com WireGuard operacional.', type: 'success' }
    ]
  }
];

export default function CyberSecurityPage() {
  const [activeTab, setActiveTab] = useState<ServiceId>('devsecops');
  const [consoleOutput, setConsoleOutput] = useState<typeof SERVICES[0]['consoleLines']>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const selectedService = SERVICES.find(s => s.id === activeTab)!;

  // Sound feedback synthesizer
  const playBeep = (freq = 800, duration = 0.05, type: OscillatorType = 'sine') => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.006, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio Context blocked:', e);
    }
  };

  const runSimulation = () => {
    if (isRunning) return;
    setIsRunning(true);
    setConsoleOutput([]);
    playBeep(600, 0.05, 'triangle');

    const lines = selectedService.consoleLines;
    let index = 0;

    const tick = () => {
      if (index < lines.length) {
        setConsoleOutput(prev => [...prev, lines[index]]);
        // Vary sound pitch depending on log type
        const line = lines[index];
        const pitch = line.type === 'error' ? 200 : line.type === 'warning' ? 450 : 800 + index * 50;
        playBeep(pitch, 0.04, line.type === 'error' ? 'sawtooth' : 'sine');
        
        index++;
        setTimeout(tick, 400 + Math.random() * 300);
      } else {
        setIsRunning(false);
        playBeep(1200, 0.1, 'sine');
      }
    };
    setTimeout(tick, 200);
  };

  useEffect(() => {
    setConsoleOutput([]);
    setIsRunning(false);
  }, [activeTab]);

  return (
    <div className="space-y-8 font-mono">
      {/* Page Header */}
      <ScrollReveal variant="fade-up" delay={0}>
        <section className="space-y-4">
          <div className="flex items-center gap-3 text-neon-green mb-2">
            <Shield size={22} className="animate-pulse-neon" />
            <h1 className="text-2xl font-bold tracking-tight uppercase">Cyber Security / Defesas</h1>
          </div>
          
          <div className="space-y-2 opacity-80 text-sm md:text-base leading-relaxed">
            <p className="flex items-center gap-2">
              <span className="text-neon-cyan">$</span> 
              <span>./show_security_pillars.sh</span>
            </p>
            <p className="text-terminal-muted border-l-2 border-neon-green/30 pl-4 py-1">
              Blindagem digital completa para a sua startup ou negócio. Oferecemos auditorias focadas, 
              camadas de proteção ativa em APIs e infraestrutura de acesso remoto WireGuard estritamente segura.
            </p>
          </div>
        </section>
      </ScrollReveal>

      {/* Tabs / Services selector */}
      <ScrollReveal variant="fade-up" delay={100}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {SERVICES.map(s => {
            const Icon = s.icon;
            const isActive = s.id === activeTab;
            return (
              <button
                key={s.id}
                onClick={() => {
                  setActiveTab(s.id);
                  playBeep(700, 0.03, 'sine');
                }}
                className={`flex items-center gap-3 p-3.5 border rounded-lg text-left transition-all duration-300 ${
                  isActive 
                    ? 'bg-neon-green/10 border-neon-green text-neon-green shadow-[0_0_15px_rgba(57,255,20,0.15)]' 
                    : 'bg-terminal-surface/40 border-terminal-border/40 text-terminal-muted hover:border-neon-green/40 hover:text-white'
                }`}
              >
                <Icon size={16} className={isActive ? 'animate-pulse' : ''} />
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider">{s.title}</div>
                  <div className="text-[9px] opacity-60 mt-0.5">{s.focus}</div>
                </div>
              </button>
            );
          })}
        </div>
      </ScrollReveal>

      {/* Active Service Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch pt-4 border-t border-terminal-border/20">
        
        {/* Left Column: Descriptions & Details */}
        <ScrollReveal variant="fade-up" delay={150}>
          <div className="bg-terminal-surface/30 border border-terminal-border/30 rounded-lg p-6 flex flex-col justify-between h-full space-y-6">
            <div className="space-y-4">
              <div>
                <span className="text-[10px] text-neon-green font-bold tracking-[0.2em] uppercase">
                  {selectedService.focus}
                </span>
                <h2 className="text-lg font-bold text-white mt-1 uppercase">
                  {selectedService.title}
                </h2>
                <div className="text-[11px] text-neon-purple font-semibold italic mt-1.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-neon-purple animate-pulse" />
                  "{selectedService.hook}"
                </div>
              </div>

              <p className="text-xs text-terminal-muted leading-relaxed">
                {selectedService.description}
              </p>

              <div className="space-y-2.5 pt-2">
                <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Diretrizes de Proteção:</div>
                <ul className="space-y-2">
                  {selectedService.details.map((detail, idx) => (
                    <li key={idx} className="text-xs text-white/80 flex items-start gap-2.5">
                      <CheckCircle2 size={12} className="text-neon-green shrink-0 mt-0.5" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <button
              onClick={runSimulation}
              disabled={isRunning}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-neon-green/15 text-neon-green border border-neon-green/40 hover:bg-neon-green/25 hover:border-neon-green rounded text-xs font-bold uppercase tracking-widest transition-all duration-300 disabled:opacity-40 disabled:pointer-events-none"
            >
              {isRunning ? (
                <>
                  <RefreshCw size={12} className="animate-spin" />
                  <span>Processando Auditoria...</span>
                </>
              ) : (
                <>
                  <Play size={12} />
                  <span>Simular Ferramenta</span>
                </>
              )}
            </button>
          </div>
        </ScrollReveal>

        {/* Right Column: Cyber Terminal Console Simulation */}
        <ScrollReveal variant="fade-up" delay={200}>
          <div className="bg-black/80 border border-terminal-border rounded-lg flex flex-col h-full min-h-[350px] relative overflow-hidden scanlines">
            
            {/* Terminal Window Header */}
            <div className="bg-[#161b22] border-b border-terminal-border px-4 py-2.5 flex items-center justify-between shrink-0 select-none">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                <span className="font-mono text-[10px] text-terminal-muted ml-2">
                  orbe@vde-safety-terminal:~
                </span>
              </div>
              <div className="text-[9px] text-neon-green/60 animate-pulse-neon">
                SECURE CONSOLE
              </div>
            </div>

            {/* Terminal Screen Body */}
            <div className="flex-1 p-5 font-mono text-[11px] md:text-xs overflow-y-auto space-y-1.5 leading-relaxed">
              <div className="text-terminal-muted flex items-center gap-2">
                <span className="text-neon-cyan">$</span>
                <span>{selectedService.command}</span>
              </div>

              {consoleOutput.length === 0 && !isRunning && (
                <div className="text-white/30 italic pt-4 text-center select-none">
                  Aguardando inicialização da simulação... Click em "Simular Ferramenta".
                </div>
              )}

              {consoleOutput.map((line, idx) => {
                if (!line) return null;
                return (
                  <div 
                    key={idx}
                    className={`
                      ${line.type === 'error' ? 'text-red-400 font-bold' : ''}
                      ${line.type === 'warning' ? 'text-neon-purple font-semibold' : ''}
                      ${line.type === 'success' ? 'text-neon-green' : ''}
                      ${line.type === 'info' ? 'text-neon-cyan' : ''}
                    `}
                  >
                    {line.text}
                  </div>
                );
              })}

              {isRunning && (
                <div className="inline-block w-2 h-3.5 bg-neon-green animate-pulse ml-0.5" />
              )}
            </div>

            {/* Terminal Footer */}
            <div className="bg-[#161b22]/40 border-t border-terminal-border/40 px-4 py-2 flex items-center justify-between shrink-0 font-mono text-[9px] text-terminal-muted">
              <span>STATUS: {isRunning ? 'PROCESSANDO_TELEMETRIA' : 'OPERACIONAL'}</span>
              <span>SHA-256 INTEGRITY CHECK</span>
            </div>
          </div>
        </ScrollReveal>
      </div>

      {/* Premium Tool Callout */}
      <ScrollReveal variant="fade-up" delay={250}>
        <div className="border border-neon-cyan/30 bg-neon-cyan/5 rounded-lg p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-[0_0_20px_rgba(0,255,245,0.05)] mt-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-neon-cyan text-xs font-bold uppercase tracking-widest">
              <Terminal size={14} />
              <span>Utilitário Premium Ativo</span>
            </div>
            <h3 className="text-sm font-bold text-white uppercase font-mono">OrbePSShield — PowerShell Shield Bot</h3>
            <p className="text-[11px] text-terminal-muted max-w-2xl leading-relaxed">
              Audite scripts PowerShell contra vulnerabilidades, analise riscos de execução operacional e gere arquivos estruturados de produção em múltiplos formatos (.ps1, .bat, .sh, .json, .yml, .md) usando Inteligência Artificial.
            </p>
          </div>
          <Link
            href="/ferramentas-premium/powershell-bot"
            className="flex items-center gap-2 px-5 py-2.5 bg-neon-cyan/15 text-neon-cyan hover:bg-neon-cyan/25 border border-neon-cyan/40 hover:border-neon-cyan rounded text-xs font-bold uppercase tracking-widest transition-all duration-300 font-mono self-stretch md:self-auto text-center justify-center shrink-0"
          >
            <span>Executar Shield Bot</span>
            <ArrowRight size={12} />
          </Link>
        </div>
      </ScrollReveal>

      {/* Back button */}
      <ScrollReveal variant="fade-in" delay={150}>
        <div className="pt-6 flex items-center justify-between">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-xs text-terminal-muted hover:text-neon-green transition-colors group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            <span>cd ..</span>
          </Link>
          <div className="flex items-center gap-2 opacity-30 text-xs text-terminal-muted">
            <Lock size={12} className="text-neon-green" />
            <span>VDE Shield Protocol Active</span>
          </div>
        </div>
      </ScrollReveal>
    </div>
  );
}
