import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { Ghost, ShieldAlert, Cpu, ArrowRight, Lock, Zap, Mail, Globe, Database, CheckCircle2 } from 'lucide-react';
import brokersData from '@/data/ghost_brokers.json';

export default function GhostEnginePage() {
    return (
        <main className="min-h-screen bg-[#030508] pt-16 selection:bg-[#00fff5] selection:text-black">
            <Header />

            <section className="relative w-full py-20 px-6 border-y border-[#00fff5]/20 bg-gradient-to-b from-black via-[#030508] to-[#040810] overflow-hidden">
                {/* Background Cyberpunk FX */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-[#00fff5]/10 to-transparent pointer-events-none" />
                    <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 blur-[140px] rounded-full pointer-events-none" />
                </div>

                <div className="relative z-10 max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-12">
                    <div className="lg:w-1/2 space-y-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#00fff5]/10 border border-[#00fff5]/30 rounded-full text-[10px] text-[#00fff5] uppercase font-bold tracking-widest animate-pulse">
                            <Cpu size={14} /> GHOST ENGINE v2.0 // 54 ALVOS HOMOLOGADOS
                        </div>

                        <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight font-sans tracking-tight">
                            Desapareça da Internet com o <br />
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#00fff5] via-sky-400 to-emerald-400">
                                Orbe Ghost Engine
                            </span>
                        </h1>

                        <p className="text-slate-300 font-sans leading-relaxed text-base max-w-xl">
                            Seu CPF, telefone, endereço e processos estão indexados e sendo comercializados por dezenas de bureaus e raspadores. O <strong className="text-white">Ghost Engine</strong> executa uma arquitetura híbrida de desindexação em <strong className="text-[#00fff5]">{brokersData.length} Data Brokers</strong> com provas em hash SHA-256 e amparo no <strong className="text-emerald-400">Art. 18 da LGPD</strong>.
                        </p>

                        <div className="flex flex-wrap gap-4 pt-4">
                            <Link
                                href="/ferramentas-premium/databroker-optout"
                                className="inline-flex items-center gap-3 bg-gradient-to-r from-[#00fff5] to-sky-500 text-black font-extrabold uppercase tracking-wider text-sm px-8 py-4 rounded-xl transition-all duration-300 shadow-[0_0_25px_rgba(0,255,245,0.3)] hover:scale-[1.02] hover:brightness-110"
                            >
                                <Lock size={18} />
                                Acessar Painel 50+ Brokers <ArrowRight size={18} />
                            </Link>

                            <a
                                href="#arquitetura"
                                className="inline-flex items-center gap-2 px-6 py-4 rounded-xl text-sm font-bold text-slate-300 border border-slate-700 bg-slate-900/40 hover:border-[#00fff5] hover:text-[#00fff5] transition-colors"
                            >
                                Ver Arquitetura 3 Vetores
                            </a>
                        </div>
                    </div>

                    <div className="lg:w-1/2 relative flex justify-end">
                        <div className="relative z-10 w-full max-w-md flex flex-col gap-4">
                            <div className="bg-slate-950/80 backdrop-blur-xl border border-red-500/30 rounded-2xl p-4 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                                    <ShieldAlert className="text-red-400 animate-pulse" size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-sm">1. 54 Brokers Monitorados</h3>
                                    <p className="text-xs text-slate-400 mt-1">Bureaus de crédito, agregadores de CNPJ e diretórios OSINT mapeados.</p>
                                </div>
                            </div>

                            <div className="bg-slate-950/80 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-4 flex items-center gap-4 ml-6">
                                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                                    <Ghost className="text-[#00fff5] animate-pulse" size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-sm">2. Notificações Formais DPO</h3>
                                    <p className="text-xs text-slate-400 mt-1">Disparos jurídicos Art. 18 com SPF/DKIM oficial de orbesystems.com.br.</p>
                                </div>
                            </div>

                            <div className="bg-slate-950/80 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-4 ml-12">
                                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                                    <CheckCircle2 className="text-emerald-400" size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-sm">3. Prova Criptográfica SHA-256</h3>
                                    <p className="text-xs text-slate-400 mt-1">Cada requisição gera um protocolo no Livro Razão Zero-Knowledge.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── 3 Vetores de Ataque / Desindexação ────────────────────────────── */}
            <section id="arquitetura" className="py-24 px-6 max-w-7xl mx-auto">
                <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
                    <span className="text-xs font-mono uppercase tracking-widest text-[#00fff5]">
                        ARQUITETURA DE PRODUÇÃO
                    </span>
                    <h2 className="text-3xl md:text-4xl font-extrabold text-white">
                        Os 3 Vetores de Desindexação Massiva
                    </h2>
                    <p className="text-slate-400 text-sm">
                        Data brokers não funcionam apenas com formulários simples. O Ghost Engine segmenta os 54 alvos pela abordagem ótima de execução técnica e jurídica:
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    <div className="bg-slate-950/70 border border-emerald-500/30 rounded-2xl p-6 flex flex-col justify-between hover:border-emerald-500/60 transition-colors">
                        <div>
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-6">
                                <Mail className="text-emerald-400" size={26} />
                            </div>
                            <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                                VETOR 1 // 32 ALVOS (60%)
                            </span>
                            <h3 className="text-xl font-bold text-white mt-3 mb-2">DPO Legal Dispatch</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Notificação extrajudicial formal amparada nos incisos IV e VI do Art. 18 da LGPD, enviada diretamente aos Encarregados de Proteção de Dados com carimbo de tempo UTC e prazo legal de 15 dias.
                            </p>
                        </div>
                        <div className="pt-6 border-t border-slate-800/80 mt-6 text-xs text-slate-500">
                            Exemplos: Serasa, Casa dos Dados, Neoway, Quod, TeleListas.
                        </div>
                    </div>

                    <div className="bg-slate-950/70 border border-sky-500/30 rounded-2xl p-6 flex flex-col justify-between hover:border-sky-500/60 transition-colors">
                        <div>
                            <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center mb-6">
                                <Globe className="text-sky-400" size={26} />
                            </div>
                            <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded bg-sky-950/60 text-sky-400 border border-sky-500/30">
                                VETOR 2 // 21 ALVOS (35%)
                            </span>
                            <h3 className="text-xl font-bold text-white mt-3 mb-2">Playwright Stealth DOM</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Robôs em navegadores Chromium headless com fingerprints residenciais isolados que navegam nos portais de privacidade, preenchem os formulários e gravam hashes visuais de comprovação.
                            </p>
                        </div>
                        <div className="pt-6 border-t border-slate-800/80 mt-6 text-xs text-slate-500">
                            Exemplos: Jusbrasil, Escavador, Apollo.io, Lusha, Truecaller.
                        </div>
                    </div>

                    <div className="bg-slate-950/70 border border-purple-500/30 rounded-2xl p-6 flex flex-col justify-between hover:border-purple-500/60 transition-colors">
                        <div>
                            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-6">
                                <Database className="text-purple-400" size={26} />
                            </div>
                            <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded bg-purple-950/60 text-purple-400 border border-purple-500/30">
                                VETOR 3 // REPUTAÇÃO E CACHE
                            </span>
                            <h3 className="text-xl font-bold text-white mt-3 mb-2">Search Cache De-indexing</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Solicitação de limpeza e expurgo de snippets de cache nos motores de busca (Google, Bing) para que links já deletados da fonte não continuem vazando em pesquisas públicas.
                            </p>
                        </div>
                        <div className="pt-6 border-t border-slate-800/80 mt-6 text-xs text-slate-500">
                            Integração com Google Search Console Removal API.
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </main>
    );
}
