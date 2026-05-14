'use client';

import { useState } from 'react';
import { Terminal, Brain, Cpu, Database, GitBranch, ChevronRight, Info } from 'lucide-react';
import Link from 'next/link';

const skillGroups = [
  {
    category: 'Development / Core',
    icon: Cpu,
    skills: [
      { name: 'Python (FastAPI, Django)', level: 95 },
      { name: 'TypeScript / Next.js 14', level: 90 },
      { name: 'Node.js & Go', level: 80 },
      { name: 'Architecture (Clean/Solid)', level: 85 },
    ],
  },
  {
    category: 'Database Architecture',
    icon: Database,
    skills: [
      { name: 'Modelagem Relacional (PostgreSQL)', level: 93 },
      { name: 'Query Tuning & Indexing', level: 90 },
      { name: 'Replication & High Availability', level: 82 },
      { name: 'NoSQL (MongoDB, Redis)', level: 78 },
    ],
  },
  {
    category: 'Infrastructure / Cloud',
    icon: GitBranch,
    skills: [
      { name: 'Docker & Kubernetes', level: 85 },
      { name: 'AWS / GCP / Azure', level: 80 },
      { name: 'CI/CD Pipelines (GitHub Actions)', level: 90 },
      { name: 'Linux & System Design', level: 94 },
    ],
  },
];

const meanings = [
  {
    title: 'Development / Core',
    items: [
      { name: 'Python (95%)', desc: 'Nossa linguagem principal. Usada em APIs (FastAPI), automação, ETL e pipelines de dados em produção.' },
      { name: 'TypeScript / Next.js (90%)', desc: 'Domínio completo do ecossistema React. Interfaces rápidas, tipadas e seguras por padrão.' },
      { name: 'Architecture (85%)', desc: 'Implementamos SOLID e Clean Architecture. O foco é criar código que sobreviva ao crescimento e ao time.' }
    ]
  },
  {
    title: 'Database Architecture',
    items: [
      { name: 'Modelagem Relacional (93%)', desc: 'Design de esquemas normalizados com foco em integridade referencial, performance de leitura e escalabilidade.' },
      { name: 'Query Tuning (90%)', desc: 'Análise de planos de execução, criação de índices compostos e otimização de queries críticas em produção.' },
      { name: 'Replication (82%)', desc: 'Configuração de clusters primário/réplica, failover automático e estratégias de backup contínuo.' }
    ]
  },
  {
    title: 'Infrastructure',
    items: [
      { name: 'Linux & System Design (94%)', desc: 'Configuração de servidores de produção, otimização de kernel e design de sistemas distribuídos.' },
      { name: 'CI/CD (90%)', desc: 'Automação total. Se o código não passar nos testes automatizados e nas migrações de banco, ele não vai a produção.' }
    ]
  }
];

export default function SkillsPage() {
  const [showMeaning, setShowMeaning] = useState(false);

  return (
    <div className="space-y-10 font-mono">
      {/* Header section with command */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3 text-neon-cyan mb-2">
          <div className="flex items-center gap-3">
            <Brain size={20} />
            <h1 className="text-2xl font-bold tracking-tight uppercase">Tech Stack & Skills</h1>
          </div>
          <button 
            onClick={() => setShowMeaning(!showMeaning)}
            className={`text-[10px] px-3 py-1 border transition-all duration-300 flex items-center gap-2 ${
              showMeaning 
                ? 'bg-neon-cyan text-terminal-bg border-neon-cyan shadow-neon-cyan' 
                : 'bg-transparent text-terminal-muted border-terminal-border hover:border-neon-cyan/50 hover:text-neon-cyan'
            }`}
          >
            <Info size={12} />
            {showMeaning ? '[ OCULTAR SIGNIFICADO ]' : '[ VER SIGNIFICADO ]'}
          </button>
        </div>
        
        <div className="space-y-2 opacity-80">
          <p className="flex items-center gap-2">
            <span className="text-neon-cyan">$</span> 
            <span>orbe-systems --analyze-competencies {showMeaning && '--detailed'}</span>
          </p>
          <p className="text-terminal-muted text-sm leading-relaxed max-w-2xl border-l-2 border-neon-cyan/20 pl-4">
            Mapeamento de expertise técnica em engenharia de software, arquitetura de dados e
            design de sistemas distribuídos de alta disponibilidade.
          </p>
        </div>
      </section>

      {/* Conditionally reveal meaning section */}
      {showMeaning && (
        <section className="animate-fade-in-up bg-neon-cyan/5 border border-neon-cyan/20 rounded p-6 space-y-6">
          <div className="flex items-center gap-2 text-neon-cyan mb-4">
            <Terminal size={16} />
            <span className="text-xs font-bold uppercase tracking-[0.2em]">Documentation: Technical Rationale</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {meanings.map((group) => (
              <div key={group.title} className="space-y-4">
                <h3 className="text-[10px] text-white/40 uppercase tracking-widest border-b border-white/5 pb-1">
                  {group.title}
                </h3>
                {group.items.map((item) => (
                  <div key={item.name} className="space-y-1">
                    <p className="text-[11px] text-neon-cyan">{item.name}</p>
                    <p className="text-[10px] text-terminal-muted leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Skills Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {skillGroups.map((group) => (
          <div key={group.category} className="space-y-4 bg-white/5 p-6 rounded border border-terminal-border/40 hover:border-neon-cyan/30 transition-all duration-300">
            <div className="flex items-center gap-2 text-white/90 mb-4 pb-2 border-b border-terminal-border/20">
              <group.icon size={16} className="text-neon-cyan" />
              <h2 className="text-sm font-bold uppercase tracking-widest">{group.category}</h2>
            </div>
            
            <div className="space-y-5">
              {group.skills.map((skill) => (
                <div key={skill.name} className="space-y-2">
                  <div className="flex justify-between items-center text-[11px] uppercase tracking-tighter">
                    <span className="text-white/70 flex items-center gap-1">
                      <ChevronRight size={10} className="text-neon-cyan" />
                      {skill.name}
                    </span>
                    <span className="text-neon-cyan/60">{skill.level}%</span>
                  </div>
                  {/* Progress bar container */}
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-neon-cyan/50 shadow-[0_0_10px_rgba(34,211,238,0.5)] transition-all duration-1000"
                      style={{ width: `${skill.level}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Tools Section (Simplified list) */}
        <div className="space-y-4 bg-white/5 p-6 rounded border border-terminal-border/40">
           <div className="flex items-center gap-2 text-white/90 mb-4 pb-2 border-b border-terminal-border/20">
              <Terminal size={16} className="text-neon-green" />
              <h2 className="text-sm font-bold uppercase tracking-widest">Toolkit / Stack</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {['Prisma', 'SQLAlchemy', 'pgAdmin', 'PostgreSQL', 'Redis', 'MongoDB', 'Grafana', 'Docker', 'React', 'TailwindCSS', 'Nginx', 'GitHub'].map(tool => (
                <span key={tool} className="text-[10px] px-2 py-1 bg-terminal-surface border border-white/10 rounded text-terminal-muted hover:border-neon-green hover:text-neon-green transition-colors cursor-default">
                  {tool}
                </span>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t border-white/5">
              <p className="text-[10px] text-terminal-muted italic animate-pulse">
                &gt; Continuously learning and evolving...
              </p>
            </div>
        </div>
      </div>

      <div className="pt-6">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-xs text-terminal-muted hover:text-neon-cyan transition-colors group"
        >
          <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform rotate-180" />
          <span>voltar para a raiz</span>
        </Link>
      </div>
    </div>
  );
}
