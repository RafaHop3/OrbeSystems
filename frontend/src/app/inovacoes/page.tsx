'use client';

import React, { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { 
  ShieldCheck, 
  Cpu, 
  Terminal, 
  Database, 
  LineChart, 
  Binary, 
  ChevronRight, 
  Atom, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';

export default function InovacoesPage() {
  const [activeTab, setActiveTab] = useState<'imortal' | 'infra'>('imortal');

  return (
    <main className="min-h-screen bg-[#07040d] text-gray-100 selection:bg-cyan-500 selection:text-black">
      {/* Background Matrix/Nebula Glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[300px] h-[300px] bg-pink-500/5 rounded-full blur-[80px] pointer-events-none" />

      <Header />

      {/* Hero Header */}
      <section className="relative pt-24 pb-16 px-4 max-w-6xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-purple-500/30 bg-purple-500/5 text-purple-300 text-xs font-mono font-bold tracking-wider mb-6 animate-pulse uppercase">
          <Atom size={12} className="text-pink-400" /> Engenharia Científica & Formal
        </div>
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white mb-6 leading-none">
          Nossas <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-500 bg-clip-text text-transparent">Inovações Tecnológicas</span>
        </h1>
        <p className="text-sm sm:text-lg text-gray-400 max-w-3xl mx-auto leading-relaxed font-light">
          A Orbe Systems opera na fronteira da computação científica e do design premium. Veja como integramos provas matemáticas de hardware, compiladores de linguagem natural e infraestrutura de custo zero.
        </p>
      </section>

      {/* Segment Selector Tab system */}
      <section className="max-w-4xl mx-auto px-4 mb-16">
        <div className="flex bg-black/40 border border-white/5 p-1.5 rounded-2xl gap-2">
          <button
            onClick={() => setActiveTab('imortal')}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all duration-300 ${
              activeTab === 'imortal'
                ? 'bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border border-cyan-500/30 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.15)]'
                : 'border border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5'
            }`}
          >
            <ShieldCheck size={16} /> IMORTAL Premium
          </button>
          <button
            onClick={() => setActiveTab('infra')}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all duration-300 ${
              activeTab === 'infra'
                ? 'bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border border-cyan-500/30 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.15)]'
                : 'border border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5'
            }`}
          >
            <Database size={16} /> Infra & Performance
          </button>
        </div>
      </section>

      {/* Tab Panels */}
      <section className="max-w-6xl mx-auto px-4 pb-24">
        {/* PANEL 1: IMORTAL */}
        {activeTab === 'imortal' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Visual simulation block */}
            <div className="lg:col-span-5 bg-black/50 border border-white/5 rounded-3xl p-6 relative overflow-hidden backdrop-blur-md">
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl" />
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4 font-mono text-[10px] text-gray-400">
                <span className="flex items-center gap-1.5"><Binary size={10} className="text-cyan-400" /> prover_engine.py</span>
                <span className="text-emerald-400">STATUS: SATISFIABLE</span>
              </div>
              <div className="space-y-3 font-mono text-xs text-gray-300">
                <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                  <span className="text-purple-400"># Z3 Prover Setup</span><br />
                  <span className="text-blue-400">from</span> z3 <span className="text-blue-400">import</span> *<br />
                  s = Solver()<br />
                  temp = Int(<span className="text-yellow-300">'temp'</span>)<br />
                  valvula = Bool(<span className="text-yellow-300">'valvula'</span>)
                </div>
                <div className="bg-black/30 p-3 rounded-lg border border-white/5 space-y-1">
                  <span className="text-purple-400"># Safety Assertions</span><br />
                  <div>s.add(temp &gt; 120)</div>
                  <div>s.add(valvula == <span className="text-blue-400">False</span>)</div>
                  <div className="text-red-400 font-bold border-l-2 border-red-500 pl-2 mt-1">
                    ASSERT: Implies(temp &gt; 100, valvula == True)
                  </div>
                </div>
                <div className="bg-cyan-500/10 p-3 rounded-lg border border-cyan-500/20 text-cyan-300 text-[11px] leading-relaxed">
                  <strong>Resultado da Prova Z3:</strong> O provador matemático identificou um estado conflitante (temperatura &gt; 120 com válvula fechada), impedindo o upload do binário para segurança do hardware!
                </div>
              </div>
            </div>

            {/* Explanation details */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-block bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-md">
                Verificação Formal & Compilador
              </div>
              <h2 className="text-3xl font-black text-white">Módulo IMORTAL Premium</h2>
              <p className="text-sm text-gray-400 leading-relaxed font-light">
                O IMORTAL é o nosso ecossistema de compilação embarcada avançada. Ele traduz requisições em linguagem natural em firmware C++ de alto desempenho para o microcontrolador <strong>ATMega328P (Arduino)</strong>, aplicando validação matemática formal antes de qualquer gravação física.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                    <ShieldCheck size={16} /> Microsoft Z3 Solver
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Transforma o comportamento do código em restrições lógicas e prova matematicamente a ausência de divisão por zero, deadlocks ou pinagens físicas inválidas.
                  </p>
                </div>
                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-pink-400 font-bold text-sm">
                    <Cpu size={16} /> Fuzzing Sandbox (150 Runs)
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Testa estocasticamente o código simulando cargas e limites de memória para identificar vazamentos antes que o binário atinja os pinos do hardware real.
                  </p>
                </div>
                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                    <Terminal size={16} /> Compilador AVR de Linguagem Natural
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Nosso tradutor proprietário gera C++ nativo limpo a partir de intenções em português e garante que pinagem e registradores estejam mapeados perfeitamente.
                  </p>
                </div>
                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-yellow-400 font-bold text-sm">
                    <CheckCircle2 size={16} /> Human-in-the-Loop (HITL)
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Interface interativa que bloqueia a exportação física caso as métricas matemáticas ou o compilador detectem falhas estruturais, eliminando riscos.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PANEL 2: INFRA */}
        {activeTab === 'infra' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Visual simulation block */}
            <div className="lg:col-span-5 bg-black/50 border border-white/5 rounded-3xl p-6 relative overflow-hidden backdrop-blur-md">
              <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/5 rounded-full blur-2xl" />
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4 font-mono text-[10px] text-gray-400">
                <span className="flex items-center gap-1.5"><Database size={10} className="text-pink-400" /> hosting_costs.yaml</span>
                <span className="text-pink-400">PRICE: R$ 0,00</span>
              </div>
              <div className="space-y-4 font-mono text-xs text-gray-300">
                <div className="bg-black/30 p-3 rounded-lg border border-white/5 space-y-1">
                  <span className="text-gray-500"># Custos de Infraestrutura</span><br />
                  <span>Next.js Frontend: <span className="text-emerald-400">Gratuito</span></span><br />
                  <span>PostgreSQL + Vector: <span className="text-emerald-400">Gratuito</span></span>
                </div>
                <div className="bg-pink-500/10 p-3 rounded-lg border border-pink-500/20 text-pink-300 text-[11px] leading-relaxed">
                  <strong>Eficiência Econômica:</strong> Escalabilidade sem custos fixos, usando canais de API otimizados e renderização de layout zero-dependency.
                </div>
              </div>
            </div>

            {/* Explanation details */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-block bg-pink-500/10 text-pink-300 border border-pink-500/30 text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-md">
                Arquitetura de Alta Performance
              </div>
              <h2 className="text-3xl font-black text-white">Infraestrutura Inteligente</h2>
              <p className="text-sm text-gray-400 leading-relaxed font-light">
                Construímos uma arquitetura de software focada na economia de banda de internet e em custos operacionais nulos. Isso permite escalar nossa base de dados e nossas chamadas de inteligência artificial de forma sustentável.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                    <Database size={16} /> Supabase Vector RAG
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Uso da extensão pgvector acoplada com regras RLS estruturadas que geram pesquisas semânticas rápidas de documentos técnicos e memorandos.
                  </p>
                </div>
                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-pink-400 font-bold text-sm">
                    <LineChart size={16} /> Gráficos SVG Nativos (0KB JS)
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Nossos gráficos dinâmicos de radar e estatísticas são gerados calculando vetores geométricos inline. Zero dependências pesadas como D3 ou Chart.js.
                  </p>
                </div>
                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                    <ShieldCheck size={16} /> Segurança RLS Gateway
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Políticas de Row Level Security restritas no banco de dados que barram requisições não higienizadas via PostgREST diretamente no banco.
                  </p>
                </div>
                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-yellow-400 font-bold text-sm">
                    <Terminal size={16} /> ThreadPool Non-Blocking
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Execução do solucionador Z3 e compiladores delegados para pools de processos em FastAPI, prevenindo travas do event loop.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Call to Action section */}
      <section className="bg-black/30 border-t border-white/5 py-16 px-4 text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          <h2 className="text-3xl font-extrabold text-white">Pronto para testar nossas inovações?</h2>
          <p className="text-sm text-gray-400 max-w-xl mx-auto font-light">
            Navegue pelos nossos estúdios interativos e explore o poder do Z3 Theorem Prover ou o TechBot Kids Studio agora mesmo.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link
              href="/kids"
              className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-lg hover:scale-[1.03] transition-all flex items-center justify-center gap-2"
            >
              Ir para o Kids Studio <ChevronRight size={16} />
            </Link>
            <Link
              href="/tools"
              className="w-full sm:w-auto bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 font-bold text-sm px-6 py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              Explorar Ferramentas
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
