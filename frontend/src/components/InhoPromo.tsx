'use strict';
import Link from 'next/link';
import { Briefcase, Building2, Key, ArrowRight, QrCode, ShieldCheck, Zap } from 'lucide-react';
import ToolVoidPanel from '@/components/ToolVoidPanel';
import ProductMetrics from '@/components/ProductMetrics';

export default function InhoPromo() {
    const inhoUrl = 'https://inho.orbesystems.com.br';

    return (
        <section className="relative z-10 w-full py-20 px-6 border-b border-[#8b5cf6]/30 bg-transparent backdrop-blur-[2px] overflow-hidden group">
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

                    <h2 className="text-4xl md:text-5xl font-bold font-tilt-neon text-white leading-tight mb-4">
                        Gestão Empresarial & Cobranças com <br />
                        <span className="text-shimmer bg-clip-text text-transparent bg-gradient-to-r from-[#a78bfa] via-purple-400 to-[#00fff5]" style={{ textShadow: '0 0 20px rgba(167,139,250,0.5)' }}>
                            Orbe INHO Business
                        </span>
                    </h2>

                    <p className="text-slate-400 font-sans leading-relaxed text-lg max-w-xl">
                        Plataforma corporativa de gestão multiempresa e automação de cobranças.
                        Opere até 3 empresas com dados isolados, cobrança PIX dinâmica em 1 clique, conciliação por webhooks assinados (HMAC-SHA256), régua de cobrança no OrBrick WhatsApp e relatórios DRE executivos.
                    </p>

                    <ProductMetrics metrics={[
                        { label: 'Latência BI / DRE', value: '< 290 ms' },
                        { label: 'Isolamento de Dados', value: 'Multiempresa UUID' },
                        { label: 'Mensageria', value: 'OrBrick WhatsApp' },
                    ]} />

                    <div className="flex flex-wrap gap-4 pt-4">
                        <a
                            href={`${inhoUrl}/login`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-3 bg-[#8b5cf6] hover:bg-white text-white hover:text-black font-bold uppercase tracking-widest text-sm px-8 py-4 transition-all duration-300 shadow-[0_0_25px_rgba(139,92,246,0.5)]"
                        >
                            Acessar INHO via Orbe SSO <ArrowRight size={18} />
                        </a>
                        <a
                            href="/database-architecture"
                            className="inline-flex items-center gap-3 border border-[#8b5cf6]/50 text-[#c4b5fd] hover:bg-[#8b5cf6]/20 font-bold uppercase tracking-widest text-sm px-8 py-4 transition-all duration-300"
                        >
                            Arquitetura de Dados
                        </a>
                    </div>
                    <p className="text-[11px] text-slate-500 max-w-xl">Acesso restrito a contas provisionadas por assinatura ativa ou homologação administrativa. Não há cadastro público.</p>
                </div>

                {/* Right Interactive Visual Infographic */}
                <div className="lg:w-1/2 relative flex justify-start w-full">
                    <div className="absolute -inset-4 bg-gradient-to-l from-purple-500/20 to-[#8b5cf6]/20 blur-2xl rounded-full z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                    <div className="relative z-10 w-full max-w-md flex flex-col gap-4">
                        {/* Void do projeto: marcadores de QR Code PIX + barras DRE */}
                        <ToolVoidPanel shape="inho-pix-dre" accentColor="#00fff5" secondaryColor="#3b82f6" label="Void // INHO PIX + DRE" className="h-56 ml-8" />


                        {/* Passo 1: Multi-Tenants */}
                        <div className="bg-black/60 backdrop-blur-xl border border-purple-500/30 rounded-xl p-4 flex items-center gap-4 hover:scale-105 transition-transform cursor-default ml-16">
                            <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                                <Building2 className="text-purple-400" size={24} />
                            </div>
                            <div>
                                <h3 className="font-tilt-neon tracking-widest font-bold text-white text-sm" style={{ textShadow: '0 0 5px rgba(255,255,255,0.4)' }}>1. Multiempresa Isolado</h3>
                                <p className="text-xs text-slate-400 mt-1">Até 3 empresas com dados segregados por identificador único (UUID).</p>
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
                                <h3 className="font-tilt-neon tracking-widest font-bold text-white text-sm" style={{ textShadow: '0 0 5px rgba(255,255,255,0.4)' }}>2. Cobranças PIX + WhatsApp</h3>
                                <p className="text-xs text-slate-400 mt-1">Cobrança PIX e régua automática no OrBrick (D-3, D0 e D+3).</p>
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
                                <h3 className="font-tilt-neon tracking-widest font-bold text-white text-sm" style={{ textShadow: '0 0 5px rgba(255,255,255,0.4)' }}>3. DRE Executivo & Auditoria</h3>
                                <p className="text-xs text-slate-400 mt-1">Fluxo de caixa inteligente, relatórios PCO e logs de auditoria.</p>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </section>
    );
}
