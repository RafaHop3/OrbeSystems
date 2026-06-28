'use client';

import Link from 'next/link';
import { Monitor, Terminal, Code2, ArrowRight } from 'lucide-react';
import MetallicNavyCanvas from '../MetallicNavyCanvas';

export default function VdePreview() {
  return (
    <section id="vde-preview" data-section="vde" className="max-w-6xl mx-auto px-6 py-16">
      <div className="text-center mb-8">
        <p className="font-mono text-xs text-navy-shine tracking-widest uppercase mb-2">
          Virtual Desktop Environment
        </p>
        <h2 className="font-sans text-2xl md:text-3xl font-light text-white/95">
          Workspace no navegador
        </h2>
        <p className="font-sans text-sm text-navy-mist/70 mt-3 max-w-xl mx-auto font-light">
          Terminal e WebIDE — integrados, leves e seguros.
        </p>
      </div>

      <Link
        href="/workspace"
        className="block group rounded-xl overflow-hidden border border-navy-metallic/25 hover:border-navy-glow/40 transition-all duration-300 hover:shadow-navy-glow"
      >
        <div className="flex items-center gap-2 px-4 py-2.5 bg-navy-deep/80 border-b border-navy-metallic/20">
          <Monitor size={12} className="text-navy-glow" />
          <span className="font-mono text-[9px] uppercase tracking-widest text-navy-glow">Desktop</span>
          <Terminal size={12} className="text-navy-shine/60 ml-2" />
          <span className="font-mono text-[9px] text-navy-mist/50">Terminal</span>
          <Code2 size={12} className="text-navy-shine/60 ml-2" />
          <span className="font-mono text-[9px] text-navy-mist/50">WebIDE</span>
        </div>

        <div className="relative aspect-video bg-navy-black overflow-hidden">
          <MetallicNavyCanvas variant="hero" className="absolute inset-0 w-full h-full opacity-80" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="font-sans text-lg tracking-wide text-white/90">
              ORBE<span className="text-navy-glow font-medium">SYSTEMS</span>
            </p>
          </div>
          <div className="absolute inset-0 bg-navy-glow/0 group-hover:bg-navy-glow/5 transition-colors flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 flex items-center gap-2 font-mono text-xs text-navy-glow glass-navy px-4 py-2 rounded-lg transition-opacity">
              Abrir Workspace <ArrowRight size={14} />
            </span>
          </div>
        </div>
      </Link>
    </section>
  );
}
