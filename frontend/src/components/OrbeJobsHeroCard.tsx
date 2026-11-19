'use client';

import React from 'react';
import {
  Briefcase,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  KeyRound,
  MailCheck,
} from 'lucide-react';

export default function OrbeJobsHeroCard() {
  return (
    <section className="relative z-30 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
      <div className="relative overflow-hidden rounded-3xl border border-[#FF6B1A]/45 bg-[#090503] p-6 sm:p-10 shadow-[0_0_65px_rgba(255,107,26,0.22)]">
        {/* Glow Neon Laranja estilo tubo luminoso */}
        <div className="absolute -top-20 left-1/4 h-64 w-96 rounded-full bg-[#FF6B1A]/20 blur-[90px] pointer-events-none" />
        <div className="absolute -bottom-24 right-10 h-60 w-60 rounded-full bg-[#FF9E2C]/15 blur-[80px] pointer-events-none" />

        <div className="relative grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 flex flex-col gap-4 text-left">
            {/* Título Neon Laranja com brilho de tubo */}
            <div className="flex items-center gap-4 pt-1">
              <Sparkles
                size={36}
                className="text-[#FFD2A6] drop-shadow-[0_0_12px_rgba(255,107,26,0.95)] flex-shrink-0"
              />
              <h2
                className="text-4xl sm:text-5xl font-medium tracking-tight text-[#FFF2E5]"
                style={{
                  textShadow:
                    '0 0 8px rgba(255,140,50,0.95), 0 0 22px rgba(255,107,26,0.85), 0 0 42px rgba(255,80,0,0.55)',
                }}
              >
                OrbeJobs
              </h2>
              <span className="px-2.5 py-1 rounded-full bg-[#FF6B1A]/15 border border-[#FF6B1A]/50 text-[#FFB380] text-[10px] font-mono uppercase tracking-widest">
                Orbe IA Nativa
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Introducing OrbeJobs — Esteira Autônoma &amp; Living CV
            </h3>

            <p className="text-zinc-300 text-sm sm:text-base leading-relaxed max-w-2xl">
              Varredura híbrida em ATS públicos (<strong>Greenhouse, Lever &amp; RSS</strong>), ranqueamento vetorial{' '}
              <strong>pgvector</strong> e adaptação pela <strong>Orbe IA</strong> com cofre AES-256, validação{' '}
              <strong>DNS MX</strong> e trilha <strong>LGPD</strong>.
            </p>

            <div className="grid sm:grid-cols-2 gap-2.5 pt-1 text-xs text-zinc-300 font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-[#FF8C42] flex-shrink-0" />
                <span>Living CV via PDF, JSON Resume e WhatsApp</span>
              </div>
              <div className="flex items-center gap-2">
                <KeyRound size={15} className="text-[#FF8C42] flex-shrink-0" />
                <span>Cofre MultiFernet AES-256 (gmail.send)</span>
              </div>
              <div className="flex items-center gap-2">
                <MailCheck size={15} className="text-[#FF8C42] flex-shrink-0" />
                <span>DNS MX Anti-Bounce + Jitter + Teto 15/dia</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck size={15} className="text-[#FF8C42] flex-shrink-0" />
                <span>Human-in-the-Loop + Kill-Switch + LGPD Art. 18</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-3">
            <a
              href="/orbejobs"
              className="w-full px-6 py-4 rounded-2xl bg-gradient-to-r from-[#FF6B1A] via-[#FF8C32] to-[#FF6B1A] text-white font-bold text-sm hover:brightness-110 shadow-[0_0_30px_rgba(255,107,26,0.45)] transition-all flex items-center justify-center gap-2 group"
            >
              <Briefcase size={16} />
              <span>Abrir Painel OrbeJobs</span>
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </a>
            <div className="text-[11px] text-zinc-400 text-center font-mono">
              Deduplicação SHA-256 • 100% Orbe IA
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
