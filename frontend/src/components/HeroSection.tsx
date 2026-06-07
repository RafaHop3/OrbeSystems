'use client';

import Link from 'next/link';
import { Code2, Database, Shield, Zap } from 'lucide-react';
import OrbeLogo from './OrbeLogo';
import { colorMap } from '@/lib/utils';

const skills = [
  { icon: Code2, label: 'Software Engineering', color: 'cyan', href: '/software-engineering' },
  { icon: Database, label: 'Database Architecture', color: 'green', href: '/database-architecture' },
  { icon: Shield, label: 'Cyber Safety', color: 'purple', href: '/cyber-security' },
  { icon: Zap, label: 'Automation', color: 'cyan', href: '/automation' },
];


export default function HeroSection() {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-28 pb-16 overflow-hidden bg-renaissance-bg sketch-grid"
    >
      {/* Warm Golden Spotlight Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-renaissance-gold/10 rounded-full blur-[120px] pointer-events-none animate-pulse-neon" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-renaissance-gold/5 rounded-full blur-[120px] pointer-events-none animate-pulse-neon" style={{ animationDelay: '1.2s' }} />

      {/* Giant Animated Background Logo - Golden tint */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] md:w-[900px] aspect-square pointer-events-none opacity-[0.04] mix-blend-screen">
        <OrbeLogo className="w-full h-full text-renaissance-gold animate-float" variant="giant" />
      </div>

      {/* Gilded corners */}
      <div className="absolute top-32 left-8 w-24 h-24 border-l border-t border-renaissance-gold/25 rounded-tl" />
      <div className="absolute top-32 right-8 w-24 h-24 border-r border-t border-renaissance-gold/25 rounded-tr" />
      <div className="absolute bottom-8 left-8 w-24 h-24 border-l border-b border-renaissance-gold/20 rounded-bl" />
      <div className="absolute bottom-8 right-8 w-24 h-24 border-r border-b border-renaissance-gold/20 rounded-br" />

      <div className="relative z-10 text-center max-w-4xl mx-auto">
        {/* System label */}
        <div className="inline-flex items-center gap-2 border border-renaissance-gold/30 rounded px-4 py-1.5 mb-8 bg-renaissance-gold/5">
          <span className="w-1.5 h-1.5 rounded-full bg-renaissance-gold animate-pulse" />
          <span className="font-cinzel text-[10px] text-renaissance-gold tracking-widest uppercase">
            STANZA I · INGRESSO COGNITIVO · v1.1.0
          </span>
        </div>

        {/* Main heading */}
        <h1 className="font-cinzel text-5xl md:text-7xl font-semibold mb-6 leading-none tracking-wide text-white/90">
          <span className="block text-renaissance-gold text-lg md:text-xl tracking-widest mb-3 uppercase">ORBE SYSTEMS</span>
          O terminal é a sua <span className="text-renaissance-gold drop-shadow-[0_0_20px_rgba(212,175,55,0.35)] italic">tela.</span>
          <span className="block text-renaissance-muted text-xl md:text-2xl mt-4 font-serif italic font-normal normal-case">
            La mente è l’intelligenza, il codice è l’arte.
          </span>
        </h1>

        <p className="font-serif text-base md:text-lg text-[#dfd2b8]/85 max-w-2xl mx-auto mb-4 leading-relaxed">
          Consultoria, modelagem e auditoria de infraestrutura — a harmonia das proporções digitais e
          a segurança impecável moldadas diretamente no ambiente de trabalho do seu time.
        </p>
        <p className="font-cinzel text-[10px] text-renaissance-gold/60 mb-12 tracking-widest uppercase">
          Bottega d’Orbe · L’Architettura dell’Informazione
        </p>

        {/* Skill badges */}
        <div className="flex flex-wrap justify-center gap-4 mb-10">
          {skills.map(({ icon: Icon, label, color, href }) => (
            <Link
              key={label}
              href={href}
              className={`group flex items-center gap-2 border rounded px-4 py-2 transition-all duration-300 bg-renaissance-surface/80 ${colorMap[color]}`}
            >
              <Icon size={13} className="transition-all duration-300 text-renaissance-gold/70 group-hover:text-renaissance-gold" />
              <span className="font-cinzel text-[10px] tracking-widest uppercase">{label}</span>
            </Link>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
          <Link
            href="/workspace"
            className="inline-flex items-center gap-2.5 font-cinzel text-xs uppercase tracking-widest border-2 border-renaissance-gold/60 text-[#dfd2b8] px-8 py-3.5 rounded hover:bg-renaissance-gold/15 hover:border-renaissance-gold hover:shadow-gilt transition-all duration-300 bg-renaissance-surface/90"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-renaissance-gold animate-pulse" />
            Entrar na Officina (VDE)
          </Link>
          <Link
            href="/ferramentas-premium/powershell-bot"
            className="inline-flex items-center gap-2.5 font-cinzel text-xs uppercase tracking-widest border border-neon-cyan/40 text-neon-cyan px-8 py-3.5 rounded hover:bg-neon-cyan/10 hover:border-neon-cyan hover:shadow-neon-cyan transition-all duration-300 bg-black/40"
          >
            <Shield size={13} className="text-neon-cyan" />
            Auditoria SAST (OrbePSShield)
          </Link>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-50">
        <span className="font-cinzel text-[9px] tracking-widest text-renaissance-gold uppercase">Scendere</span>
        <div className="w-px h-10 bg-gradient-to-b from-renaissance-gold to-transparent" />
      </div>
    </section>
  );
}
