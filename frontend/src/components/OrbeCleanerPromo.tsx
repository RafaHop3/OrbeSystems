'use strict';
import Link from 'next/link';
import { HardDrive, ServerCrash, Cpu, ArrowRight, Zap, ShieldCheck } from 'lucide-react';

export default function OrbeCleanerPromo() {
    return (
        <section className="relative z-10 w-full py-20 px-6 border-b border-[#f97316]/30 bg-transparent backdrop-blur-[2px] overflow-hidden group">
            {/* Background Cyberpunk FX */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 left-0 w-1/3 h-full bg-gradient-to-r from-[#f97316]/10 to-transparent pointer-events-none" />
                <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 bg-orange-600/10 blur-[120px] rounded-full pointer-events-none" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto flex flex-col lg:flex-row-reverse items-center justify-between gap-12">

                {/* Left Typography */}
                <div className="lg:w-1/2 space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#f97316]/10 border border-[#f97316]/30 rounded-full text-[10px] text-orange-400 uppercase font-bold tracking-widest animate-pulse">
                        <HardDrive size={14} /> SysTool · Orbe Ecosystem
                    </div>

                    <h2 className="text-4xl md:text-5xl font-bold font-tilt-neon text-white leading-tight mb-4">
                        Limpeza Profunda e Tuning com <br />
                        <span className="text-shimmer bg-clip-text text-transparent bg-gradient-to-r from-orange-400 via-amber-400 to-[#00fff5]" style={{ textShadow: '0 0 20px rgba(249,115,22,0.5)' }}>
                            Orbe Cleaner V4
                        </span>
                    </h2>

                    <p className="text-slate-400 font-sans leading-relaxed text-lg max-w-xl">
                        A utilidade definitiva de Esterilização de Sistema.
                        Recupere de 30 a 60 Gigabytes de espaço limpando agressivamente caches ocultos, Windows Update, e lixos residuais do Next.js, Node e Python.
                    </p>

                    <div className="flex flex-wrap gap-4 pt-4">
                        <Link
                            href="/orbe-cleaner"
                            className="inline-flex items-center gap-3 bg-[#f97316] hover:bg-[#00fff5] text-white hover:text-black font-bold uppercase tracking-widest text-sm px-8 py-4 transition-all duration-300 shadow-[0_0_25px_rgba(249,115,22,0.5)]"
                        >
                            Baixar Orbe Cleaner <ArrowRight size={18} />
                        </Link>
                    </div>
                </div>

                {/* Right Interactive Visual Infographic */}
                <div className="lg:w-1/2 relative flex justify-start w-full">
                    <div className="absolute -inset-4 bg-gradient-to-l from-orange-500/20 to-amber-500/20 blur-2xl rounded-full z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                    <div className="relative z-10 w-full max-w-md flex flex-col gap-4">

                        {/* Passo 1: Limpeza */}
                        <div className="bg-black/60 backdrop-blur-xl border border-orange-500/30 rounded-xl p-4 flex items-center gap-4 hover:scale-105 transition-transform cursor-default ml-16">
                            <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(249,115,22,0.3)]">
                                <ServerCrash className="text-orange-400" size={24} />
                            </div>
                            <div>
                                <h3 className="font-tilt-neon tracking-widest font-bold text-white text-sm" style={{ textShadow: '0 0 5px rgba(255,255,255,0.4)' }}>1. Esterilização Agressiva</h3>
                                <p className="text-xs text-slate-400 mt-1">Dumps invisíveis, Caches abandonados de npm e WinSxS purgados.</p>
                            </div>
                        </div>

                        {/* Passo 2: Tuning */}
                        <div className="bg-black/60 backdrop-blur-xl border border-cyan-500/30 rounded-xl p-4 flex items-center gap-4 hover:scale-105 transition-transform cursor-default ml-8 relative">
                            {/* Connect Line */}
                            <div className="absolute -top-4 left-6 w-0.5 h-4 bg-gradient-to-b from-orange-500/50 to-cyan-500/50"></div>
                            <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(0,255,245,0.3)]">
                                <Zap className="text-cyan-400 animate-pulse" size={24} />
                            </div>
                            <div>
                                <h3 className="font-tilt-neon tracking-widest font-bold text-white text-sm" style={{ textShadow: '0 0 5px rgba(255,255,255,0.4)' }}>2. Windows Optimization</h3>
                                <p className="text-xs text-slate-400 mt-1">Hibernação desativada, CleanMgr silencioso e Winsock resetados.</p>
                            </div>
                        </div>

                        {/* Passo 3: Segurança */}
                        <div className="bg-black/60 backdrop-blur-xl border border-emerald-500/40 rounded-xl p-4 flex items-center gap-4 hover:scale-105 transition-transform cursor-default relative">
                            {/* Connect Line */}
                            <div className="absolute -top-4 left-6 w-0.5 h-4 bg-gradient-to-b from-cyan-500/50 to-emerald-500/50"></div>
                            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(16,185,129,0.5)]">
                                <ShieldCheck className="text-emerald-400" size={24} />
                            </div>
                            <div>
                                <h3 className="font-tilt-neon tracking-widest font-bold text-white text-sm" style={{ textShadow: '0 0 5px rgba(255,255,255,0.4)' }}>3. Execução Controlada UI</h3>
                                <p className="text-xs text-slate-400 mt-1">Controle total via linha de comando sem instalar nenhum app suspeito.</p>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </section>
    );
}
