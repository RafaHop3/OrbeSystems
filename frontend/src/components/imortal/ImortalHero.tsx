'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Github, Cpu, Shield, Zap, ArrowRight } from 'lucide-react';

// URL do IMORTAL em produção (Render) — atualizar quando o deploy estiver ativo
const IMORTAL_LIVE_URL = process.env.NEXT_PUBLIC_IMORTAL_URL || 'https://imortal.onrender.com';
const IMORTAL_GITHUB   = 'https://github.com/RafaHop3/IMORTAL';

export default function ImortalHero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied]     = useState(false);
  const [isLive, setIsLive]     = useState<boolean | null>(null);

  // Ping to check if Render is awake
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(`${IMORTAL_LIVE_URL}/api/default`, {
          signal: AbortSignal.timeout(4000),
        });
        setIsLive(res.ok);
      } catch {
        setIsLive(false);
      }
    };
    check();
  }, []);

  // Scanline canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx   = canvas.getContext('2d')!;
    let raf     = 0;
    let scanY   = 0;

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Scan line
      const grad = ctx.createLinearGradient(0, scanY - 40, 0, scanY + 40);
      grad.addColorStop(0,   'rgba(0,255,245,0)');
      grad.addColorStop(0.5, 'rgba(0,255,245,0.06)');
      grad.addColorStop(1,   'rgba(0,255,245,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, scanY - 40, canvas.width, 80);
      scanY = (scanY + 0.8) % canvas.height;
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const handleCopyCmd = () => {
    navigator.clipboard.writeText('git clone https://github.com/RafaHop3/IMORTAL.git');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section
      id="imortal-hero"
      className="relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden pt-24 pb-16 px-6"
    >
      {/* Scanline canvas backdrop */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        aria-hidden="true"
      />

      {/* Background grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,255,245,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,245,1) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
        aria-hidden="true"
      />

      {/* Radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 50% at 50% 40%, rgba(0,255,245,0.06) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-4xl w-full mx-auto text-center space-y-8">

        {/* Status chip */}
        <div className="flex justify-center">
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono transition-all ${
              isLive === true
                ? 'border-neon-green/40 text-neon-green bg-neon-green/5'
                : isLive === false
                ? 'border-yellow-400/40 text-yellow-400 bg-yellow-400/5'
                : 'border-white/10 text-white/30 bg-white/5'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isLive === true
                  ? 'bg-neon-green animate-pulse'
                  : isLive === false
                  ? 'bg-yellow-400'
                  : 'bg-white/20'
              }`}
            />
            {isLive === true
              ? 'SISTEMA ONLINE — RENDER'
              : isLive === false
              ? 'INICIANDO SERVIDOR (30s)...'
              : 'VERIFICANDO STATUS...'}
          </div>
        </div>

        {/* ASCII-style logo */}
        <div className="font-mono text-[10px] sm:text-xs text-neon-cyan/40 leading-tight select-none whitespace-pre">
{`██╗███╗   ███╗ ██████╗ ██████╗ ████████╗ █████╗ ██╗
██║████╗ ████║██╔═══██╗██╔══██╗╚══██╔══╝██╔══██╗██║
██║██╔████╔██║██║   ██║██████╔╝   ██║   ███████║██║
██║██║╚██╔╝██║██║   ██║██╔══██╗   ██║   ██╔══██║██║
██║██║ ╚═╝ ██║╚██████╔╝██║  ██║   ██║   ██║  ██║███████╗
╚═╝╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚══════╝`}
        </div>

        {/* Headline */}
        <div className="space-y-4">
          <h1 className="font-mono text-3xl md:text-5xl font-bold text-white leading-tight">
            Triple Verification{' '}
            <span className="text-neon-cyan">AI</span>{' '}
            Bare-Metal Toolchain
          </h1>
          <p className="font-mono text-sm md:text-base text-white/50 max-w-2xl mx-auto leading-relaxed">
            A IA propõe. A matemática prova. A sandbox estressa. O humano autoriza.
            <br />
            Linguagem natural → IR → Z3 Prover → Fuzzing → Intel HEX para ATMega328P.
          </p>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap justify-center gap-2">
          {['Z3 Theorem Prover', 'Sandbox Fuzzing', 'AVR/Arduino', 'Gemini 2.0 Flash', 'Groq Llama', 'Python', 'Apache 2.0'].map((tag) => (
            <span
              key={tag}
              className="font-mono text-[10px] px-2.5 py-1 rounded border border-neon-cyan/15 text-neon-cyan/60 bg-neon-cyan/5"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href={IMORTAL_LIVE_URL}
            target="_blank"
            rel="noopener noreferrer"
            id="imortal-launch-btn"
            className="group flex items-center gap-3 px-8 py-4 rounded-lg
                       font-mono text-sm font-bold tracking-[0.15em] uppercase
                       bg-neon-cyan/10 border border-neon-cyan/50 text-neon-cyan
                       hover:bg-neon-cyan/20 hover:border-neon-cyan hover:text-white
                       hover:shadow-[0_0_40px_rgba(0,255,245,0.3)]
                       transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <Zap size={16} className="group-hover:scale-110 transition-transform" />
            Acessar Plataforma
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </a>

          <a
            href={IMORTAL_GITHUB}
            target="_blank"
            rel="noopener noreferrer"
            id="imortal-github-btn"
            className="flex items-center gap-2 px-6 py-4 rounded-lg
                       font-mono text-sm font-medium
                       border border-white/10 text-white/60
                       hover:border-white/30 hover:text-white
                       transition-all duration-300"
          >
            <Github size={16} />
            Ver no GitHub
            <ExternalLink size={12} />
          </a>
        </div>

        {/* Clone command */}
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleCopyCmd}
            id="imortal-clone-cmd"
            className="group w-full flex items-center justify-between gap-4
                       bg-[#0d1117] border border-white/8 rounded-lg px-4 py-3
                       hover:border-neon-cyan/30 transition-all duration-300 text-left"
          >
            <span className="font-mono text-xs text-terminal-muted">
              <span className="text-neon-green mr-2">$</span>
              git clone https://github.com/RafaHop3/IMORTAL.git
            </span>
            <span className={`font-mono text-[10px] flex-shrink-0 transition-colors ${copied ? 'text-neon-green' : 'text-white/20 group-hover:text-neon-cyan'}`}>
              {copied ? '✓ copiado' : 'copiar'}
            </span>
          </button>
        </div>

        {/* Nota Free Tier Render */}
        {isLive === false && (
          <p className="font-mono text-[10px] text-yellow-400/50 animate-pulse">
            ⚡ Servidor no plano gratuito do Render — acorda em ~30 segundos ao primeiro acesso
          </p>
        )}
      </div>
    </section>
  );
}
