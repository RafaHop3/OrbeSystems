import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { Ghost, ShieldAlert, Cpu, ArrowRight, Lock, Zap } from 'lucide-react';

export default function GhostEnginePage() {
    return (
        <main className="min-h-screen bg-black pt-16">
            <Header />
            
            <section className="relative w-full py-20 px-6 border-y border-[#00f2fe]/30 bg-black overflow-hidden">
                {/* Background Cyberpunk FX */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-[#00f2fe]/10 to-transparent pointer-events-none" />
                    <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
                </div>

                <div className="relative z-10 max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-12">
                    <div className="lg:w-1/2 space-y-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#00f2fe]/10 border border-[#00f2fe]/30 rounded-full text-[10px] text-[#00f2fe] uppercase font-bold tracking-widest animate-pulse">
                            <Cpu size={14} /> Ghost Engine v1.0
                        </div>

                        <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                            Desapareça da Internet com o <br />
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#00f2fe] to-blue-500">
                                Orbe Ghost Engine
                            </span>
                        </h1>

                        <p className="text-slate-400 font-sans leading-relaxed text-lg max-w-xl">
                            Seus dados privados como CPF, Endereço e Processos estão sendo vendidos agora mesmo em sites públicos.
                            Nosso <strong>Sniper Algorítmico Custo-Zero</strong> invade bases como Escavador e Jusbrasil exigindo o seu "Direito de Esquecimento" via LGPD.
                        </p>

                        <div className="flex gap-4 pt-4">
                            <Link
                                href="/ferramentas-premium/databroker-optout"
                                className="inline-flex items-center gap-3 bg-[#00f2fe] hover:bg-white text-white hover:text-black font-bold uppercase tracking-widest text-sm px-8 py-4 transition-all duration-300 shadow-[0_0_20px_rgba(188,19,254,0.4)]"
                            >
                                <Lock size={18} />
                                Excluir Meus Dados <ArrowRight size={18} />
                            </Link>
                        </div>
                    </div>

                    <div className="lg:w-1/2 relative flex justify-end">
                        <div className="relative z-10 w-full max-w-md flex flex-col gap-4">
                            <div className="bg-black/60 backdrop-blur-xl border border-red-500/30 rounded-xl p-4 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                                    <ShieldAlert className="text-red-500 animate-pulse" size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-sm">1. Seus Dados Expostos</h3>
                                    <p className="text-xs text-slate-400 mt-1">Seu nome, parentes e processos estão em sites de buscas abertos.</p>
                                </div>
                            </div>

                            <div className="bg-black/60 backdrop-blur-xl border border-blue-500/30 rounded-xl p-4 flex items-center gap-4 ml-8">
                                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                                    <Ghost className="text-blue-400 animate-bounce" size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-sm">2. Ghost Engine Localiza</h3>
                                    <p className="text-xs text-slate-400 mt-1">Nossa IA varre todos esses sites silenciosamente rastreando seus links.</p>
                                </div>
                            </div>

                            <div className="bg-black/60 backdrop-blur-xl border border-[#00f2fe]/40 rounded-xl p-4 flex items-center gap-4 ml-16">
                                <div className="w-12 h-12 rounded-full bg-[#00f2fe]/10 flex items-center justify-center shrink-0">
                                    <Cpu className="text-[#00f2fe]" size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-sm">3. Remoção Automática</h3>
                                    <p className="text-xs text-slate-400 mt-1">Disparamos procurações da LGPD para deletar seus perfis no mesmo dia.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="py-20 px-6">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-3xl font-bold text-white mb-8 text-center">Como Funciona</h2>
                    
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="bg-[#181310] border border-[#00f2fe]/20 rounded-lg p-6">
                            <Zap className="text-[#00f2fe] mb-4" size={32} />
                            <h3 className="text-white font-bold mb-2">Varredura Automática</h3>
                            <p className="text-slate-400 text-sm">Nossa IA busca seus dados em mais de 50 sites de dados públicos brasileiros.</p>
                        </div>
                        
                        <div className="bg-[#181310] border border-[#00f2fe]/20 rounded-lg p-6">
                            <Lock className="text-[#00f2fe] mb-4" size={32} />
                            <h3 className="text-white font-bold mb-2">Proteção Legal</h3>
                            <p className="text-slate-400 text-sm">Utilizamos a LGPD para exigir a remoção dos seus dados de forma legal e definitiva.</p>
                        </div>
                        
                        <div className="bg-[#181310] border border-[#00f2fe]/20 rounded-lg p-6">
                            <Ghost className="text-[#00f2fe] mb-4" size={32} />
                            <h3 className="text-white font-bold mb-2">Monitoramento Contínuo</h3>
                            <p className="text-slate-400 text-sm">Mantemos vigilância constante para impedir que seus dados reapareçam.</p>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </main>
    );
}
