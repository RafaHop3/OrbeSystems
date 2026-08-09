'use strict';
import Link from 'next/link';
import { Ghost, ShieldAlert, Cpu, ArrowRight } from 'lucide-react';

export default function GhostEnginePromo() {
    return (
        <section className="relative w-full py-20 px-6 border-y border-[#00f2fe]/30 bg-black overflow-hidden group">
            {/* Background Cyberpunk FX */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-[#00f2fe]/10 to-transparent pointer-events-none" />
                <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
                <div className="absolute inset-0 bg-[url('/matrix-rain.png')] opacity-5 mix-blend-overlay pointer-events-none" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-12">

                {/* Left Typography */}
                <div className="lg:w-1/2 space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#00f2fe]/10 border border-[#00f2fe]/30 rounded-full text-[10px] text-[#00f2fe] uppercase font-bold tracking-widest animate-pulse">
                        <Cpu size={14} /> Novo Lançamento v1.0
                    </div>

                    <h2 className="text-4xl md:text-5xl font-bold font-grotesk text-white leading-tight">
                        Desapareça da Internet com o <br />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#00f2fe] to-blue-500">
                            Orbe Ghost Engine
                        </span>
                    </h2>

                    <p className="text-slate-400 font-sans leading-relaxed text-lg max-w-xl">
                        Seus dados privados como CPF, Endereço e Processos estão sendo vendidos agora mesmo em sites públicos.
                        Nosso <strong>Sniper Algorítmico Custo-Zero</strong> invade bases como Escavador e Jusbrasil exigindo o seu "Direito de Esquecimento" via LGPD.
                    </p>

                    <div className="flex gap-4 pt-4">
                        <Link
                            href="/ferramentas-premium/databroker-optout"
                            className="inline-flex items-center gap-3 bg-[#00f2fe] hover:bg-white text-white hover:text-black font-bold uppercase tracking-widest text-sm px-8 py-4 transition-all duration-300 shadow-[0_0_20px_rgba(188,19,254,0.4)]"
                        >
                            Excluir Meus Dados <ArrowRight size={18} />
                        </Link>
                    </div>
                </div>

                {/* Right Dashboard Mockup Graphic */}
                <div className="lg:w-1/2 relative flex justify-end">
                    <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 to-[#00f2fe]/20 blur-2xl rounded-full z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                    <div className="relative z-10 bg-black/60 backdrop-blur-xl border border-slate-800 rounded-xl p-6 w-full max-w-md shadow-2xl transform hover:-translate-y-2 transition-transform duration-500">
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800/50">
                            <div className="flex items-center gap-3">
                                <Ghost className="text-[#00f2fe]" size={24} />
                                <span className="font-grotesk font-bold text-white tracking-wide">GHOST ENGINE V1</span>
                            </div>
                            <span className="px-2 py-1 bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] uppercase font-bold rounded">
                                Live Serverless
                            </span>
                        </div>

                        <div className="space-y-4 font-mono text-xs">
                            <div className="flex justify-between items-center bg-slate-900/50 p-3 rounded border border-slate-800">
                                <span className="text-slate-400">Targeting:</span>
                                <span className="text-white font-bold">Escavador.com</span>
                            </div>
                            <div className="flex justify-between items-center bg-slate-900/50 p-3 rounded border border-slate-800">
                                <span className="text-slate-400">Payload:</span>
                                <span className="text-blue-400 font-bold">LGPD Takedown Request</span>
                            </div>
                            <div className="flex justify-between items-center bg-slate-900/50 p-3 rounded border border-slate-800">
                                <span className="text-slate-400">Status Ação:</span>
                                <span className="text-green-400 font-bold flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> Automação em Anda.
                                </span>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-800 max-w-full">
                            <div className="flex items-center gap-2 text-slate-500 max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
                                <ShieldAlert size={12} className="shrink-0" />
                                <span className="truncate">Nenhum rastro humano detectado.</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </section>
    );
}
