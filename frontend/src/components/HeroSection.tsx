'use client';

import Link from 'next/link';
import { Code2, Database, Shield, Zap } from 'lucide-react';
import { colorMap } from '@/lib/utils';
import { MagicCard } from '@/components/ui/magic-card';
import { AuroraText } from '@/components/ui/aurora-text';

const skills = [
  { icon: Code2, label: 'Software Engineering', color: 'cyan', href: '/software-engineering' },
  { icon: Database, label: 'Database Architecture', color: 'green', href: '/database-architecture' },
  { icon: Zap, label: 'Automation', color: 'cyan', href: '/automation' },
];

export default function HeroSection() {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-28 pb-16 overflow-hidden"
    >
      <div className="relative z-10 text-center w-full max-w-5xl mx-auto">
        <MagicCard className="w-full mx-auto flex flex-col items-center justify-center -mt-8 mb-10 py-16 px-6 bg-black/40 backdrop-blur-3xl border-neon-blue/40 shadow-[0_0_50px_rgba(0,0,0,0.9)]">
          <div className="relative z-10 text-center">
            <div className="inline-flex items-center gap-3 border border-neon-cyan/60 rounded-full px-5 py-2 mb-10 bg-navy-deep/80 backdrop-blur-md shadow-[0_0_20px_rgba(126,184,224,0.6)] hover:shadow-[0_0_35px_rgba(126,184,224,0.9)] hover:scale-105 transition-all duration-300">
              <span className="w-2.5 h-2.5 rounded-full bg-neon-cyan animate-pulse-neon shadow-[0_0_10px_rgba(126,184,224,1)]" />
              <span className="font-mono text-xs md:text-sm text-neon-cyan tracking-widest uppercase font-black drop-shadow-[0_0_10px_rgba(126,184,224,0.8)]">
                Orbe Systems · Orbe Hub v2.0
              </span>
            </div>

            <h1 className="font-sans text-5xl md:text-7xl font-black mb-8 leading-tight tracking-tight text-white/95 mix-blend-screen drop-shadow-[0_0_25px_rgba(255,255,255,0.6)]">
              O terminal é a sua ferramenta.<br />
              <span className="block mt-4">A tecnologia é o <AuroraText text="Seu Poder." className="mt-2" /></span>
            </h1>

            <div className="font-sans text-base md:text-xl text-navy-mist/90 max-w-2xl mx-auto mb-10 leading-relaxed font-light space-y-6">
              <p className="italic border-l-4 border-neon-cyan pl-6 text-white text-lg drop-shadow-[0_0_15px_rgba(255,255,255,0.7)] text-left font-bold">
                "Um sonho que se sonha sozinho é só um sonho, mas um sonho que se sonha junto se torna realidade."
              </p>
              <p className="text-left font-medium text-lg">
                Nós somos a <strong className="text-neon-cyan text-2xl drop-shadow-[0_0_15px_rgba(126,184,224,0.8)]">ORBE SYSTEMS</strong>.
              </p>
              <p className="text-sm md:text-lg opacity-90 text-left font-normal leading-loose">
                Não desenvolvemos software em salas escuras. Construímos <strong>Arquiteturas Vivas</strong>.
                O seu projeto estratégico encontra aqui uma base imaculada de engenharia e Cyber Segurança.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-4 mb-4">
              {skills.map(({ icon: Icon, label, href }) => (
                <Link
                  key={label}
                  href={href}
                  className="group flex items-center gap-3 border border-neon-blue/40 rounded-xl px-5 py-3 transition-all duration-300 bg-navy-void/80 hover:border-neon-cyan/80 hover:bg-neon-blue/30 backdrop-blur-md shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:shadow-[0_0_30px_rgba(126,184,224,0.6)] hover:-translate-y-1"
                >
                  <Icon size={18} className="text-neon-blue group-hover:text-neon-cyan drop-shadow-[0_0_10px_rgba(126,184,224,0.8)] transition-colors" />
                  <span className="font-mono text-sm tracking-wider uppercase text-navy-mist/90 group-hover:text-white font-bold transition-colors">{label}</span>
                </Link>
              ))}
            </div>
          </div>
        </MagicCard>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
          <Link
            href="/workspace"
            className="inline-flex items-center gap-2 font-mono text-sm uppercase tracking-wider border border-navy-glow text-white px-8 py-4 rounded-xl hover:bg-navy-mid/60 hover:border-navy-glow hover:shadow-[0_0_30px_rgba(126,184,224,0.5)] transition-all duration-500 bg-navy-deep/60 backdrop-blur-lg hover:-translate-y-1"
          >
            <span className="w-2 h-2 rounded-full bg-navy-glow animate-pulse" />
            Abrir Workspace
          </Link>
          <Link
            href="/ferramentas-premium/databroker-optout"
            className="inline-flex items-center gap-2 font-mono text-sm uppercase tracking-wider border border-[#00f2fe] text-[#00f2fe] drop-shadow-[0_0_10px_rgba(0,242,254,0.4)] px-8 py-4 rounded-xl hover:bg-[#00f2fe]/20 hover:border-[#00f2fe] hover:shadow-[0_0_40px_rgba(0,242,254,0.6)] hover:text-white transition-all duration-500 bg-navy-deep/60 backdrop-blur-lg hover:-translate-y-1"
          >
            <Zap size={16} className="text-[#00f2fe]" />
            Ghost Engine
          </Link>
          <Link
            href="/ferramentas-premium/powershell-bot"
            className="inline-flex items-center gap-2 font-mono text-sm uppercase tracking-wider border border-navy-metallic/50 text-navy-mist px-8 py-4 rounded-xl hover:border-navy-glow hover:shadow-[0_0_20px_rgba(126,184,224,0.3)] transition-all duration-500 bg-navy-void/40 backdrop-blur-sm hover:-translate-y-1"
          >
            <Shield size={16} className="text-navy-shine" />
            Auditoria SAST
          </Link>
        </div>
      </div>

      <div className="w-full flex flex-col items-center gap-2 opacity-50 mt-16 md:mt-24">
        <span className="font-mono text-[10px] tracking-widest text-neon-cyan uppercase animate-pulse">scroll</span>
        <div className="w-px h-12 bg-gradient-to-b from-neon-cyan to-transparent animate-pulse-neon" />
      </div>
    </section>
  );
}
