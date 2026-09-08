'use strict';
import Link from 'next/link';
import { Shield, Sword, Crown, ArrowRight, Zap, Lock, Target } from 'lucide-react';
import { MagicCard } from '@/components/ui/magic-card';
import { AuroraText } from '@/components/ui/aurora-text';

export default function OrbeKnightPromo() {
    return (
        <section className="relative w-full py-28 px-6 border-y border-amber-500/20 bg-[#0a0a0f] overflow-hidden group">
            {/* Background Cyberpunk FX */}
            <div className="absolute inset-0 z-0 overflow-hidden">
                <div className="absolute top-0 left-0 w-1/3 h-full bg-gradient-to-r from-amber-500/10 to-transparent pointer-events-none" />
                <div className="absolute top-1/2 right-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-600/10 blur-[150px] rounded-full pointer-events-none" />
                {/* Flowing Grid lines */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(251,191,36,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(251,191,36,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-16">

                {/* Left Typography */}
                <div className="lg:w-1/2 space-y-8">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 border border-amber-500/40 rounded-full text-xs text-amber-400 uppercase font-bold tracking-widest animate-pulse shadow-[0_0_15px_rgba(251,191,36,0.2)]">
                        <Crown size={16} /> Orbe Knight Security Suite
                    </div>

                    <h2 className="text-4xl md:text-6xl font-bold font-grotesk text-white leading-tight">
                        Proteção de Elite com o <br />
                        <AuroraText text="Orbe Knight" className="mt-2" />
                    </h2>

                    <p className="text-slate-300 font-sans leading-relaxed text-lg max-w-xl">
                        Sistema avançado de segurança cibernética com monitoramento em tempo real, 
                        análise de vulnerabilidades e resposta automatizada a ameaças. 
                        <strong>Defesa proativa</strong> para infraestruturas críticas.
                    </p>

                    <div className="flex gap-4 pt-6">
                        <Link
                            href="/ferramentas-premium/orbe-knight"
                            className="group relative inline-flex items-center gap-3 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-black border border-amber-500 font-bold uppercase tracking-widest text-sm px-8 py-4 transition-all duration-500 overflow-hidden shadow-[0_0_20px_rgba(251,191,36,0.3)] hover:shadow-[0_0_40px_rgba(251,191,36,0.6)]"
                        >
                            <span className="absolute inset-0 w-full h-full -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent group-hover:transition-transform group-hover:duration-700 group-hover:translate-x-full"></span>
                            Ativar Orbe Knight <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
                        </Link>
                    </div>
                </div>

                {/* Right Interactive Magic Cards */}
                <div className="lg:w-1/2 relative flex justify-end">
                    <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/20 to-orange-500/20 blur-3xl rounded-full z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 animate-pulse" />

                    <div className="relative z-10 w-full max-w-lg flex flex-col gap-6">
                        {/* Passo 1 */}
                        <MagicCard className="ml-0 hover:scale-110 transition-transform duration-500">
                            <div className="flex items-center gap-8">
                                <div className="relative w-24 h-24 rounded-2xl bg-red-500/10 backdrop-blur-2xl flex items-center justify-center shrink-0 border border-red-500/50 shadow-[0_0_40px_rgba(239,68,68,0.5)] group-hover:shadow-[0_0_100px_rgba(239,68,68,0.9)] group-hover:bg-red-500/30 transition-all duration-500 overflow-hidden">
                                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-red-600/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity animate-pulse-neon"></div>
                                    <Shield className="text-red-400 group-hover:text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] transition-all duration-500 transform group-hover:scale-[1.3] group-hover:rotate-[15deg] relative z-10" size={44} />
                                </div>
                                <div>
                                    <h3 className="font-grotesk font-black tracking-wide text-white text-2xl group-hover:text-red-400 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)] transition-colors">1. Monitoramento 24/7</h3>
                                    <p className="text-base text-slate-300 mt-2 leading-relaxed">Vigilância contínua de sua infraestrutura com detecção de anomalias em tempo real.</p>
                                </div>
                            </div>
                        </MagicCard>

                        {/* Passo 2 */}
                        <MagicCard className="ml-8 md:ml-12 hover:scale-110 transition-transform duration-500">
                            <div className="absolute -top-10 left-[4.8rem] w-[3px] h-10 bg-gradient-to-b from-red-500/50 to-amber-500/50 hidden md:block"></div>
                            <div className="flex items-center gap-8">
                                <div className="relative w-24 h-24 rounded-2xl bg-amber-500/10 backdrop-blur-2xl flex items-center justify-center shrink-0 border border-amber-500/50 shadow-[0_0_40px_rgba(251,191,36,0.5)] group-hover:shadow-[0_0_100px_rgba(251,191,36,0.9)] group-hover:bg-amber-500/30 transition-all duration-500 overflow-hidden">
                                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-600/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity animate-pulse-neon"></div>
                                    <Target className="text-amber-400 group-hover:text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] transition-all duration-500 transform group-hover:scale-[1.3] group-hover:-translate-y-2 relative z-10" size={44} />
                                </div>
                                <div>
                                    <h3 className="font-grotesk font-black tracking-wide text-white text-2xl group-hover:text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)] transition-colors">2. Análise de Vulnerabilidades</h3>
                                    <p className="text-base text-slate-300 mt-2 leading-relaxed">Scans automatizados identificando brechas de segurança antes que sejam exploradas.</p>
                                </div>
                            </div>
                        </MagicCard>

                        {/* Passo 3 */}
                        <MagicCard className="ml-16 md:ml-24 hover:scale-110 transition-transform duration-500">
                            <div className="absolute -top-10 left-[4.8rem] w-[3px] h-10 bg-gradient-to-b from-amber-500/50 to-orange-500/50 hidden md:block"></div>
                            <div className="flex items-center gap-8">
                                <div className="relative w-24 h-24 rounded-2xl bg-orange-500/10 backdrop-blur-2xl flex items-center justify-center shrink-0 border border-orange-500/50 shadow-[0_0_40px_rgba(249,115,22,0.5)] group-hover:shadow-[0_0_100px_rgba(249,115,22,0.9)] group-hover:bg-orange-500/30 transition-all duration-500 overflow-hidden">
                                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-tl from-orange-600/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity animate-spin-slow"></div>
                                    <Sword className="text-orange-400 group-hover:text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] transition-all duration-500 transform group-hover:scale-[1.3] group-hover:rotate-180 relative z-10" size={44} />
                                </div>
                                <div>
                                    <h3 className="font-grotesk font-black tracking-wide text-white text-2xl group-hover:text-orange-400 drop-shadow-[0_0_10px_rgba(249,115,22,0.5)] transition-colors">3. Resposta Automatizada</h3>
                                    <p className="text-base text-slate-300 mt-2 leading-relaxed">Neutralização automática de ameaças com IA e playbooks de resposta a incidentes.</p>
                                </div>
                            </div>
                        </MagicCard>
                    </div>
                </div>

            </div>
        </section>
    );
}
