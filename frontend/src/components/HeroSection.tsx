'use client';

import Link from 'next/link';
import { Code2, Database, GitBranch, Zap } from 'lucide-react';
import OrbeLogo from './OrbeLogo';
import { colorMap } from '@/lib/utils';

const skills = [
  { icon: Code2, label: 'Software Engineering', color: 'cyan', href: '/software-engineering' },
  { icon: Database, label: 'Database Architecture', color: 'green', href: '/database-architecture' },
  { icon: GitBranch, label: 'System Design', color: 'purple', href: '/system-design' },
  { icon: Zap, label: 'Automation', color: 'cyan', href: '/automation' },
];


export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-16 overflow-hidden">
      {/* Deep Blue Neon Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-blue/15 rounded-full blur-[120px] pointer-events-none animate-pulse-neon" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-cyan/10 rounded-full blur-[120px] pointer-events-none animate-pulse-neon" style={{ animationDelay: '1s' }} />

      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(#0066ff 1px, transparent 1px), linear-gradient(90deg, #0066ff 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 20%, transparent 80%)',
        }}
      />

      {/* Giant Animated Background Logo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] md:w-[900px] aspect-square pointer-events-none opacity-[0.06] mix-blend-screen mix-blend-lighten">
        <OrbeLogo className="w-full h-full text-neon-blue animate-float" variant="giant" />
      </div>

      {/* Corner decorations */}
      <div className="absolute top-32 left-8 w-24 h-24 border-l border-t border-neon-cyan/20 rounded-tl-lg" />
      <div className="absolute top-32 right-8 w-24 h-24 border-r border-t border-neon-cyan/20 rounded-tr-lg" />
      <div className="absolute bottom-8 left-8 w-24 h-24 border-l border-b border-neon-purple/20 rounded-bl-lg" />
      <div className="absolute bottom-8 right-8 w-24 h-24 border-r border-b border-neon-purple/20 rounded-br-lg" />

      <div className="relative z-10 text-center max-w-4xl mx-auto">
        {/* System label */}
        <div className="inline-flex items-center gap-2 border border-neon-cyan/30 rounded-full px-4 py-1.5 mb-8 bg-neon-cyan/5">
          <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-pulse" />
          <span className="font-mono text-xs text-neon-cyan tracking-widest uppercase">
            Arquitetura Inicializada — v1.1.0
          </span>
        </div>

        {/* Main heading */}
        <h1 className="font-mono text-5xl md:text-7xl font-bold mb-6 leading-none tracking-tight">
          <span className="block text-white/90">Engenharia de</span>
          <span className="block text-neon-cyan animate-pulse-neon drop-shadow-[0_0_30px_rgba(0,255,245,0.5)]">
            Software
          </span>
          <span className="block text-white/40 text-3xl md:text-4xl mt-2">
            &amp; Arquitetura de Dados
          </span>
        </h1>

        {/* Sub-description */}
        <p className="font-mono text-sm md:text-base text-terminal-muted max-w-2xl mx-auto mb-3 leading-relaxed">
          <span className="text-neon-green">$</span>{' '}
          Construindo sistemas resilientes com foco em design de arquitetura, otimização de
          bancos de dados relacionais e APIs de alta disponibilidade.
        </p>
        <p className="font-mono text-xs text-terminal-muted/60 mb-12">
          <span className="text-neon-purple">~/</span>projetos_e_arquitetura — repositórios abaixo &darr;
        </p>

        {/* Skill badges */}
        <div className="flex flex-wrap justify-center gap-4">
          {skills.map(({ icon: Icon, label, color, href }) => (
            <Link
              key={label}
              href={href}
              className={`group flex items-center gap-2 border rounded px-4 py-2 transition-all duration-300 bg-terminal-surface/60 ${colorMap[color]}`}
            >
              <Icon size={14} className="transition-all duration-300" />
              <span className="font-mono text-xs tracking-wider">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40">
        <span className="font-mono text-xs text-terminal-muted">scroll</span>
        <div className="w-px h-8 bg-gradient-to-b from-neon-cyan to-transparent" />
      </div>
    </section>
  );
}
