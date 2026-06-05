'use client';

import Link from 'next/link';
import { Monitor, Terminal, Code2, ArrowRight } from 'lucide-react';
import OrbeLogo from '../OrbeLogo';

/** Miniatura estática na home — link para o VDE completo */
export default function VdePreview() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-16">
      <div className="text-center mb-8">
        <p className="font-mono text-xs text-neon-cyan tracking-widest uppercase mb-2">
          Virtual Desktop Environment
        </p>
        <h2 className="font-mono text-2xl md:text-3xl font-bold text-white">
          Desktop no navegador,{' '}
          <span className="text-neon-cyan">estilo LabEx</span>
        </h2>
        <p className="font-mono text-sm text-terminal-muted mt-3 max-w-xl mx-auto">
          Terminal, WebIDE e assistente Orbe — sem VM pesada na sua máquina.
        </p>
      </div>

      <Link
        href="/workspace"
        className="block group rounded-xl border border-neon-cyan/25 overflow-hidden shadow-2xl hover:border-neon-cyan/50 transition-all duration-300"
      >
        <div className="flex items-center gap-1 px-3 py-2 bg-[#161b22] border-b border-terminal-border">
          <Monitor size={12} className="text-neon-cyan" />
          <span className="font-mono text-[10px] text-neon-cyan">Desktop</span>
          <Terminal size={12} className="text-terminal-muted ml-2" />
          <span className="font-mono text-[10px] text-terminal-muted">Terminal</span>
          <Code2 size={12} className="text-terminal-muted ml-2" />
          <span className="font-mono text-[10px] text-terminal-muted">WebIDE</span>
          <span className="ml-auto font-mono text-[10px] text-red-400">58:40</span>
        </div>

        <div
          className="relative aspect-video flex items-center justify-center"
          style={{ background: 'linear-gradient(160deg, #0c1929, #060a12)' }}
        >
          <div className="absolute left-6 top-6 flex flex-col gap-4 opacity-80">
            {[Terminal, Code2, Monitor].map((Icon, i) => (
              <div key={i} className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                <Icon size={18} className="text-neon-cyan/80" />
              </div>
            ))}
          </div>
          <div className="w-20 h-20 text-neon-cyan/70">
            <OrbeLogo className="w-full h-full" />
          </div>
          <p className="absolute bottom-6 font-mono text-lg font-bold text-white">
            ORBE<span className="text-neon-cyan">SYSTEMS</span>
          </p>
          <div
            className="absolute right-4 top-4 w-48 rounded-lg border border-neon-cyan/20 p-3 hidden sm:block"
            style={{ background: 'rgba(13,17,23,0.85)', backdropFilter: 'blur(8px)' }}
          >
            <p className="font-mono text-[10px] text-neon-cyan mb-1">Orbe Assistant</p>
            <p className="text-xs text-white/80 leading-snug">Ambiente virtual cyber-safety...</p>
          </div>
          <div className="absolute inset-0 bg-neon-cyan/0 group-hover:bg-neon-cyan/5 transition-colors flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 flex items-center gap-2 font-mono text-sm text-neon-cyan bg-black/50 px-4 py-2 rounded-full transition-opacity">
              Abrir Workspace <ArrowRight size={16} />
            </span>
          </div>
        </div>

        <div className="flex justify-between px-3 py-1.5 bg-[#e8eaed] text-[#5f6368]">
          <span className="text-xs">Aplicações</span>
          <span className="text-xs font-mono">Orbe VDE</span>
        </div>
      </Link>
    </section>
  );
}
