'use client';

import React from 'react';
import Link from 'next/link';
import { Bot, Sparkles, ArrowRight, CheckCircle2, ShieldCheck, Zap, MessageSquare } from 'lucide-react';

export default function OrbeAssistantHeroCard() {
  const handleOpenAssistant = () => {
    // Dispara clique no botão flutuante do assistente caso esteja fechado
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <section className="relative z-30 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8">
      {/* Container com Glow Futurista */}
      <div className="relative overflow-hidden rounded-3xl border border-cyan-500/40 bg-gradient-to-br from-[#06101e]/90 via-[#030712]/95 to-[#0b1329]/90 p-6 sm:p-10 shadow-[0_0_60px_rgba(6,182,212,0.15)] backdrop-blur-2xl">
        {/* Luzes de Fundo Dinâmicas */}
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />

        <div className="relative grid lg:grid-cols-12 gap-8 items-center">
          {/* Lado Esquerdo: Saudação do Orbe Assistant e Pitch de Vendas */}
          <div className="lg:col-span-7 flex flex-col gap-4 text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/70 border border-cyan-400/40 text-cyan-300 text-xs font-mono font-bold uppercase tracking-wider w-fit shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <Sparkles size={14} className="text-cyan-400 animate-pulse" />
              <span>Orbe Assistant • Lançamento Oficial dos Novos Planos 2026</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
              Acelere seu negócio com o{' '}
              <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-amber-300 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(6,182,212,0.6)]">
                INHO ERP & OrBrick-IA
              </span>
            </h1>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl">
              Olá! Sou o <strong>Orbe Assistant</strong>. O sistema que você precisava para automatizar
              cobranças pelo <strong>WhatsApp com Pix e Boletos</strong>, gerenciar seu <strong>PDV com Maquininha Física Stripe</strong> e ter governança de ponta para <strong>PMEs, Mercados e Cooperativas</strong>.
            </p>

            {/* Vantagens Chave */}
            <div className="grid sm:grid-cols-2 gap-2.5 pt-2 text-xs text-slate-300 font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                <span>Régua WhatsApp c/ IA Anti-Inadimplência</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                <span>Maquininha Física Stripe Terminal no PDV</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                <span>Módulo Cooperativas BACEN &amp; Cotas</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                <span>2 Meses Grátis no Faturamento Anual</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
              <Link
                href="/assinar"
                className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 text-slate-950 font-black text-sm hover:brightness-110 shadow-[0_0_25px_rgba(6,182,212,0.4)] transition-all flex items-center justify-center gap-2 group"
              >
                <span>Ver Planos &amp; Assinar Agora</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>

              <a
                href="https://inho.orbesystems.com.br/login"
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-3.5 rounded-xl bg-slate-900/80 border border-slate-700 hover:border-cyan-400/60 text-slate-200 hover:text-white font-bold text-sm transition-all flex items-center justify-center gap-2"
              >
                <ShieldCheck size={16} className="text-cyan-400" />
                <span>Já sou Assinante (Acessar INHO)</span>
              </a>
            </div>
          </div>

          {/* Lado Direito: Card Resumo dos 3 Planos */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="font-mono text-xs uppercase tracking-wider text-slate-400 font-bold">Grade Oficial de Preços</span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                  ECONOMIZE 17% NO ANUAL
                </span>
              </div>

              {/* Plano 1 */}
              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40 hover:border-cyan-500/50 transition-all flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>INHO Essencial</span>
                  </div>
                  <div className="text-[11px] text-slate-400">PMEs, Serviços • Até 3 operadores</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-extrabold text-cyan-300">R$ 290<span className="text-[10px] text-slate-400 font-normal">/mês</span></div>
                  <div className="text-[10px] text-emerald-400 font-mono">ou R$ 2.900/ano</div>
                </div>
              </div>

              {/* Plano 2 */}
              <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/40 hover:border-purple-400 transition-all flex items-center justify-between shadow-[0_0_15px_rgba(168,85,247,0.15)] relative">
                <div className="absolute -top-2 right-3 text-[9px] font-extrabold uppercase tracking-widest bg-purple-600 text-white px-2 py-0.2 rounded-full">
                  Mais Popular
                </div>
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>INHO Pro + OrBrick-IA</span>
                  </div>
                  <div className="text-[11px] text-slate-400">Mercados, Clínicas • 8 ops + Maquininha</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-extrabold text-purple-300">R$ 590<span className="text-[10px] text-slate-400 font-normal">/mês</span></div>
                  <div className="text-[10px] text-emerald-400 font-mono">ou R$ 5.900/ano</div>
                </div>
              </div>

              {/* Plano 3 */}
              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 hover:border-amber-400 transition-all flex items-center justify-between shadow-[0_0_15px_rgba(245,158,11,0.15)] relative">
                <div className="absolute -top-2 right-3 text-[9px] font-extrabold uppercase tracking-widest bg-amber-500 text-slate-950 font-black px-2 py-0.2 rounded-full">
                  Padrão Ouro
                </div>
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>Cooperativa &amp; Enterprise</span>
                  </div>
                  <div className="text-[11px] text-slate-400">Cooperativas BACEN • 25 operadores</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-extrabold text-amber-300">R$ 990<span className="text-[10px] text-slate-400 font-normal">/mês</span></div>
                  <div className="text-[10px] text-emerald-400 font-mono">ou R$ 9.900/ano</div>
                </div>
              </div>

              {/* Link Direto */}
              <Link
                href="/assinar"
                className="w-full py-2.5 text-center text-xs font-bold text-cyan-400 hover:text-cyan-300 hover:underline flex items-center justify-center gap-1 pt-1"
              >
                <span>Comparar todos os recursos e assinar com Stripe</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
