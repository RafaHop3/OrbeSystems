'use client';

import Link from 'next/link';
import { Code2, Database, Shield, Zap } from 'lucide-react';
import { colorMap } from '@/lib/utils';

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
      <div className="relative z-10 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 border border-navy-metallic/30 rounded-full px-4 py-1.5 mb-8 bg-navy-deep/40 backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-navy-glow animate-pulse-neon" />
          <span className="font-mono text-[10px] text-navy-glow/90 tracking-widest uppercase">
            Orbe Systems · v1.2
          </span>
        </div>

        <h1 className="font-sans text-4xl md:text-6xl font-light mb-6 leading-tight tracking-tight text-white/95">
          O terminal é a sua{' '}
          <span className="font-medium text-navy-glow">ferramenta.</span>
          <span className="block text-white/50 text-xl md:text-2xl mt-4 font-light">
            A tecnologia é o seu poder.
          </span>
        </h1>

        <div className="font-sans text-base md:text-lg text-navy-mist/75 max-w-3xl mx-auto mb-8 leading-relaxed font-light space-y-4">
          <p className="italic border-l border-navy-glow/50 pl-4 text-white/90">
            "Um sonho que se sonha sozinho é só um sonho, mas um sonho que se sonha junto se torna realidade."
          </p>
          <p>
            Nós somos a <strong className="text-navy-glow font-normal">Orbe Systems</strong>.
          </p>
          <p className="text-sm md:text-base opacity-80">
            Muitos enxergam a tecnologia apenas como linhas de código solitárias e frias. Nós a enxergamos como o grande elo que conecta mentes visionárias. A Orbe não existe para construir sistemas de forma isolada em salas escuras; nós existimos para construir o amanhã, <strong>juntos</strong>.
          </p>
          <p className="text-sm md:text-base opacity-80 pb-4">
            Onde a imaginação encontra a criptografia de ponta. Formamos uma aliança indestrutível entre humanos apaixonados por evolução e arquiteturas digitais imaculadas. O seu projeto é o sonho; a nossa tecnologia é a armadura que garante que esse sonho se torne a mais pura realidade.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {skills.map(({ icon: Icon, label, href }) => (
            <Link
              key={label}
              href={href}
              className="group flex items-center gap-2 border border-navy-metallic/25 rounded-lg px-4 py-2 transition-all duration-300 bg-navy-deep/30 hover:border-navy-glow/40 hover:bg-navy-mid/40 backdrop-blur-sm"
            >
              <Icon size={13} className="text-navy-shine/70 group-hover:text-navy-glow transition-colors" />
              <span className="font-mono text-[10px] tracking-wider uppercase text-navy-mist/80">{label}</span>
            </Link>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
          <Link
            href="/workspace"
            className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider border border-navy-glow/40 text-white px-7 py-3 rounded-lg hover:bg-navy-mid/50 hover:border-navy-glow/60 hover:shadow-navy-glow transition-all duration-300 bg-navy-deep/40 backdrop-blur-sm"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-navy-glow animate-pulse" />
            Abrir Workspace
          </Link>
          <Link
            href="/ferramentas-premium/powershell-bot"
            className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider border border-navy-metallic/30 text-navy-mist px-7 py-3 rounded-lg hover:border-navy-shine/50 transition-all duration-300"
          >
            <Shield size={13} className="text-navy-shine" />
            Auditoria SAST
          </Link>
        </div>
      </div>

      <div className="w-full flex flex-col items-center gap-2 opacity-40 mt-16 md:mt-24">
        <span className="font-mono text-[9px] tracking-widest text-navy-shine uppercase">scroll</span>
        <div className="w-px h-8 bg-gradient-to-b from-navy-glow/60 to-transparent" />
      </div>
    </section>
  );
}
