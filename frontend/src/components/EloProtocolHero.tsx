'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Sparkles, Users, Lock, Heart, ShieldCheck, ArrowRight } from 'lucide-react';

interface OrbitMetric {
  level: string;
  name: string;
  audience: string;
  desc: string;
  tag: string;
}

const ORBIT_LEVELS: OrbitMetric[] = [
  {
    level: 'Nível 1',
    name: 'Público',
    audience: 'Aberto a todos',
    desc: 'Espaço aberto para fotos bonitas, ideias e fotografia. Qualquer amigo ou visitante pode ver suas publicações e puxar assunto.',
    tag: 'FOTOS & IDEIAS',
  },
  {
    level: 'Nível 2',
    name: 'Amigos',
    audience: 'Amigos frequentes',
    desc: 'Momentos espontâneos do seu dia, fotos sem filtro e áudios de bastidores. Visível para quem troca conversas reais com você.',
    tag: 'BASTIDORES DO DIA',
  },
  {
    level: 'Nível 3',
    name: 'Círculo Próximo',
    audience: 'Grupo de confiança',
    desc: 'Vídeos mais longos em alta definição, relatos sinceros e reflexões de vida. Reservado para os amigos de verdade.',
    tag: 'VÍDEOS & CONVERSAS',
  },
  {
    level: 'Nível 4',
    name: 'Melhores Amigos',
    audience: 'Até 15 pessoas íntimas',
    desc: 'Seu círculo mais precioso da vida. Álbuns de família e memórias pessoais protegidos com máxima privacidade.',
    tag: 'MOMENTOS ÍNTIMOS',
  },
];

export default function EloProtocolHero() {
  const [activeOrbit, setActiveOrbit] = useState<number>(0);
  const current = ORBIT_LEVELS[activeOrbit];

  return (
    <section className="relative w-full py-20 bg-[#030508] border-y border-neon-cyan/20 overflow-hidden text-slate-200">
      {/* Background Cyber Grid */}
      <div 
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(0,255,245,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,245,0.06) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Radial Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-neon-cyan/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 max-w-7xl">
        {/* Friendly Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-8 border-b border-neon-cyan/15 text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse shadow-[0_0_8px_#00fff5]" />
            <span className="text-neon-cyan font-bold tracking-wider">MESH SOCIAL</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-300">AMIZADES REAIS</span>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <span className="text-emerald-400 hidden sm:inline">100% GRATUITO &amp; SEM ANÚNCIOS</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 font-semibold text-[10px]">
              REDE DISPONÍVEL
            </span>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Friendly Pitch & Interactive Circles */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Uma rede social feita para pessoas, não para algoritmos</span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-tilt-neon font-bold text-white tracking-tight leading-tight">
                Mesh Social <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan via-blue-400 to-purple-400 drop-shadow-[0_0_30px_rgba(0,255,245,0.4)]">
                  Conexões de verdade com quem importa
                </span>
              </h2>
              <p className="text-slate-300 text-base sm:text-lg font-light leading-relaxed max-w-2xl">
                Cansado de feeds lotados de anúncios, dancinhas forçadas e algoritmos tóxicos? O <strong className="text-white font-medium">Mesh Social</strong> funciona como um Instagram limpo e tranquilo: você posta fotos e vídeos, e decide com carinho quem pode ver cada momento, <span className="text-neon-cyan">sempre de graça e com total privacidade</span>.
              </p>
            </div>

            {/* Orbit Selector Matrix (Friendly for non-tech users) */}
            <div className="p-4 rounded-2xl bg-black/60 border border-neon-cyan/20 backdrop-blur-md space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                <span className="font-semibold uppercase tracking-wider text-slate-300">Escolha quem vê suas postagens:</span>
                <span className="text-neon-cyan font-bold">{current.name} ({current.audience})</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ORBIT_LEVELS.map((orbit, index) => {
                  const isSelected = activeOrbit === index;
                  return (
                    <button
                      key={orbit.level}
                      type="button"
                      onClick={() => setActiveOrbit(index)}
                      className={`p-3 rounded-xl text-left transition-all duration-300 border ${
                        isSelected
                          ? 'bg-neon-cyan/15 border-neon-cyan text-white shadow-[0_0_15px_rgba(0,255,245,0.25)]'
                          : 'bg-[#06080e] border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <div className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-neon-cyan' : 'text-slate-500'}`}>
                        {orbit.level}
                      </div>
                      <div className="text-xs font-bold text-white mt-0.5 truncate">{orbit.name}</div>
                      <div className="text-[10px] text-slate-400 mt-1 truncate">{orbit.audience}</div>
                    </button>
                  );
                })}
              </div>

              {/* Dynamic Explanation Box */}
              <div className="p-3.5 rounded-xl bg-[#04060b] border border-slate-800 text-xs text-slate-300 leading-relaxed">
                <span className="text-neon-cyan font-bold mr-1.5">[{current.tag}]:</span>
                {current.desc}
              </div>
            </div>

            {/* Friendly CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/mesh-social"
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-neon-cyan text-black font-bold text-xs uppercase tracking-wider hover:bg-cyan-300 transition-all duration-300 shadow-[0_0_25px_rgba(0,255,245,0.4)]"
              >
                <span>Acessar Mesh Social Agora</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/mesh-social"
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-200 hover:border-neon-cyan/50 hover:text-neon-cyan text-xs uppercase tracking-wider font-semibold transition-all duration-300"
              >
                <span>Ver Feed de Amigos</span>
              </Link>
            </div>
          </div>

          {/* Right Column: Visual Friendly Profile Mockup Card */}
          <div className="lg:col-span-5">
            <div className="relative rounded-3xl bg-[#060911] border border-neon-cyan/30 overflow-hidden shadow-[0_0_40px_rgba(0,255,245,0.1)]">
              {/* Card Header */}
              <div className="px-5 py-3.5 bg-[#030508] border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <img
                      src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80"
                      alt="Marina Costa"
                      className="w-8 h-8 rounded-full object-cover border border-neon-cyan"
                    />
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-black" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white block">Marina Costa</span>
                    <span className="text-[10px] text-slate-400">@marinacosta • Amiga Conectada</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                  Online Agora
                </span>
              </div>

              {/* Visual Body */}
              <div className="p-5 space-y-4">
                {/* Friendship & Affinity Meter */}
                <div className="p-3.5 rounded-2xl bg-[#030408] border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                      Nível de Amizade &amp; Afinidade:
                    </span>
                    <span className="text-neon-cyan font-bold">Amizade Forte (98%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                    <div className="h-full bg-gradient-to-r from-cyan-500 to-neon-cyan rounded-full w-[85%]" />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                    <span>Você tem acesso: <strong className="text-white">Círculo Próximo</strong></span>
                    <span className="text-emerald-400">Conversas Recentes</span>
                  </div>
                </div>

                {/* Simulated Content Sharing */}
                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-xl bg-[#04060c] border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 text-[10px] font-bold">PÚBLICO</span>
                      <span className="text-white font-medium">Fotos de Paisagens &amp; Arquitetura</span>
                    </div>
                    <span className="text-emerald-400 text-[11px] font-semibold">Liberado</span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#04060c] border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 text-[10px] font-bold">AMIGOS</span>
                      <span className="text-white font-medium">Bastidores da Rotina &amp; Áudios</span>
                    </div>
                    <span className="text-emerald-400 text-[11px] font-semibold">Liberado</span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#04060c] border border-neon-cyan/40 bg-neon-cyan/5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 text-[10px] font-bold">PRÓXIMO</span>
                      <span className="text-white font-medium">Vídeos Longos &amp; Relatos Sinceros</span>
                    </div>
                    <span className="text-neon-cyan text-[11px] font-bold">Disponível</span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#04060c]/50 border border-slate-800/60 opacity-60 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 text-[10px] font-bold">MELHORES AMIGOS</span>
                      <span className="text-slate-400">Álbum Íntimo (Até 15 Pessoas)</span>
                    </div>
                    <span className="text-slate-500 text-[11px]">Apenas Convite</span>
                  </div>
                </div>

                {/* Footer Security Badge */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Privacidade Total
                  </span>
                  <span className="text-slate-300 font-medium">Sem Anúncios • 100% Grátis</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
