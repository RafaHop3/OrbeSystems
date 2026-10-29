'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  BookOpen,
  QrCode,
  ShieldCheck,
  ArrowRight,
  Lock,
  CheckCircle2,
  Share2,
  Compass,
  EyeOff,
  Layers,
  Bookmark,
  Users,
  Check
} from 'lucide-react';

interface MeshFeaturePillar {
  level: string;
  name: string;
  audience: string;
  desc: string;
  tag: string;
  iconName: string;
}

const MESH_PILLARS: MeshFeaturePillar[] = [
  {
    level: 'Pilar 01',
    name: 'Estante P2P & QR Code',
    audience: 'Scanner ISBN & Radar H3',
    desc: 'Cadastre sua estante física em menos de 3 segundos apontando a câmera para o ISBN-13. Descubra exemplares próximos no Radar por células hexagonais H3 e valide entregas presenciais com QR Code dinâmico assinado no Passaporte Imutável do exemplar.',
    tag: 'CIRCULAÇÃO FÍSICA P2P',
    iconName: 'QrCode',
  },
  {
    level: 'Pilar 02',
    name: 'Acervo Digital Aberto',
    audience: 'Leitura Nativa Offline-First',
    desc: 'Leitor integrado para obras em domínio público (EPUB/PDF), Creative Commons e autores independentes. Sincronização offline-first via CRDT (Yjs + IndexedDB): continue sua leitura, grifos e anotações mesmo sem sinal de internet.',
    tag: 'SINCRONIZAÇÃO CRDT',
    iconName: 'BookOpen',
  },
  {
    level: 'Pilar 03',
    name: 'Marginalia Coletiva',
    audience: 'Bloqueio Anti-Spoiler',
    desc: 'Citações e reflexões ancoradas exatamente no parágrafo do livro (EPUB CFI). O filtro anti-spoiler mascara automaticamente anotações de capítulos posteriores: você só visualiza pensamentos da malha até a porcentagem que já concluiu.',
    tag: 'LEITURA EM CAMADAS',
    iconName: 'EyeOff',
  },
  {
    level: 'Pilar 04',
    name: 'Mesh Clubs & Karma',
    audience: 'Círculos & Guardião Literário',
    desc: 'Crie e participe de círculos de leitura com metas temporizadas por capítulo e salas de debate. Cada devolução rigorosamente no prazo e exemplar bem cuidado eleva seu Karma Literário (Score de Guardião) na rede.',
    tag: 'COMUNIDADES & REPUTAÇÃO',
    iconName: 'Users',
  },
];

export default function EloProtocolHero() {
  const [activeTab, setActiveTab] = useState<number>(0);
  const current = MESH_PILLARS[activeTab];

  return (
    <section className="relative w-full py-20 bg-[#030508] border-y border-neon-cyan/20 overflow-hidden text-slate-200">
      {/* Background Cyber Grid */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,255,245,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,245,0.06) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Radial Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[380px] bg-neon-cyan/5 rounded-full blur-[130px] pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 max-w-7xl">
        {/* Friendly Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-8 border-b border-neon-cyan/15 text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse shadow-[0_0_8px_#00fff5]" />
            <span className="text-neon-cyan font-bold tracking-wider">MESH SOCIAL BOOKS · V2.0</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-300">ESTANTE P2P &amp; ACERVO DIGITAL</span>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <span className="text-emerald-400 hidden sm:inline">ARQUITETURA ISOLADA (ZERO-CROSS)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 font-semibold text-[10px]">
              KICK-OFF HOMOLOGADO
            </span>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Friendly Pitch & Interactive Novelties Matrix */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Nova Malha Literária Autônoma &amp; Conhecimento Descentralizado</span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-tilt-neon font-bold text-white tracking-tight leading-tight">
                Mesh Social Books <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan via-blue-400 to-purple-400 drop-shadow-[0_0_30px_rgba(0,255,245,0.4)]">
                  Leituras vivas, empréstimo P2P e zero algoritmos
                </span>
              </h2>
              <p className="text-slate-300 text-base sm:text-lg font-light leading-relaxed max-w-2xl">
                O <strong className="text-white font-medium">Mesh Social Books</strong> transforma conexões entre leitores em uma rede viva de circulação cultural autônoma. Catalague livros físicos por scanner ISBN, faça empréstimos com <span className="text-neon-cyan font-medium">handshake via QR Code</span> no seu bairro e desfrute de leitura digital aberta com marginalia coletiva e <span className="text-emerald-400 font-medium">bloqueio inteligente anti-spoiler</span>.
              </p>
            </div>

            {/* Interactive Feature Selector Matrix */}
            <div className="p-4 rounded-2xl bg-black/60 border border-neon-cyan/20 backdrop-blur-md space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                <span className="font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Bookmark className="w-3.5 h-3.5 text-neon-cyan" />
                  Explore as Novidades do Sistema Mesh Books:
                </span>
                <span className="text-neon-cyan font-bold">{current.name}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {MESH_PILLARS.map((pillar, index) => {
                  const isSelected = activeTab === index;
                  return (
                    <button
                      key={pillar.level}
                      type="button"
                      onClick={() => setActiveTab(index)}
                      className={`p-3 rounded-xl text-left transition-all duration-300 border ${
                        isSelected
                          ? 'bg-neon-cyan/15 border-neon-cyan text-white shadow-[0_0_15px_rgba(0,255,245,0.25)]'
                          : 'bg-[#06080e] border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <div className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-neon-cyan' : 'text-slate-500'}`}>
                        {pillar.level}
                      </div>
                      <div className="text-xs font-bold text-white mt-0.5 truncate">{pillar.name}</div>
                      <div className="text-[10px] text-slate-400 mt-1 truncate">{pillar.audience}</div>
                    </button>
                  );
                })}
              </div>

              {/* Dynamic Explanation Box */}
              <div className="p-3.5 rounded-xl bg-[#04060b] border border-slate-800 text-xs text-slate-300 leading-relaxed space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan font-bold text-[10px]">
                    {current.tag}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {current.audience}
                  </span>
                </div>
                <p className="pt-1 text-slate-200 leading-normal">
                  {current.desc}
                </p>
              </div>
            </div>

            {/* CTAs with Google 1-Click Highlights */}
            <div className="space-y-2 pt-2">
              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href="/mesh-social"
                  className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-neon-cyan text-black font-bold text-xs uppercase tracking-wider hover:bg-cyan-300 transition-all duration-300 shadow-[0_0_25px_rgba(0,255,245,0.4)] hover:scale-105"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Acessar Mesh Social Books (Grátis)</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/mesh-social"
                  className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-200 hover:border-neon-cyan/50 hover:text-neon-cyan text-xs uppercase tracking-wider font-semibold transition-all duration-300"
                >
                  <QrCode className="w-4 h-4 text-neon-cyan" />
                  <span>Ver Radar de Empréstimos P2P</span>
                </Link>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1 font-mono">
                <span className="flex items-center gap-1 text-emerald-400">
                  <Check className="w-3.5 h-3.5" />
                  Login Google em 1 Clique (&lt; 3s)
                </span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-1 text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  Banco de Dados 100% Dedicado &amp; LGPD
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Mockup Card of Mesh Social Books in Action */}
          <div className="lg:col-span-5">
            <div className="relative rounded-3xl bg-[#060911] border border-neon-cyan/30 overflow-hidden shadow-[0_0_40px_rgba(0,255,245,0.15)]">
              {/* Card Header: Book In Circulation */}
              <div className="px-5 py-3.5 bg-[#030508] border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="relative w-8 h-8 rounded-lg bg-neon-cyan/10 border border-neon-cyan/40 flex items-center justify-center text-neon-cyan">
                    <BookOpen className="w-4 h-4" />
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-black" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white block">Dom Casmurro</span>
                    <span className="text-[10px] text-slate-400">Machado de Assis · Acervo Canônico</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Em Circulação
                </span>
              </div>

              {/* Visual Body: Passport & Anti-Spoiler Marginalia */}
              <div className="p-5 space-y-4">
                {/* Dynamic QR Handshake & Location Radar H3 */}
                <div className="p-3.5 rounded-2xl bg-[#030408] border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <QrCode className="w-3.5 h-3.5 text-neon-cyan" />
                      Handshake Presencial P2P:
                    </span>
                    <span className="text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      QR Code Validado
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#070b14] border border-neon-cyan/20 flex items-center justify-between text-[11px]">
                    <div className="space-y-0.5">
                      <div className="text-slate-300 font-medium flex items-center gap-1.5">
                        <Compass className="w-3 h-3 text-cyan-400" />
                        Radar H3: <strong className="text-white">Bairro Bom Fim</strong> (~1.2 km)
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Nó Origem: <span className="text-neon-cyan">@marinacosta</span> ➔ Posse: <span className="text-white">@lucas_amaral</span>
                      </div>
                    </div>
                    <span className="px-2 py-1 rounded bg-neon-cyan/10 border border-neon-cyan/40 text-neon-cyan font-mono text-[10px] font-bold">
                      #LIV-8824
                    </span>
                  </div>

                  {/* Immutable Passport Dedication Note */}
                  <div className="text-[11px] text-slate-300 bg-slate-900/50 p-2 rounded-lg border border-slate-800 italic">
                    &ldquo;Capítulo 32 das memórias é arrebatador. Livro entregue impecável no café do bairro!&rdquo;
                    <span className="block text-[9px] text-slate-400 not-italic mt-0.5">— Registro no Passaporte do Exemplar</span>
                  </div>
                </div>

                {/* Marginalia Layers & Anti-Spoiler Shield */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                    <span className="font-semibold uppercase tracking-wider flex items-center gap-1 text-slate-300">
                      <Layers className="w-3 h-3 text-neon-cyan" />
                      Marginalia Coletiva (EPUB CFI)
                    </span>
                    <span className="text-neon-cyan font-mono text-[10px]">Progresso Leitor: 38%</span>
                  </div>

                  {/* Note 1: Accessible (Progress <= 38%) */}
                  <div className="p-3 rounded-xl bg-[#04060c] border border-emerald-500/30 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[9px] font-bold">CAP. 04 · 18%</span>
                        <span className="text-white font-medium text-[11px]">Destaque de @marinacosta</span>
                      </div>
                      <p className="text-[10px] text-slate-300">
                        &ldquo;Análise sobre a ambiguidade da narrativa em Capitu...&rdquo;
                      </p>
                    </div>
                    <span className="text-emerald-400 text-[10px] font-semibold shrink-0 ml-2">Liberado</span>
                  </div>

                  {/* Note 2: Locked by Intelligent Anti-Spoiler Filter (Progress > 38%) */}
                  <div className="p-3 rounded-xl bg-[#04060c] border border-rose-500/30 bg-rose-950/10 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 text-[9px] font-bold">CAP. 29 · 74%</span>
                        <span className="text-slate-300 font-medium text-[11px] flex items-center gap-1">
                          <Lock className="w-3 h-3 text-rose-400" />
                          Debate do Julgamento Final
                        </span>
                      </div>
                      <p className="text-[10px] text-rose-300/80 font-mono">
                        Bloqueio Anti-Spoiler: alcance o capítulo para revelar.
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-500/30 text-[9px] font-bold shrink-0 ml-2">
                      Oculto
                    </span>
                  </div>
                </div>

                {/* Literary Karma Reputation Meter */}
                <div className="p-3 rounded-xl bg-[#030408] border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Score de Guardião Literário (Karma):</span>
                    <span className="text-neon-cyan font-bold font-mono">100 / 100 · 100% no Prazo</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                    <div className="h-full bg-gradient-to-r from-cyan-500 via-neon-cyan to-emerald-400 rounded-full w-full" />
                  </div>
                </div>

                {/* Footer Security Badge */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Arquitetura Siloed &amp; Segregada
                  </span>
                  <span className="text-slate-300 font-medium">Zero Vínculo Legado • LGPD</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
