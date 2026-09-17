'use client';
import Link from 'next/link';
import { Layers, Activity, Sparkles, Box, ArrowRight } from 'lucide-react';
import { MagicCard } from '@/components/ui/magic-card';
import { AuroraText } from '@/components/ui/aurora-text';

export default function OrbeStudioPromo() {
    return (
        <section className="relative z-10 w-full py-28 px-6 border-b border-yellow-500/20 bg-transparent overflow-hidden group">
            {/* Background Cyberpunk FX */}
            <div className="absolute inset-0 z-0 overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-yellow-500/5 blur-[150px] rounded-full pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-1/3 h-full bg-gradient-to-l from-orange-500/10 to-transparent pointer-events-none" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-16">

                {/* Left Typography */}
                <div className="lg:w-1/2 space-y-8">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-yellow-500/10 border border-yellow-500/40 rounded-full text-xs text-yellow-500 uppercase font-bold tracking-widest animate-pulse shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                        <Sparkles size={16} /> WebGL Gen-Art (Beta Livre)
                    </div>

                    <h2 className="text-4xl md:text-6xl font-bold font-grotesk text-white leading-tight">
                        Crie visuais reativos com o <br />
                        <AuroraText text="Orbe Visual Studio" className="mt-2" />
                    </h2>

                    <p className="text-slate-300 font-sans leading-relaxed text-lg max-w-xl">
                        Nossa mais avançada engine de gráficos 3D no navegador. Conecte áudio em tempo real ou bata na interface do nosso sintetizador procedural e veja a mágica do Post-Processing cinematográfico modular responder no exato frame.
                    </p>

                    <div className="flex gap-4 pt-6">
                        <Link
                            href="/ferramentas-premium/orbe-visual-studio"
                            className="group relative inline-flex items-center gap-3 bg-yellow-500/10 hover:bg-yellow-500 text-yellow-400 hover:text-black border border-yellow-500 font-bold uppercase tracking-widest text-sm px-8 py-4 transition-all duration-500 overflow-hidden shadow-[0_0_20px_rgba(234,179,8,0.3)] hover:shadow-[0_0_40px_rgba(234,179,8,0.6)]"
                        >
                            <span className="absolute inset-0 w-full h-full -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent group-hover:transition-transform group-hover:duration-700 group-hover:translate-x-full"></span>
                            Acessar o Estúdio Gratuitamente <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
                        </Link>
                    </div>
                </div>

                {/* Right Interactive Magic Cards */}
                <div className="lg:w-1/2 relative flex justify-end">
                    <div className="absolute -inset-10 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 blur-3xl rounded-full z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 animate-pulse" />

                    <div className="relative z-10 w-full max-w-lg flex flex-col gap-6">
                        {/* Passo 1 */}
                        <MagicCard className="ml-0 hover:scale-110 transition-transform duration-500">
                            <div className="flex items-center gap-8">
                                <div className="relative w-24 h-24 rounded-2xl bg-orange-500/10 backdrop-blur-2xl flex items-center justify-center shrink-0 border border-orange-500/50 shadow-[0_0_40px_rgba(249,115,22,0.5)] group-hover:shadow-[0_0_100px_rgba(249,115,22,0.9)] group-hover:bg-orange-500/30 transition-all duration-500 overflow-hidden">
                                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-orange-600/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity animate-pulse-neon"></div>
                                    <Activity className="text-orange-400 group-hover:text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] transition-all duration-500 transform group-hover:scale-[1.3] group-hover:rotate-[15deg] relative z-10" size={44} />
                                </div>
                                <div>
                                    <h3 className="font-grotesk font-black tracking-wide text-white text-2xl group-hover:text-orange-400 drop-shadow-[0_0_10px_rgba(249,115,22,0.5)] transition-colors">1. Motor de Áudio Reativo</h3>
                                    <p className="text-base text-slate-300 mt-2 leading-relaxed">Picos transitórios analíticos, FFT real e um teclado algorítmico completo no VDOM.</p>
                                </div>
                            </div>
                        </MagicCard>

                        {/* Passo 2 */}
                        <MagicCard className="ml-8 md:ml-12 hover:scale-110 transition-transform duration-500">
                            <div className="absolute -top-10 left-[4.8rem] w-[3px] h-10 bg-gradient-to-b from-orange-500/50 to-blue-500/50 hidden md:block"></div>
                            <div className="flex items-center gap-8">
                                <div className="relative w-24 h-24 rounded-2xl bg-blue-500/10 backdrop-blur-2xl flex items-center justify-center shrink-0 border border-blue-500/50 shadow-[0_0_40px_rgba(59,130,246,0.5)] group-hover:shadow-[0_0_100px_rgba(59,130,246,0.9)] group-hover:bg-blue-500/30 transition-all duration-500 overflow-hidden">
                                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-600/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity animate-pulse-neon"></div>
                                    <Layers className="text-blue-400 group-hover:text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] transition-all duration-500 transform group-hover:scale-[1.3] group-hover:-translate-y-2 relative z-10" size={44} />
                                </div>
                                <div>
                                    <h3 className="font-grotesk font-black tracking-wide text-white text-2xl group-hover:text-blue-400 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-colors">2. Matriz Neural Modular</h3>
                                    <p className="text-base text-slate-300 mt-2 leading-relaxed">Conecte graves e médios a distorções visuais paramétricas de forma intuitiva.</p>
                                </div>
                            </div>
                        </MagicCard>

                        {/* Passo 3 */}
                        <MagicCard className="ml-16 md:ml-24 hover:scale-110 transition-transform duration-500">
                            <div className="absolute -top-10 left-[4.8rem] w-[3px] h-10 bg-gradient-to-b from-blue-500/50 to-yellow-500/50 hidden md:block"></div>
                            <div className="flex items-center gap-8">
                                <div className="relative w-24 h-24 rounded-2xl bg-yellow-500/10 backdrop-blur-2xl flex items-center justify-center shrink-0 border border-yellow-500/50 shadow-[0_0_40px_rgba(234,179,8,0.5)] group-hover:shadow-[0_0_100px_rgba(234,179,8,0.9)] group-hover:bg-yellow-500/30 transition-all duration-500 overflow-hidden">
                                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-tl from-yellow-600/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity animate-spin-slow"></div>
                                    <Box className="text-yellow-400 group-hover:text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] transition-all duration-500 transform group-hover:scale-[1.3] group-hover:rotate-180 relative z-10" size={44} />
                                </div>
                                <div>
                                    <h3 className="font-grotesk font-black tracking-wide text-white text-2xl group-hover:text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)] transition-colors">3. Mesh & Cyberpunk FX</h3>
                                    <p className="text-base text-slate-300 mt-2 leading-relaxed">Efeitos Pós-Render avançados. Unreal Bloom, Glitch, Ascii e Partículas Instanciadas.</p>
                                </div>
                            </div>
                        </MagicCard>
                    </div>
                </div>

            </div>
        </section>
    );
}
