'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface OrbitMetric {
  ring: string;
  name: string;
  req: string;
  dunbar: string;
  desc: string;
  status: string;
}

const ORBIT_LEVELS: OrbitMetric[] = [
  {
    ring: 'RING_01',
    name: 'Praça Pública',
    req: 'Aberto (0 PCR)',
    dunbar: 'Infinito',
    desc: 'Descoberta aberta: ensaios curtos, threads públicas e fotografia. Qualquer nó pode visualizar e iniciar diálogo.',
    status: 'ACESSO PÚBLICO',
  },
  {
    ring: 'RING_02',
    name: 'Órbita Próxima',
    req: '50+ PCR Bilateral',
    dunbar: 'Rede Ativa',
    desc: 'Bastidores de rotina, notas de voz assíncronas e carrosséis sem filtro comercial. Exige interação recíproca.',
    status: 'RECIPROCIDADE',
  },
  {
    ring: 'RING_03',
    name: 'Sala de Estar',
    req: '100+ PCR + Resposta',
    dunbar: 'Cap ≤ 50 Nós',
    desc: 'Vlogs longos (10–30 min em 4K HDR), ensaios reflexivos e círculo de confiança. Bloqueio estrito de monetização.',
    status: 'CÍRCULO RESTRITO',
  },
  {
    ring: 'RING_04',
    name: 'Cofre Íntimo',
    req: '160+ PCR + Chave Mútua',
    dunbar: 'Cap ≤ 15 Nós',
    desc: 'Cápsulas de memória e arquivo de vida. Protegido por criptografia bilateral e limite antropológico de Dunbar.',
    status: 'DUNBAR VAULT',
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
        {/* HUD Telemetry Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-8 border-b border-neon-cyan/15 text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse shadow-[0_0_8px_#00fff5]" />
            <span className="text-neon-cyan font-bold tracking-wider">{'ORBE HUD // SYS 12'}</span>
            <span className="text-slate-600">|</span>
            <span className="tracking-wide">MESH SOCIAL // KINETIC GRAPH</span>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <span className="text-emerald-400 hidden sm:inline">ZERO-PAYWALL ENGINE</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
              DUNBAR CAP: ≤15 NÓS
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 font-semibold">
              STATUS: ATIVO
            </span>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Thesis & Interactive Orbit Controls */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan font-mono text-xs tracking-widest uppercase">
                <span>Grafo de Reciprocidade Verificada</span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-tilt-neon font-bold text-white tracking-tight leading-tight">
                Mesh Social <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan via-blue-400 to-purple-400 drop-shadow-[0_0_30px_rgba(0,255,245,0.4)]">
                  Arquitetura Viva de Conexão Real
                </span>
              </h2>
              <p className="text-slate-300 text-base sm:text-lg font-light leading-relaxed max-w-2xl">
                Não construímos feeds para retenção comercial de desconhecidos. O <strong className="text-white font-medium">Mesh Social</strong> unifica fotos, vídeos curtos, vlogs longos e threads sob um grafo determinístico: <span className="text-neon-cyan">o acesso a camadas íntimas é conquistado por reciprocidade comprovada</span>, jamais por assinaturas ou paywalls.
              </p>
            </div>

            {/* Orbit Selector Matrix */}
            <div className="p-4 rounded-xl bg-black/60 border border-neon-cyan/20 backdrop-blur-md space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-b border-slate-800 pb-2">
                <span className="tracking-wider uppercase">SELECIONE A ÓRBITA DE ACESSO:</span>
                <span className="text-neon-cyan font-semibold">{current.ring} • {current.name}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                {ORBIT_LEVELS.map((orbit, index) => {
                  const isSelected = activeOrbit === index;
                  return (
                    <button
                      key={orbit.ring}
                      type="button"
                      onClick={() => setActiveOrbit(index)}
                      className={`p-2.5 rounded-lg text-left transition-all duration-300 border ${
                        isSelected
                          ? 'bg-neon-cyan/15 border-neon-cyan text-white shadow-[0_0_15px_rgba(0,255,245,0.25)]'
                          : 'bg-[#06080e] border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <div className={`text-[10px] font-bold ${isSelected ? 'text-neon-cyan' : 'text-slate-500'}`}>
                        {orbit.ring}
                      </div>
                      <div className="text-xs font-semibold mt-0.5 truncate">{orbit.name}</div>
                      <div className="text-[10px] text-slate-500 mt-1 truncate">{orbit.dunbar}</div>
                    </button>
                  );
                })}
              </div>

              {/* Dynamic Orbit Explanation Box */}
              <div className="p-3 rounded-lg bg-[#04060b] border border-slate-800 text-xs text-slate-300 leading-relaxed font-sans">
                <span className="font-mono text-neon-cyan font-semibold mr-1.5">[{current.status}]:</span>
                {current.desc}
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-2 font-mono">
              <Link
                href="/mesh-social"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-neon-cyan text-black font-bold text-xs uppercase tracking-wider hover:bg-cyan-300 transition-all duration-300 shadow-[0_0_25px_rgba(0,255,245,0.4)]"
              >
                <span>Explorar Simulador Mesh Social</span>
                <span aria-hidden="true">→</span>
              </Link>
              <Link
                href="/mesh-social#analise"
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-200 hover:border-neon-cyan/50 hover:text-neon-cyan text-xs uppercase tracking-wider font-semibold transition-all duration-300"
              >
                Auditoria SAST &amp; Dunbar
              </Link>
            </div>
          </div>

          {/* Right Column: Visual Telemetry Node Card */}
          <div className="lg:col-span-5">
            <div className="relative rounded-2xl bg-[#060911] border border-neon-cyan/30 overflow-hidden shadow-[0_0_40px_rgba(0,255,245,0.1)] group">
              {/* Card Header */}
              <div className="px-4 py-3 bg-[#030508] border-b border-slate-800 flex items-center justify-between font-mono text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-slate-300 font-semibold">NODE: @marinacosta</span>
                </div>
                <span className="text-neon-cyan text-[11px] font-bold">MESH VERIFIED</span>
              </div>

              {/* Visual Body */}
              <div className="p-5 space-y-4">
                {/* Proof of Connection Meter */}
                <div className="p-3.5 rounded-xl bg-[#030408] border border-slate-800 space-y-2 font-mono">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">PONTOS DE CONEXÃO REAL (PCR):</span>
                    <span className="text-neon-cyan font-bold">120 / 160 PCR</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                    <div className="h-full bg-gradient-to-r from-cyan-500 to-neon-cyan rounded-full w-[75%]" />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                    <span>Nível Desbloqueado: <strong className="text-white">Sala de Estar</strong></span>
                    <span className="text-emerald-400">Reciprocidade 98.4%</span>
                  </div>
                </div>

                {/* Simulated Content Rings */}
                <div className="space-y-2 text-xs font-mono">
                  <div className="p-3 rounded-lg bg-[#04060c] border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 text-[10px]">RING 1</span>
                      <span className="text-white">Fotografia &amp; Threads de Arquitetura</span>
                    </div>
                    <span className="text-emerald-400 text-[11px]">LIVRE</span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#04060c] border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 text-[10px]">RING 2</span>
                      <span className="text-white">Notas de Voz de 1 min &amp; Rotina Real</span>
                    </div>
                    <span className="text-emerald-400 text-[11px]">CONQUISTADO</span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#04060c] border border-neon-cyan/40 bg-neon-cyan/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 text-[10px]">RING 3</span>
                      <span className="text-white">Vlogs Longos (16 min 4K HDR)</span>
                    </div>
                    <span className="text-neon-cyan text-[11px]">DESBLOQUEADO</span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#04060c]/50 border border-slate-800/60 opacity-60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 text-[10px]">RING 4</span>
                      <span className="text-slate-400">Cofre Íntimo (Dunbar ≤ 15 Nós)</span>
                    </div>
                    <span className="text-slate-500 text-[11px]">REQUER CHAVE</span>
                  </div>
                </div>

                {/* Footer Security Badge */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span>CRIPTOGRAFIA: AES-256 + JWT</span>
                  <span className="text-slate-400">SEM ANÚNCIOS / SEM PAYWALL</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
