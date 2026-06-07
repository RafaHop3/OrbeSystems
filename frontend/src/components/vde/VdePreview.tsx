'use client';

import Link from 'next/link';
import { Monitor, Terminal, Code2, ArrowRight } from 'lucide-react';
import OrbeLogo from '../OrbeLogo';

/** Miniatura estática na home — link para o VDE completo */
export default function VdePreview() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-16">
      <div className="text-center mb-8">
        <p className="font-cinzel text-xs text-renaissance-gold tracking-widest uppercase mb-2">
          La Prospettiva Virtuale
        </p>
        <h2 className="font-cinzel text-2xl md:text-3xl font-semibold text-white">
          Área de Trabalho Virtual, <span className="text-renaissance-gold italic font-serif">Officina d'Orbe</span>
        </h2>
        <p className="font-serif text-sm text-renaissance-muted mt-3 max-w-xl mx-auto">
          Estudo de perspectiva tridimensional contendo Terminal, WebIDE e o Assistente Inteligente Orbe — tudo integrado em harmonia.
        </p>
      </div>

      <Link
        href="/workspace"
        className="block group rounded-lg overflow-hidden gilded-frame"
      >
        <div className="flex items-center gap-1 px-4 py-3 bg-[#130f0d] border-b border-renaissance-border">
          <Monitor size={12} className="text-renaissance-gold" />
          <span className="font-cinzel text-[9px] uppercase tracking-widest text-renaissance-gold">Officina</span>
          <Terminal size={12} className="text-renaissance-muted ml-3" />
          <span className="font-cinzel text-[9px] uppercase tracking-widest text-renaissance-muted">Console</span>
          <Code2 size={12} className="text-renaissance-muted ml-3" />
          <span className="font-cinzel text-[9px] uppercase tracking-widest text-renaissance-muted">Scriptorium</span>
          <span className="ml-auto font-mono text-[10px] text-renaissance-gold/60">MDVII</span>
        </div>

        <div
          className="relative aspect-video flex items-center justify-center bg-renaissance-bg"
          style={{ backgroundImage: 'radial-gradient(circle at center, rgba(212,175,55,0.06) 0%, transparent 80%)' }}
        >
          <div className="absolute left-6 top-6 flex flex-col gap-4 opacity-80">
            {[Terminal, Code2, Monitor].map((Icon, i) => (
              <div key={i} className="w-10 h-10 rounded border border-renaissance-gold/20 flex items-center justify-center bg-renaissance-surface shadow-md">
                <Icon size={16} className="text-renaissance-gold/80" />
              </div>
            ))}
          </div>
          <div className="w-20 h-20 text-renaissance-gold/40">
            <OrbeLogo className="w-full h-full" />
          </div>
          <p className="absolute bottom-6 font-cinzel text-lg tracking-widest text-[#dfd2b8] uppercase">
            ORBE<span className="text-renaissance-gold font-bold">SYSTEMS</span>
          </p>
          <div
            className="absolute right-4 top-4 w-48 rounded border border-renaissance-gold/20 p-3 hidden sm:block bg-renaissance-surface/95"
            style={{ backdropFilter: 'blur(8px)' }}
          >
            <p className="font-cinzel text-[9px] text-renaissance-gold mb-1 uppercase tracking-widest">Orbe Coadjutor</p>
            <p className="font-serif text-xs text-[#dfd2b8]/80 leading-relaxed italic">Disegno di sicurezza logica e stabilità nell'officina virtuale...</p>
          </div>
          <div className="absolute inset-0 bg-renaissance-gold/0 group-hover:bg-renaissance-gold/5 transition-colors flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 flex items-center gap-2 font-cinzel text-xs uppercase tracking-widest text-[#dfd2b8] bg-[#0c0a08]/90 border border-renaissance-gold/50 px-5 py-3 rounded shadow-xl transition-all duration-300">
              Entrar no Workspace <ArrowRight size={14} className="text-renaissance-gold" />
            </span>
          </div>
        </div>

        <div className="flex justify-between px-4 py-2 bg-renaissance-gold/15 text-renaissance-gold/80 border-t border-renaissance-border">
          <span className="font-cinzel text-[9px] uppercase tracking-widest">Strumenti e Applicazioni</span>
          <span className="font-cinzel text-[9px] uppercase tracking-widest">Officina d'Orbe VDE</span>
        </div>
      </Link>
    </section>
  );
}
