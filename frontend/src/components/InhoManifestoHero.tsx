'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Apple,
  Gauge,
  GitBranch,
  Landmark,
  MessageCircle,
  ShieldCheck,
  Sprout,
  Wheat,
} from 'lucide-react';
import ToolVoidPanel from '@/components/ToolVoidPanel';
import ProductMetrics from '@/components/ProductMetrics';
import ScrollReveal from '@/components/ScrollReveal';
import { MANIFESTO_STAGES, MANIFESTO_TAGLINE } from '@/data/inho_manifesto';

const ICONS = [Sprout, Landmark, GitBranch, MessageCircle, Apple, ShieldCheck, Gauge, Wheat];

export default function InhoManifestoHero() {
  const inhoUrl = 'https://inho.orbesystems.com.br';
  const voidRef = useRef<HTMLDivElement>(null);
  const [showVoid, setShowVoid] = useState(false);

  // Monta o canvas WebGL só quando a seção se aproxima da viewport (economia de GPU).
  useEffect(() => {
    const el = voidRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShowVoid(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="inho-manifesto"
      aria-labelledby="inho-manifesto-title"
      className="relative z-10 w-full py-24 px-6 border-b border-[#8b5cf6]/30 bg-transparent backdrop-blur-[2px] overflow-hidden"
    >
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-[#8b5cf6]/10 to-transparent" />
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-purple-600/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        <header className="max-w-3xl mb-14 space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 rounded-full text-[10px] text-[#a78bfa] uppercase font-bold tracking-widest">
            <Sprout size={14} /> Manifesto · INHO Business
          </div>
          <h2
            id="inho-manifesto-title"
            className="text-4xl md:text-5xl font-bold font-tilt-neon text-white leading-tight"
          >
            INHO: onde a gestão encontra a{' '}
            <span
              className="text-shimmer bg-clip-text text-transparent bg-gradient-to-r from-[#a78bfa] via-purple-400 to-[#00fff5]"
              style={{ textShadow: '0 0 20px rgba(167,139,250,0.5)' }}
            >
              inteligência
            </span>
          </h2>
          <p className="text-slate-300 font-sans leading-relaxed text-lg">
            Um sistema de gestão empresarial que cuida do seu negócio como quem cuida de um jardim.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          {/* Esquerda: as 8 estações */}
          <ol className="lg:col-span-7 order-2 lg:order-1 relative space-y-5">
            <div
              aria-hidden="true"
              className="absolute left-6 top-6 bottom-6 w-0.5 bg-gradient-to-b from-purple-500/50 via-cyan-500/40 to-emerald-500/50"
            />
            {MANIFESTO_STAGES.map((stage, i) => {
              const Icon = ICONS[i];
              return (
                <li key={stage.numeral} className="relative">
                  <ScrollReveal variant="fade-left" delay={i * 60}>
                    <div className="flex gap-4 items-start bg-black/60 backdrop-blur-xl border border-purple-500/30 rounded-xl p-4 hover:border-[#00fff5]/40 transition-colors">
                      <div className="relative z-10 w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                        <Icon className="text-purple-300" size={22} aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-mono uppercase tracking-widest text-purple-300">
                          {stage.numeral} · {stage.title}
                        </p>
                        <h3
                          className="font-tilt-neon tracking-wide font-bold text-white text-base mt-0.5"
                          style={{ textShadow: '0 0 5px rgba(255,255,255,0.4)' }}
                        >
                          {stage.heading}
                        </h3>
                        <p className="text-sm text-slate-300 mt-1 leading-relaxed">{stage.line}</p>
                        <ul className="flex flex-wrap gap-2 mt-2">
                          {stage.keywords.map((k) => (
                            <li
                              key={k}
                              className="text-[10px] font-mono px-2 py-0.5 rounded border border-white/10 text-slate-300 bg-white/5"
                            >
                              {k}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </ScrollReveal>
                </li>
              );
            })}
          </ol>

          {/* Direita: árvore + métricas (sticky no desktop) */}
          <div ref={voidRef} className="lg:col-span-5 order-1 lg:order-2 lg:sticky lg:top-28 space-y-5">
            {showVoid ? (
              <ToolVoidPanel
                shape="inho-growth-tree"
                accentColor="#a78bfa"
                secondaryColor="#00fff5"
                label="Void // Árvore INHO"
                className="h-64 lg:h-96"
              />
            ) : (
              <div
                aria-hidden="true"
                className="h-64 lg:h-96 rounded-2xl bg-black/50 border border-white/10"
              />
            )}
            <ProductMetrics
              metrics={[
                { label: 'Anti-injection', value: '< 1 ms' },
                { label: 'Isolamento', value: 'UUID + RLS' },
                { label: 'Privacidade', value: 'LGPD Art. 18' },
              ]}
            />
          </div>
        </div>

        <footer className="mt-14 text-center space-y-6">
          <blockquote className="text-2xl md:text-3xl font-tilt-neon font-bold text-white">
            {MANIFESTO_TAGLINE}
          </blockquote>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/inho"
              className="inline-flex items-center gap-3 border border-[#8b5cf6]/50 text-[#c4b5fd] hover:bg-[#8b5cf6]/20 font-bold uppercase tracking-widest text-sm px-8 py-4 transition-all duration-300"
            >
              Ler o manifesto completo <ArrowRight size={18} />
            </Link>
            <a
              href={`${inhoUrl}/login`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-[#8b5cf6] hover:bg-white text-white hover:text-black font-bold uppercase tracking-widest text-sm px-8 py-4 transition-all duration-300 shadow-[0_0_25px_rgba(139,92,246,0.5)]"
            >
              Acessar INHO via Orbe SSO <ArrowRight size={18} />
            </a>
          </div>
        </footer>
      </div>
    </section>
  );
}
