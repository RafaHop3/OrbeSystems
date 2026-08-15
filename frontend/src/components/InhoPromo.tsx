'use strict';
import Link from 'next/link';
import { Briefcase, Building2, Key, ArrowRight, QrCode, ShieldCheck, Zap } from 'lucide-react';

export default function InhoPromo() {
    const inhoUrl = process.env.NEXT_PUBLIC_INHO_URL || 'https://inho.orbesystems.com.br';

    return (
        <section className="relative w-full py-20 px-6 border-b border-[#8b5cf6]/30 bg-black overflow-hidden group">
            {/* Background Cyberpunk FX */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 left-0 w-1/3 h-full bg-gradient-to-r from-[#8b5cf6]/10 to-transparent pointer-events-none" />
                <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto flex flex-col lg:flex-row-reverse items-center justify-between gap-12">

                {/* Left Typography */}
                <div className="lg:w-1/2 space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 rounded-full text-[10px] text-[#a78bfa] uppercase font-bold tracking-widest animate-pulse">
                        <Key size={14} /> Somente Premium · Orbe SSO Hub
                    </div>

                    <h2 className="text-4xl md:text-5xl font-bold font-grotesk text-white leading-tight">
                        Gestão Empresarial & Cobranças com <br />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#a78bfa] via-purple-400 to-indigo-500">
                            Orbe INHO Business
                        </span>
                    </h2>

                    <p className="text-slate-400 font-sans leading-relaxed text-lg max-w-xl">
                        A plataforma definitiva de Administração Corporativa e Automação de Cobranças.
                        Gerencie até 3 empresas isoladas com segurança criptográfica, emissão de PIX instantâneo e notificações no WhatsApp.
                    </p>

                    <div className="flex flex-wrap gap-4 pt-4">
                        <a
                            href={`${inhoUrl}/login`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-3 bg-[#8b5cf6] hover:bg-white text-white hover:text-black font-bold uppercase tracking-widest text-sm px-8 py-4 transition-all duration-300 shadow-[0_0_25px_rgba(139,92,246,0.5)]"
                        >
                            Acessar INHO via Orbe SSO <ArrowRight size={18} />
                        </a>
                    </div>
                </div>

                {/* Right Interactive Visual Infographic */}
                <div className="lg:w-1/2 relative flex justify-start w-full">
                    <div className="absolute -inset-4 bg-gradient-to-l from-purple-500/20 to-[#8b5cf6]/20 blur-2xl rounded-full z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                    <div className="relative z-10 w-full max-w-md flex flex-col gap-4">

                        {/* Passo 1: Multi-Tenants */}
                        <div className="bg-black/60 backdrop-blur-xl border border-purple-500/30 rounded-xl p-4 flex items-center gap-4 hover:scale-105 transition-transform cursor-default ml-16">
                            <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                                <Building2 className="text-purple-400" size={24} />
                            </div>
                            <div>
                                <h3 className="font-grotesk font-bold text-white text-sm">1. Multi-Tenant Isolado</h3>
                                <p className="text-xs text-slate-400 mt-1">Até 3 matrizes/empresa com banco de dados segregado e seguro.</p>
                            </div>
                        </div>

                        {/* Passo 2: Cobranças & PIX */}
                        <div className="bg-black/60 backdrop-blur-xl border border-amber-500/30 rounded-xl p-4 flex items-center gap-4 hover:scale-105 transition-transform cursor-default ml-8 relative">
                            {/* Connect Line */}
                            <div className="absolute -top-4 left-6 w-0.5 h-4 bg-gradient-to-b from-purple-500/50 to-amber-500/50"></div>
                            <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                                <QrCode className="text-amber-400 animate-pulse" size={24} />
                            </div>
                            <div>
                                <h3 className="font-grotesk font-bold text-white text-sm">2. Cobranças PIX + WhatsApp</h3>
                                <p className="text-xs text-slate-400 mt-1">QR Code PIX instantâneo e lembretes automáticos em 1 clique.</p>
                            </div>
                        </div>

                        {/* Passo 3: PCO & DRE */}
                        <div className="bg-black/60 backdrop-blur-xl border border-emerald-500/40 rounded-xl p-4 flex items-center gap-4 hover:scale-105 transition-transform cursor-default relative">
                            {/* Connect Line */}
                            <div className="absolute -top-4 left-6 w-0.5 h-4 bg-gradient-to-b from-amber-500/50 to-emerald-500/50"></div>
                            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(16,185,129,0.5)]">
                                <ShieldCheck className="text-emerald-400" size={24} />
                            </div>
                            <div>
                                <h3 className="font-grotesk font-bold text-white text-sm">3. DRE Executivo & Auditoria</h3>
                                <p className="text-xs text-slate-400 mt-1">Fluxo de caixa inteligente, relatórios PCO e logs de auditoria.</p>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </section>
    );
}
