'use strict';
import Link from 'next/link';
import { Ghost, ShieldAlert, Cpu, ArrowRight } from 'lucide-react';

// Ghost Engine Promo Component - Deploy fix

export default function GhostEnginePromo() {
    return (
        <section className="relative w-full py-20 px-6 border-y border-[#00f2fe]/30 bg-black overflow-hidden group">
            {/* Background Cyberpunk FX */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-[#00f2fe]/10 to-transparent pointer-events-none" />
                <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
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
                        Nosso <strong>Serviço Automatizado Integrado</strong> processa bases como Escavador e Jusbrasil exigindo o seu "Direito de Esquecimento" via LGPD.
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

                {/* Right Dashboard Mockup Graphic -> Changed to Explanatory Infographic for Laymen */}
                <div className="lg:w-1/2 relative flex justify-end">
                    <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 to-[#00f2fe]/20 blur-2xl rounded-full z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                    <div className="relative z-10 w-full max-w-md flex flex-col gap-4">
                        {/* Passo 1 */}
                        <div className="bg-black/60 backdrop-blur-xl border border-red-500/30 rounded-xl p-4 flex items-center gap-4 hover:scale-105 transition-transform cursor-default">
                            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                                <ShieldAlert className="text-red-500 animate-pulse" size={24} />
                            </div>
                            <div>
                                <h3 className="font-grotesk font-bold text-white text-sm">1. Seus Dados Expostos</h3>
                                <p className="text-xs text-slate-400 mt-1">Seu nome, parentes e processos estão em sites de buscas abertos.</p>
                            </div>
                        </div>

                        {/* Passo 2 */}
                        <div className="bg-black/60 backdrop-blur-xl border border-blue-500/30 rounded-xl p-4 flex items-center gap-4 hover:scale-105 transition-transform cursor-default ml-8 relative">
                            {/* Connect Line */}
                            <div className="absolute -top-4 left-6 w-0.5 h-4 bg-gradient-to-b from-red-500/50 to-blue-500/50"></div>
                            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                                <Ghost className="text-blue-400 animate-bounce" size={24} />
                            </div>
                            <div>
                                <h3 className="font-grotesk font-bold text-white text-sm">2. Ghost Engine Localiza</h3>
                                <p className="text-xs text-slate-400 mt-1">Nossa IA varre todos esses sites silenciosamente rastreando seus links.</p>
                            </div>
                        </div>

                        {/* Passo 3 */}
                        <div className="bg-black/60 backdrop-blur-xl border border-[#00f2fe]/40 rounded-xl p-4 flex items-center gap-4 hover:scale-105 transition-transform cursor-default ml-16 relative">
                            {/* Connect Line */}
                            <div className="absolute -top-4 left-6 w-0.5 h-4 bg-gradient-to-b from-blue-500/50 to-[#00f2fe]/50"></div>
                            <div className="w-12 h-12 rounded-full bg-[#00f2fe]/10 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(0,242,254,0.5)]">
                                <Cpu className="text-[#00f2fe]" size={24} />
                            </div>
                            <div>
                                <h3 className="font-grotesk font-bold text-white text-sm">3. Remoção Automática</h3>
                                <p className="text-xs text-slate-400 mt-1">Acionamos requisições da LGPD para auxiliar na deleção de perfis indesejados.</p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </section>
    );
}
