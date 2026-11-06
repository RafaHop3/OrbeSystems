'use strict';
import Link from 'next/link';
import { Building2, Key, ArrowRight, QrCode, ShieldCheck, CreditCard, Receipt, Scale, Bot, Sparkles, TrendingUp, Clock } from 'lucide-react';
import ToolVoidPanel from '@/components/ToolVoidPanel';
import ProductMetrics from '@/components/ProductMetrics';

export default function InhoPromo() {
    const inhoUrl = 'https://inho.orbesystems.com.br';

    return (
        <section id="inho-promo" className="relative z-10 w-full py-24 px-6 border-b border-[#8b5cf6]/30 bg-transparent backdrop-blur-[2px] overflow-hidden group">
            {/* Background Cyberpunk FX */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 left-0 w-1/3 h-full bg-gradient-to-r from-[#8b5cf6]/10 to-transparent pointer-events-none" />
                <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto flex flex-col lg:flex-row-reverse items-center justify-between gap-12">

                {/* Left Typography - Campaign Value Proposition */}
                <div className="lg:w-1/2 space-y-6">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-purple-500/20 border border-emerald-500/40 rounded-full text-[11px] text-emerald-300 uppercase font-extrabold tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                        <Sparkles size={14} className="text-emerald-400" /> Mais Dinheiro no Caixa • Menos Trabalho Manual
                    </div>

                    <h2 className="text-4xl md:text-5xl font-bold font-tilt-neon text-white leading-tight mb-4">
                        O ERP com IA que faz sua empresa <br />
                        <span className="text-shimmer bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-[#00fff5]" style={{ textShadow: '0 0 25px rgba(16,185,129,0.6)' }}>
                            Faturar Mais e Trabalhar Menos
                        </span>
                    </h2>

                    <p className="text-slate-300 font-sans leading-relaxed text-base md:text-lg max-w-xl">
                        Chega de perder horas cobrando clientes no manual, fechando caixa na calculadora e brigando com sistemas lentos. O <strong>INHO ERP</strong> automatiza seu negócio de ponta a ponta:
                    </p>

                    {/* How It Gives Less Work & Generates More Money */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-emerald-500/30 flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                                <TrendingUp size={18} />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Como Você Ganha Mais</h4>
                                <p className="text-[12px] text-slate-300 mt-1 leading-snug">
                                    Régua WhatsApp com PIX em 1 clique recupera até <strong>65% dos atrasos</strong>. Maquininha Smart POS sem aluguel e cross-sell no PDV que turbinam seu faturamento diário.
                                </p>
                            </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-cyan-500/30 flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 shrink-0">
                                <Clock size={18} />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider">Como Você Trabalha Menos</h4>
                                <p className="text-[12px] text-slate-300 mt-1 leading-snug">
                                    Emissão automática de <strong>Notas Fiscais (NFS-e)</strong>, conferência cega de caixa com auditoria de quebra e <strong>Orbe AI ROOT (Alt+A)</strong> que treina seus funcionários.
                                </p>
                            </div>
                        </div>
                    </div>

                    <ProductMetrics metrics={[
                        { label: 'Maquininha Smart POS', value: 'Zero Aluguel' },
                        { label: 'Nota Fiscal NFS-e', value: 'Integrada 100%' },
                        { label: 'Orbe AI ROOT', value: 'Co-piloto Alt+A' },
                    ]} />

                    <div className="flex flex-wrap gap-4 pt-4">
                        <Link
                            href="/assinar"
                            className="inline-flex items-center gap-3 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:brightness-110 text-slate-950 font-black uppercase tracking-widest text-sm px-8 py-4 transition-all duration-300 shadow-[0_0_30px_rgba(16,185,129,0.5)] active:scale-95"
                        >
                            Ver Planos a partir de R$ 241/mês <ArrowRight size={18} />
                        </Link>
                        <a
                            href={`${inhoUrl}/login`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-3 bg-[#8b5cf6]/80 hover:bg-white text-white hover:text-black font-bold uppercase tracking-widest text-sm px-8 py-4 transition-all duration-300 shadow-[0_0_25px_rgba(139,92,246,0.5)]"
                        >
                            Entrar no Sistema (Login)
                        </a>
                        <a
                            href="#inho-manifesto"
                            className="inline-flex items-center gap-3 border border-[#8b5cf6]/50 text-[#c4b5fd] hover:bg-[#8b5cf6]/20 font-bold uppercase tracking-widest text-sm px-8 py-4 transition-all duration-300"
                        >
                            Conheça os Recursos
                        </a>
                    </div>
                    <p className="text-[11px] text-slate-400 max-w-xl">
                        🔒 Sem fidelidade abusiva: Ativação instantânea em 3 passos com cartão ou PIX, garantia de disponibilidade e conformidade total com a LGPD.
                    </p>
                </div>

                {/* Right Interactive Visual Infographic */}
                <div className="lg:w-1/2 relative flex justify-start w-full">
                    <div className="absolute -inset-4 bg-gradient-to-l from-emerald-500/20 to-[#8b5cf6]/20 blur-2xl rounded-full z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                    <div className="relative z-10 w-full max-w-md flex flex-col gap-3.5">
                        {/* Void do projeto: marcadores de QR Code PIX + barras DRE */}
                        <ToolVoidPanel shape="inho-pix-dre" accentColor="#10b981" secondaryColor="#00fff5" label="INHO // PDV + NOTA FISCAL + MAQUININHA" className="h-52 ml-6" />

                        {/* Bloco 1: Maquininhas Smart POS & PDV */}
                        <div className="bg-black/75 backdrop-blur-xl border border-emerald-500/40 rounded-xl p-3.5 flex items-center gap-3.5 hover:scale-102 transition-transform cursor-default ml-12 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                            <div className="w-11 h-11 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0 border border-emerald-500/30">
                                <CreditCard className="text-emerald-400" size={22} />
                            </div>
                            <div>
                                <h3 className="font-tilt-neon tracking-wide font-bold text-white text-xs uppercase" style={{ textShadow: '0 0 5px rgba(255,255,255,0.4)' }}>
                                    1. Maquininha Smart POS no PDV
                                </h3>
                                <p className="text-[11px] text-slate-300 mt-0.5">
                                    Conecte leitores Stripe Terminal (WisePOS E / S700) via Wi-Fi. Cobre por aproximação/chip e liquide direto na conta Caixa.
                                </p>
                            </div>
                        </div>

                        {/* Bloco 2: Emissão de Nota Fiscal & Balanças */}
                        <div className="bg-black/75 backdrop-blur-xl border border-cyan-500/40 rounded-xl p-3.5 flex items-center gap-3.5 hover:scale-102 transition-transform cursor-default ml-6 relative shadow-[0_0_20px_rgba(0,255,245,0.2)]">
                            <div className="w-11 h-11 rounded-lg bg-cyan-500/15 flex items-center justify-center shrink-0 border border-cyan-500/30">
                                <Receipt className="text-cyan-400" size={22} />
                            </div>
                            <div>
                                <h3 className="font-tilt-neon tracking-wide font-bold text-white text-xs uppercase" style={{ textShadow: '0 0 5px rgba(255,255,255,0.4)' }}>
                                    2. Emissor de Nota Fiscal &amp; Balança
                                </h3>
                                <p className="text-[11px] text-slate-300 mt-0.5">
                                    Emissão de NFS-e instantânea, decodificador de balanças pesáveis (EAN-13) e alçada Dual-Control (&gt; R$ 5.000).
                                </p>
                            </div>
                        </div>

                        {/* Bloco 3: Cobrança WhatsApp & Orbe AI ROOT */}
                        <div className="bg-black/75 backdrop-blur-xl border border-purple-500/40 rounded-xl p-3.5 flex items-center gap-3.5 hover:scale-102 transition-transform cursor-default relative shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                            <div className="w-11 h-11 rounded-lg bg-purple-500/15 flex items-center justify-center shrink-0 border border-purple-500/30">
                                <Bot className="text-purple-400 animate-pulse" size={22} />
                            </div>
                            <div>
                                <h3 className="font-tilt-neon tracking-wide font-bold text-white text-xs uppercase" style={{ textShadow: '0 0 5px rgba(255,255,255,0.4)' }}>
                                    3. Cobrança WhatsApp &amp; Orbe AI ROOT
                                </h3>
                                <p className="text-[11px] text-slate-300 mt-0.5">
                                    Régua automática D-3, D0, D+3 com Pix Copia e Cola, fechamento cego de caixa e suporte operacional 24/7 (Alt+A).
                                </p>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </section>
    );
}
