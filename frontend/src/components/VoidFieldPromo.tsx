"use client";
import React from 'react';
import Link from 'next/link';
import ToolVoidCanvas from '@/components/ToolVoidCanvas';

const METRICS = [
    { label: 'Criptografia de Chaves', value: 'MultiFernet KMS' },
    { label: 'Conformidade Legal', value: 'LGPD Art. 7º e 18º' },
    { label: 'Monitoramento', value: '24/7 Zero Trust' },
];

export default function VoidFieldPromo() {
    return (
        <section className="relative w-full py-24 flex items-center justify-center overflow-hidden bg-[#030305] border-y border-purple-500/10">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent"></div>

            <div className="container mx-auto px-6 relative z-10 grid lg:grid-cols-2 gap-12 items-center">

                {/* Lado esquerdo: conteúdo */}
                <div className="flex flex-col items-start max-w-xl text-left">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6 font-mono text-xs uppercase tracking-widest text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
                        SecDevOps e Privacidade · Zero Trust
                    </div>
                    <h2 className="text-4xl md:text-5xl font-tilt-neon font-bold tracking-tight text-white mb-6 leading-tight">
                        Telemetria Void <br />
                        <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-cyan-400 to-blue-400 drop-shadow-[0_0_25px_rgba(0,255,245,0.3)]">
                            &amp; Ghost Engine
                        </span>
                    </h2>
                    <p className="text-slate-300 text-lg font-light leading-relaxed mb-6">
                        Observabilidade em tempo real, auditoria SAST e adequação à LGPD. Automatize solicitações
                        de remoção de dados pessoais com o Ghost Engine e valide pipelines de código com
                        verificação formal.
                    </p>

                    <dl className="grid grid-cols-3 gap-3 w-full mb-8 p-3.5 rounded-xl bg-black/40 border border-purple-500/20">
                        {METRICS.map((m) => (
                            <div key={m.label}>
                                <dt className="text-[11px] text-slate-400">{m.label}</dt>
                                <dd className="text-xs sm:text-sm font-mono font-semibold text-white mt-0.5">{m.value}</dd>
                            </div>
                        ))}
                    </dl>

                    <Link href="/ghost-engine" className="relative group inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-purple-600/10 border border-purple-500/30 hover:bg-purple-600/20 hover:border-purple-500/50 transition-all duration-500 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <span className="text-sm font-semibold tracking-wide text-purple-200 relative z-10 uppercase">
                            Conhecer o Ghost Engine
                        </span>
                        <svg className="w-4 h-4 text-purple-300 relative z-10 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </Link>
                </div>

                {/* Lado direito: void do projeto (escudo Zero Trust + documento criptografado) */}
                <div className="relative w-full aspect-square md:aspect-video lg:aspect-square flex justify-center items-center rounded-[3rem] bg-[#08030c] border border-cyan-500/20 overflow-hidden shadow-[inset_0_0_80px_rgba(0,0,0,0.8),0_0_50px_rgba(0,255,245,0.1)] group">
                    <div className="absolute inset-0 bg-gradient-to-tr from-purple-900/20 via-transparent to-cyan-900/10 opacity-50 group-hover:opacity-100 transition-opacity duration-700 z-0"></div>

                    <div className="absolute inset-0 z-10">
                        <ToolVoidCanvas activeShape="lgpd-shield" accentColor="#a855f7" secondaryColor="#00fff5" />
                    </div>

                    {/* Cantos decorativos */}
                    <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-purple-500/50 z-30 opacity-70 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                    <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-purple-500/50 z-30 opacity-70 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                    <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-purple-500/50 z-30 opacity-70 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                    <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-purple-500/50 z-30 opacity-70 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

                    {/* Rótulos descritivos */}
                    <div aria-hidden="true" className="absolute top-6 right-8 text-[9px] font-mono text-purple-300/70 tracking-widest uppercase z-30 flex flex-col items-end gap-1 pointer-events-none">
                        <span>Escudo Zero Trust</span>
                        <span className="text-purple-400/50">Registro protegido · LGPD</span>
                    </div>
                    <div aria-hidden="true" className="absolute bottom-6 left-8 text-[9px] font-mono text-purple-300/70 tracking-widest uppercase flex items-center gap-2 z-30 pointer-events-none">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping"></span>
                        <span>Void // Escudo LGPD</span>
                    </div>
                </div>

            </div>

            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent"></div>
        </section>
    );
}
