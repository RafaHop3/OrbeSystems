'use client';

import { Cpu, Shield, Zap, Lock, Code, BarChart2 } from 'lucide-react';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  colorClass: string;
  glowClass: string;
}

function FeatureCard({ icon, title, subtitle, description, colorClass, glowClass }: FeatureCardProps) {
  return (
    <div className={`group relative bg-terminal-surface/70 border border-terminal-border/60 rounded-xl p-6 transition-all duration-300 hover:border-neon-cyan/40 hover:bg-terminal-surface/90 hover:${glowClass}`}>
      {/* Decorative top gradient bar */}
      <div className={`absolute top-0 left-0 right-0 h-[2px] rounded-t-xl bg-gradient-to-r from-transparent via-${colorClass}/40 to-transparent opacity-50 group-hover:opacity-100 transition-opacity`} />
      
      <div className="flex flex-col gap-4">
        {/* Icon wrapper */}
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-black/40 border border-terminal-border/80 text-${colorClass} group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
        
        <div className="space-y-1">
          <span className={`font-mono text-[9px] uppercase tracking-wider text-${colorClass}`}>
            {subtitle}
          </span>
          <h3 className="font-mono text-base font-bold text-white tracking-wide">
            {title}
          </h3>
        </div>

        <p className="font-sans text-xs text-terminal-muted leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}

export default function ImortalFeatures() {
  const features = [
    {
      icon: <Code size={20} />,
      title: 'AI Code Synthesis',
      subtitle: 'Natural Language → C++',
      description: 'Traduz intenções lógicas de alto nível em código C++ otimizado para o microcontrolador ATMega328P de forma autônoma.',
      colorClass: 'neon-cyan',
      glowClass: 'shadow-[0_0_30px_rgba(0,255,245,0.1)]',
    },
    {
      icon: <Shield size={20} />,
      title: 'Z3 Formal Proofs',
      subtitle: 'Provas Matemáticas',
      description: 'Utiliza o Microsoft Z3 Theorem Prover para validar o código sintetizado contra divisões por zero, watchdog lockups e variáveis fora dos limites.',
      colorClass: 'neon-green',
      glowClass: 'shadow-[0_0_30px_rgba(57,255,20,0.1)]',
    },
    {
      icon: <Cpu size={20} />,
      title: 'Sandbox Fuzzing',
      subtitle: 'Simulação Estocástica',
      description: 'Executa 150 ciclos estocásticos de fuzzing dentro de uma sandbox bare-metal virtualizada para stressar a integridade lógica sob entradas imprevisíveis.',
      colorClass: 'neon-purple',
      glowClass: 'shadow-[0_0_30px_rgba(189,0,255,0.1)]',
    },
    {
      icon: <Lock size={20} />,
      title: 'Secure Artifact Storage',
      subtitle: 'Distribuição Blindada',
      description: 'Codifica e armazena os códigos-fonte e firmware gerados de forma distribuída em um CDN corporativo criptografado e de baixa latência.',
      colorClass: 'neon-pink',
      glowClass: 'shadow-[0_0_30px_rgba(255,0,144,0.1)]',
    },
    {
      icon: <Zap size={20} />,
      title: 'AVR Bare-Metal Compiler',
      subtitle: 'Geração de Intel HEX',
      description: 'Fornece um pipeline automatizado que gera o arquivo Intel HEX para gravação direta no silício sem ferramentas adicionais.',
      colorClass: 'yellow-500',
      glowClass: 'shadow-[0_0_30px_rgba(234,179,8,0.1)]',
    },
    {
      icon: <BarChart2 size={20} />,
      title: 'SaaS Business Intelligence',
      subtitle: 'Auditoria & Analytics',
      description: 'Integra auditoria cibernética OWASP Top 10, simulações avançadas de marketing/ROI e projeções demográficas automatizadas com IA.',
      colorClass: 'neon-blue',
      glowClass: 'shadow-[0_0_30px_rgba(0,102,255,0.1)]',
    },
  ];

  return (
    <section id="imortal-features" className="relative py-20 px-6 border-t border-terminal-border/20 bg-black/20">
      {/* Background decoration */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-neon-cyan/5 rounded-full filter blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-neon-purple/5 rounded-full filter blur-[100px] pointer-events-none" />

      <div className="max-w-6xl w-full mx-auto space-y-12 relative z-10">
        {/* Section Title */}
        <div className="text-center space-y-3">
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-neon-cyan bg-neon-cyan/5 border border-neon-cyan/20 px-3 py-1 rounded-full">
            Capacidades do Módulo Premium
          </span>
          <h2 className="font-mono text-2xl md:text-4xl font-bold text-white tracking-tight">
            Arquitetura de Tripla Proteção
          </h2>
          <p className="font-mono text-xs text-terminal-muted max-w-xl mx-auto leading-relaxed">
            Unindo a flexibilidade da IA Generativa com o rigor da matemática formal e simulação estocástica de hardware.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <FeatureCard key={idx} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}
