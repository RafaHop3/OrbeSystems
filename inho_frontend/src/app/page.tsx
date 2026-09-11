'use client';
import React from 'react';
import Sidebar from '@/components/Sidebar';
import { Users, Building, ArrowRight, Store, Home, LogOut } from 'lucide-react';
import Link from 'next/link';

export default function AppLayout() {
  return (
    <div className="flex h-screen bg-[#06080A] text-[#e6edf3] font-mono selection:bg-teal-500/30 overflow-hidden relative">
      <Sidebar />

      {/* Viewport content */}
      <main className="flex-1 flex flex-col h-full bg-[#030406] shadow-[-10px_0_30px_rgba(0,0,0,0.5)] z-10 relative overflow-hidden p-10 lg:p-16">

        {/* Background glow just for aesthetic */}
        <div className="absolute top-[-20%] left-[20%] w-[500px] h-[500px] bg-teal-900/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-[1100px] z-10 relative mt-4">
          <h1 className="text-3xl md:text-[34px] font-bold text-white mb-6">
            Hub de <span className="text-teal-400">Modelos de Negócios</span>
          </h1>
          <p className="text-[#8b949e] font-mono text-sm max-w-2xl mb-12 leading-relaxed">
            O Portal INHO é adaptável. Selecione o modelo de negócio abaixo para operar a interface e as lógicas de negócio específicas da sua instituição.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* Cooperativismo Card */}
            <div className="group relative rounded-2xl bg-[#0A1820] border border-teal-500/30 p-8 flex flex-col justify-between overflow-hidden shadow-[0_0_25px_rgba(20,184,166,0.05)] hover:shadow-[0_0_35px_rgba(20,184,166,0.15)] transition-all h-[280px]">
              <Users className="absolute -right-6 -bottom-6 w-56 h-56 text-teal-900/20 transform group-hover:scale-105 transition-transform duration-500" />

              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 rounded-xl bg-[#0F222D] border border-teal-500/40 flex items-center justify-center">
                    <Users className="text-teal-400" size={20} />
                  </div>
                  <span className="bg-[#0F222D] border border-teal-500/30 text-teal-400 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                    DISPONÍVEL
                  </span>
                </div>

                <h2 className="text-2xl font-bold text-white mb-2">Cooperativismo</h2>
                <p className="text-[#6e7681] text-sm leading-relaxed max-w-sm">
                  Gestão completa para Cooperativas com módulos B2B e B2C integrados.
                </p>
              </div>

              <div className="relative z-10 mt-auto pt-6">
                <Link
                  href="/socios"
                  className="text-teal-400 text-sm font-bold uppercase tracking-wider flex items-center gap-2 hover:text-teal-300 transition-colors cursor-pointer"
                >
                  ACESSAR MÓDULO <ArrowRight size={16} />
                </Link>
              </div>
            </div>

            {/* Redes de Hotelaria Card */}
            <div className="relative rounded-2xl bg-[#0A0D12] border border-[#1a1f26] p-8 flex flex-col justify-between overflow-hidden opacity-90 h-[280px]">
              <Building className="absolute -right-6 -bottom-6 w-56 h-56 text-[#1a1f26] opacity-30" />

              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 rounded-xl bg-[#12161c] border border-[#1a1f26] flex items-center justify-center">
                    <Building className="text-[#6e7681]" size={20} />
                  </div>
                  <span className="bg-[#12161c] border border-[#1a1f26] text-[#6e7681] text-xs font-bold px-3 py-1 rounded-full flex items-center gap-2">
                    <LogOut size={12} className="rotate-180" />
                    EM BREVE
                  </span>
                </div>

                <h2 className="text-2xl font-bold text-[#b3b9c5] mb-2">Redes de Hotelaria</h2>
                <p className="text-[#6e7681] text-sm leading-relaxed max-w-sm">
                  Módulo unificado para controle de hospedagem, consumo e gestão tarifária.
                </p>
              </div>

              <div className="relative z-10 mt-auto pt-6">
                <span className="text-[#6e7681] text-sm font-bold uppercase tracking-wider">
                  INDISPONÍVEL
                </span>
              </div>
            </div>

            {/* Varejo Card (Placeholder) */}
            <div className="relative rounded-2xl bg-[#0A0D12] border border-[#1a1f26] p-8 flex flex-col justify-between overflow-hidden opacity-50 h-[280px]">
              <Store className="absolute -right-6 -bottom-6 w-56 h-56 text-[#1a1f26] opacity-30" />

              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 rounded-xl bg-[#12161c] border border-[#1a1f26] flex items-center justify-center">
                    <Store className="text-[#6e7681]" size={20} />
                  </div>
                  <span className="bg-[#12161c] border border-[#1a1f26] text-[#6e7681] text-xs font-bold px-3 py-1 rounded-full flex items-center gap-2">
                    <LogOut size={12} className="rotate-180" />
                    EM BREVE
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-[#b3b9c5] mb-2">Varejo & PDV</h2>
              </div>
            </div>

            {/* Real Estate Card (Placeholder) */}
            <div className="relative rounded-2xl bg-[#0A0D12] border border-[#1a1f26] p-8 flex flex-col justify-between overflow-hidden opacity-50 h-[280px]">
              <Home className="absolute -right-6 -bottom-6 w-56 h-56 text-[#1a1f26] opacity-30" />

              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 rounded-xl bg-[#12161c] border border-[#1a1f26] flex items-center justify-center">
                    <Home className="text-[#6e7681]" size={20} />
                  </div>
                  <span className="bg-[#12161c] border border-[#1a1f26] text-[#6e7681] text-xs font-bold px-3 py-1 rounded-full flex items-center gap-2">
                    <LogOut size={12} className="rotate-180" />
                    EM BREVE
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-[#b3b9c5] mb-2">Imobiliárias (Imobverse)</h2>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
