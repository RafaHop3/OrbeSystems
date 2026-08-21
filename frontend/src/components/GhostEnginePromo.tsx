'use strict';
import Link from 'next/link';
import { Ghost, ShieldAlert, Cpu, ArrowRight } from 'lucide-react';
import { MagicCard } from '@/components/ui/magic-card';
import { AuroraText } from '@/components/ui/aurora-text';

export default function GhostEnginePromo() {
    return (
        <section className="relative w-full py-28 px-6 border-y border-[#00f2fe]/20 bg-[#050510] overflow-hidden group">
            {/* Background Cyberpunk FX */}
            <div className="absolute inset-0 z-0 overflow-hidden">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none" />
                <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/10 blur-[150px] rounded-full pointer-events-none" />
                {/* Flowing Grid lines */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,242,254,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,242,254,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-16">

                {/* Left Typography */}
                <div className="lg:w-1/2 space-y-8">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#00f2fe]/10 border border-[#00f2fe]/40 rounded-full text-xs text-[#00f2fe] uppercase font-bold tracking-widest animate-pulse shadow-[0_0_15px_rgba(0,242,254,0.2)]">
                        <Cpu size={16} /> Data Broker Eraser v2.0
                    </div>

                    <h2 className="text-4xl md:text-6xl font-bold font-grotesk text-white leading-tight">
                        Desapareça das Buscas com o <br />
                        <AuroraText text="Orbe Ghost Engine" className="mt-2" />
                    </h2>

                    <p className="text-slate-300 font-sans leading-relaxed text-lg max-w-xl">
                        Seus dados privados vulneráveis (CPF, Endereço e Processos) estão sendo comercializados em alta escala neste segundo.
                        Nosso <strong>Serviço Automatizado</strong> extrai seus rastros em sites como Escavador e Jusbrasil impondo seu "Direito de Esquecimento" via LGPD.
                    </p>

                    <div className="flex gap-4 pt-6">
                        <Link
                            href="/ferramentas-premium/databroker-optout"
                            className="group relative inline-flex items-center gap-3 bg-[#00f2fe]/10 hover:bg-[#00f2fe] text-[#00f2fe] hover:text-black border border-[#00f2fe] font-bold uppercase tracking-widest text-sm px-8 py-4 transition-all duration-500 overflow-hidden shadow-[0_0_20px_rgba(0,242,254,0.3)] hover:shadow-[0_0_40px_rgba(0,242,254,0.6)]"
                        >
                            <span className="absolute inset-0 w-full h-full -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent group-hover:transition-transform group-hover:duration-700 group-hover:translate-x-full"></span>
                            Impor LGPD Agora <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
                        </Link>
                    </div>
                </div>

                {/* Right Interactive Magic Cards */}
                <div className="lg:w-1/2 relative flex justify-end">
                    <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-3xl rounded-full z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 animate-pulse" />

                    <div className="relative z-10 w-full max-w-lg flex flex-col gap-6">
                        {/* Passo 1 */}
                        <MagicCard className="ml-0 hover:scale-105 transition-transform duration-300">
                            <div className="flex items-center gap-6">
                                <div className="w-14 h-14 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0 border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.4)]">
                                    <ShieldAlert className="text-red-400 group-hover:text-red-300 animate-pulse" size={28} />
                                </div>
                                <div>
                                    <h3 className="font-grotesk font-black tracking-wide text-white text-lg group-hover:text-red-400 transition-colors">1. Dados Expostos</h3>
                                    <p className="text-sm text-slate-400 mt-1">Seu nome, parentes e processos estão em sites de buscas expostos abertamente.</p>
                                </div>
                            </div>
                        </MagicCard>

                        {/* Passo 2 */}
                        <MagicCard className="ml-8 md:ml-12 hover:scale-105 transition-transform duration-300">
                            <div className="absolute -top-10 left-[2.2rem] w-[2px] h-10 bg-gradient-to-b from-red-500/50 to-blue-500/50 hidden md:block"></div>
                            <div className="flex items-center gap-6">
                                <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.4)]">
                                    <Ghost className="text-blue-400 group-hover:animate-bounce" size={28} />
                                </div>
                                <div>
                                    <h3 className="font-grotesk font-black tracking-wide text-white text-lg group-hover:text-blue-400 transition-colors">2. Machine Tracking</h3>
                                    <p className="text-sm text-slate-400 mt-1">Nossa IA Ghost Engine rastreia seu CPF varrendo a internet silenciosamente.</p>
                                </div>
                            </div>
                        </MagicCard>

                        {/* Passo 3 */}
                        <MagicCard className="ml-16 md:ml-24 hover:scale-105 transition-transform duration-300">
                            <div className="absolute -top-10 left-[2.2rem] w-[2px] h-10 bg-gradient-to-b from-blue-500/50 to-[#00f2fe]/50 hidden md:block"></div>
                            <div className="flex items-center gap-6">
                                <div className="w-14 h-14 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0 border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.4)]">
                                    <Cpu className="text-purple-400 group-hover:text-purple-300 animate-spin-slow" size={28} />
                                </div>
                                <div>
                                    <h3 className="font-grotesk font-black tracking-wide text-white text-lg group-hover:text-purple-400 transition-colors">3. Purgação em Massa</h3>
                                    <p className="text-sm text-slate-400 mt-1">Acionamos dezenas de notificações baseadas na LGPD, forçando a remoção legal.</p>
                                </div>
                            </div>
                        </MagicCard>
                    </div>
                </div>

            </div>
        </section>
    );
}
