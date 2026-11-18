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
      <div className="relative overflow-hidden rounded-3xl border border-amber-400/40 bg-gradient-to-br from-[#0d111d]/95 via-[#070a14]/95 to-[#161209]/95 p-6 sm:p-10 shadow-[0_0_55px_rgba(245,158,11,0.14)] backdrop-blur-2xl">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />

        <div className="relative grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 flex flex-col gap-4 text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-950/70 border border-amber-400/40 text-amber-300 text-xs font-mono font-bold uppercase tracking-wider w-fit shadow-[0_0_15px_rgba(245,158,11,0.25)]">
              <Briefcase size={14} className="text-amber-400" />
              <span>OrbeJobs • Carreira Inteligente Zero-Key + Orbe IA</span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
              Sua esteira autônoma de vagas com{' '}
              <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-emerald-300 bg-clip-text text-transparent">
                Living CV &amp; Motor IMORTAL
              </span>
            </h2>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl">
              Varredura híbrida em ATS públicos (<strong>Greenhouse, Lever &amp; RSS</strong>), ranqueamento vetorial{' '}
              <strong>pgvector</strong> e adaptação pela <strong>Orbe IA</strong> com envio seguro via Gmail OAuth2,
              validação prévia de <strong>DNS MX</strong> e auditoria <strong>LGPD</strong>.
            </p>

            <div className="grid sm:grid-cols-2 gap-2.5 pt-1 text-xs text-slate-300 font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />
                <span>Living CV via PDF, JSON Resume e WhatsApp</span>
              </div>
              <div className="flex items-center gap-2">
                <KeyRound size={15} className="text-amber-400 flex-shrink-0" />
                <span>Cofre MultiFernet AES-256 (gmail.send)</span>
              </div>
              <div className="flex items-center gap-2">
                <MailCheck size={15} className="text-cyan-400 flex-shrink-0" />
                <span>DNS MX Anti-Bounce + Jitter + Teto 15/dia</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck size={15} className="text-emerald-400 flex-shrink-0" />
                <span>Human-in-the-Loop + Kill-Switch + LGPD Art. 18</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-3">
            <a
              href="https://inho.orbesystems.com.br/dashboard/orbejobs"
              className="w-full px-6 py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-slate-950 font-black text-sm hover:brightness-110 shadow-[0_0_25px_rgba(245,158,11,0.35)] transition-all flex items-center justify-center gap-2 group"
            >
              <Sparkles size={16} />
              <span>Abrir Painel OrbeJobs</span>
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </a>
            <div className="text-[11px] text-slate-400 text-center font-mono">
              Deduplicação SHA-256 • 100% Orbe IA
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
