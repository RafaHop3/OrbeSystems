'use strict';
import Link from 'next/link';
import { Briefcase, Building, Key, ArrowRight } from 'lucide-react';

export default function InhoPromo() {
    return (
        <section className="relative w-full py-20 px-6 border-b border-[#00f2fe]/30 bg-black overflow-hidden group">
            {/* Background Cyberpunk FX */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 left-0 w-1/3 h-full bg-gradient-to-r from-[#8b5cf6]/10 to-transparent pointer-events-none" />
                <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto flex flex-col lg:flex-row-reverse items-center justify-between gap-12">

                {/* Left Typography (Reversed so it alternates with Ghost Engine) */}
                <div className="lg:w-1/2 space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 rounded-full text-[10px] text-[#a78bfa] uppercase font-bold tracking-widest animate-pulse">
                        <Key size={14} /> Somente Premium
                    </div>

                    <h2 className="text-4xl md:text-5xl font-bold font-grotesk text-white leading-tight">
                        Gestão Empresarial Global de Elite com<br />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#a78bfa] to-purple-500">
                            Orbe INHO
                        </span>
                    </h2>

                    <p className="text-slate-400 font-sans leading-relaxed text-lg max-w-xl">
                        Nossa mais avançada plataforma de Administração Multipropósito. Um ERP ultra-privado que pode revolucionar desde PCO's Corporativas até o controle de vendas da sua Holding.
                        <strong> O INHO permite mapear até 3 empresas isoladas com segurança criptográfica para assinantes Premium.</strong>
                    </p>

                    <div className="flex gap-4 pt-4">
                        <Link
                            href="/assinar"
                            className="inline-flex items-center gap-3 bg-[#8b5cf6] hover:bg-white text-white hover:text-black font-bold uppercase tracking-widest text-sm px-8 py-4 transition-all duration-300 shadow-[0_0_20px_rgba(139,92,246,0.4)]"
                        >
                            Adesão Premium <ArrowRight size={18} />
                        </Link>
                    </div>
                </div>

                {/* Right Interactive Info */}
                <div className="lg:w-1/2 relative flex justify-start">
                    <div className="absolute -inset-4 bg-gradient-to-l from-purple-500/20 to-[#8b5cf6]/20 blur-2xl rounded-full z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                    <div className="relative z-10 w-full max-w-md flex flex-col gap-4">

                        {/* Passo 1 */}
                        <div className="bg-black/60 backdrop-blur-xl border border-purple-500/30 rounded-xl p-4 flex items-center gap-4 hover:scale-105 transition-transform cursor-default ml-16">
                            <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                                <Building className="text-purple-400" size={24} />
                            </div>
                            <div>
                                <h3 className="font-grotesk font-bold text-white text-sm">Controle Multi-Empresas (Tenants)</h3>
                                <p className="text-xs text-slate-400 mt-1">Sua Ordem Global: Gira em um único banco de dados. Tenha 3 matrizes controladas.</p>
                            </div>
                        </div>

                        {/* Passo 2 */}
                        <div className="bg-black/60 backdrop-blur-xl border border-teal-500/30 rounded-xl p-4 flex items-center gap-4 hover:scale-105 transition-transform cursor-default ml-8 relative">
                            {/* Connect Line */}
                            <div className="absolute -top-4 left-6 w-0.5 h-4 bg-gradient-to-b from-purple-500/50 to-teal-500/50"></div>
                            <div className="w-12 h-12 rounded-full bg-teal-500/10 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(20,184,166,0.3)]">
                                <Briefcase className="text-teal-400 animate-pulse" size={24} />
                            </div>
                            <div>
                                <h3 className="font-grotesk font-bold text-white text-sm">ERP / PDV & Administração Total</h3>
                                <p className="text-xs text-slate-400 mt-1">Registros caixas isolados por Tenant, Relatórios de Clima e Vendas Seguras.</p>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </section>
    );
}
