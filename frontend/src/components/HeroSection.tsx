'use client';

import Link from 'next/link';
import { Code2, Database, Shield, Zap } from 'lucide-react';
import SupernovaAnimation from './SupernovaAnimation';
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
      className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-28 pb-16 overflow-hidden bg-black"
    >
      {/* Supernova Animation Background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] opacity-30 pointer-events-none">
        <SupernovaAnimation className="w-full h-full" />
      </div>

      <div className="relative z-10 text-center max-w-4xl mx-auto">
        {/* System label */}
        <div className="inline-flex items-center gap-2 border border-blue-400/30 rounded px-4 py-1.5 mb-8 bg-blue-500/5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          <span className="font-cinzel text-[10px] text-blue-300 tracking-widest uppercase">
            STANZA I · INGRESSO COGNITIVO · v1.1.0
          </span>
        </div>

        {/* Main heading */}
        <h1 className="font-cinzel text-5xl md:text-7xl font-semibold mb-6 leading-none tracking-wide text-white/90">
          <span className="block text-blue-400 text-lg md:text-xl tracking-widest mb-3 uppercase">ORBE SYSTEMS</span>
          O terminal é a sua <span className="text-blue-400 drop-shadow-[0_0_20px_rgba(96,165,250,0.35)] italic">tela.</span>
          <span className="block text-white/60 text-xl md:text-2xl mt-4 font-serif italic font-normal normal-case">
            La mente è l'intelligenza, il codice è l'arte.
          </span>
        </h1>

        <p className="font-serif text-base md:text-lg text-white/70 max-w-2xl mx-auto mb-4 leading-relaxed">
          Consultoria, modelagem e auditoria de infraestrutura — a harmonia das proporções digitais e
          a segurança impecável moldadas diretamente no ambiente de trabalho do seu time.
        </p>
        <p className="font-cinzel text-[10px] text-blue-400/60 mb-12 tracking-widest uppercase">
          Bottega d'Orbe · L'Architettura dell'Informazione
        </p>

        {/* Skill badges */}
        <div className="flex flex-wrap justify-center gap-4 mb-10">
          {skills.map(({ icon: Icon, label, color, href }) => (
            <Link
              key={label}
              href={href}
              className={`group flex items-center gap-2 border rounded px-4 py-2 transition-all duration-300 bg-white/5 border-white/10 hover:border-blue-400/50 hover:bg-blue-500/10`}
            >
              <Icon size={13} className="transition-all duration-300 text-blue-400/70 group-hover:text-blue-400" />
              <span className="font-cinzel text-[10px] tracking-widest uppercase text-white/80">{label}</span>
            </Link>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
          <Link
            href="/workspace"
            className="inline-flex items-center gap-2.5 font-cinzel text-xs uppercase tracking-widest border-2 border-blue-400/60 text-white px-8 py-3.5 rounded hover:bg-blue-500/15 hover:border-blue-400 hover:shadow-[0_0_30px_rgba(96,165,250,0.3)] transition-all duration-300 bg-white/5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Entrar na Officina (VDE)
          </Link>
          <Link
            href="/ferramentas-premium/powershell-bot"
            className="inline-flex items-center gap-2.5 font-cinzel text-xs uppercase tracking-widest border border-blue-400/40 text-blue-300 px-8 py-3.5 rounded hover:bg-blue-500/10 hover:border-blue-400 hover:shadow-[0_0_30px_rgba(96,165,250,0.2)] transition-all duration-300 bg-black/40"
          >
            <Shield size={13} className="text-blue-400" />
            Auditoria SAST (OrbePSShield)
          </Link>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-50">
        <span className="font-cinzel text-[9px] tracking-widest text-blue-400 uppercase">Scendere</span>
        <div className="w-px h-10 bg-gradient-to-b from-blue-400 to-transparent" />
      </div>
    </section>
  );
}
