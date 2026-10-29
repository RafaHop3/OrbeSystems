'use client';

import Link from 'next/link';
import { Code2, Database, Shield, Zap, Sparkles, Users, Lock, ArrowRight, Heart, BookOpen } from 'lucide-react';
import { MagicCard } from '@/components/ui/magic-card';
import { AuroraText } from '@/components/ui/aurora-text';
import ToolVoidPanel from '@/components/ToolVoidPanel';
import ProductMetrics from '@/components/ProductMetrics';

const highlightKeywords = [
  { icon: BookOpen, label: 'Mesh Social Books (Malha Cultural)', color: 'cyan', href: '/mesh-social' },
  { icon: Shield, label: 'Privacidade Digital LGPD', color: 'green', href: '/ferramentas-premium/databroker-optout' },
  { icon: Code2, label: 'Engenharia de Software', color: 'cyan', href: '/software-engineering' },
  { icon: Zap, label: 'Automação & IA', color: 'purple', href: '/automation' },
];

export default function HeroSection() {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 pt-24 pb-16 overflow-hidden"
    >
      <div className="relative z-10 text-center w-full max-w-5xl mx-auto">
        <MagicCard className="w-full mx-auto flex flex-col items-center justify-center -mt-8 mb-10 py-12 sm:py-16 px-4 sm:px-8 bg-black/40 backdrop-blur-3xl border-neon-blue/40 shadow-[0_0_50px_rgba(0,0,0,0.9)]">
          <div className="relative z-10 text-center space-y-6">
            
            {/* SEO & Public Friendly Badge */}
            <div className="inline-flex items-center gap-2.5 border border-neon-cyan/50 rounded-full px-4 py-2 bg-navy-deep/80 backdrop-blur-md shadow-[0_0_20px_rgba(0,255,245,0.25)] hover:scale-105 transition-all duration-300">
              <span className="w-2.5 h-2.5 rounded-full bg-neon-cyan animate-pulse shadow-[0_0_10px_#00fff5]" />
              <span className="text-xs sm:text-sm text-neon-cyan tracking-wider uppercase font-bold">
                Orbe Systems · Tecnologia, Inovação &amp; Conexão Humana
              </span>
            </div>

            {/* Main SEO H1 Heading */}
            <h1 className="font-sans text-4xl sm:text-6xl md:text-7xl font-black leading-tight tracking-tight text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.5)]">
              Tecnologia simples e poderosa para <br className="hidden sm:inline" />
              <span className="block mt-2">
                conectar e proteger o seu <AuroraText text="Mundo Digital." className="mt-1" />
              </span>
            </h1>

            {/* Welcoming Public Paragraph with High-Rank Google Search Terms */}
            <div className="font-sans text-base sm:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed font-normal space-y-4">
              <p className="text-center sm:text-lg text-slate-200">
                Seja bem-vindo à <strong>Orbe Systems</strong>. Criamos tecnologia brasileira de ponta com um objetivo claro: 
                aproximar pessoas, proteger a sua privacidade e acelerar ideias criativas.
              </p>
              <p className="text-sm sm:text-base text-slate-400">
                Conheça a <strong className="text-neon-cyan">Mesh Social Books</strong> — a nova rede social e estante descentralizada P2P, 100% gratuita, sem anúncios, com empréstimo presencial validado via QR Code, acervo digital aberto e bloqueio anti-spoiler —, além de soluções de ponta em <strong className="text-white">Engenharia de Software, Cyber Segurança, Proteção de Dados LGPD e Inteligência Artificial</strong>.
              </p>
            </div>

            {/* Visual Void Panel: Servidores e Nuvem Orbe */}
            <div className="w-full max-w-lg mx-auto my-4">
              <ToolVoidPanel
                shape="server-cluster"
                accentColor="#00fff5"
                secondaryColor="#3b82f6"
                label="Infraestrutura Orbe Cloud // Conexão Segura & Alta Disponibilidade"
                className="h-44 sm:h-52"
              />
            </div>

            {/* Métricas Homologadas de Confiança & Segurança */}
            <div className="flex justify-center my-4">
              <ProductMetrics
                metrics={[
                  { label: 'Mesh Social Books', value: '100% Autônoma' },
                  { label: 'Empréstimos P2P', value: 'QR Code Dinâmico' },
                  { label: 'Privacidade & Dados', value: 'Zero-Cross LGPD' },
                ]}
              />
            </div>

            {/* SEO Keyword Navigation Badges */}
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              {highlightKeywords.map(({ icon: Icon, label, href }) => (
                <Link
                  key={label}
                  href={href}
                  className="group flex items-center gap-2.5 border border-slate-700/80 rounded-xl px-4 py-2.5 transition-all duration-300 bg-[#060911]/80 hover:border-neon-cyan hover:bg-neon-cyan/10 backdrop-blur-md shadow-md hover:-translate-y-0.5"
                >
                  <Icon size={16} className="text-neon-cyan transition-colors" />
                  <span className="text-xs sm:text-sm text-slate-300 group-hover:text-white font-medium transition-colors">
                    {label}
                  </span>
                </Link>
              ))}
            </div>

          </div>
        </MagicCard>

        {/* Action Buttons: Inviting & Accessible for Everyone */}
        <div className="flex flex-wrap justify-center items-center gap-4">
          <Link
            href="/mesh-social"
            className="inline-flex items-center gap-2.5 font-bold text-xs sm:text-sm uppercase tracking-wider bg-neon-cyan hover:bg-cyan-300 text-black px-7 py-3.5 rounded-xl shadow-[0_0_25px_rgba(0,255,245,0.4)] transition-all duration-300 hover:scale-105"
          >
            <BookOpen size={16} />
            <span>Acessar Mesh Social Books (Grátis)</span>
            <ArrowRight size={16} />
          </Link>

          <Link
            href="/workspace"
            className="inline-flex items-center gap-2 font-mono text-xs sm:text-sm uppercase tracking-wider border border-slate-700 text-white px-6 py-3.5 rounded-xl hover:bg-slate-800/80 hover:border-slate-500 transition-all duration-300 bg-slate-900/60 backdrop-blur-lg"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Explorar Ferramentas</span>
          </Link>

          <Link
            href="/ferramentas-premium/databroker-optout"
            className="inline-flex items-center gap-2 font-mono text-xs sm:text-sm uppercase tracking-wider border border-cyan-500/50 text-cyan-300 px-6 py-3.5 rounded-xl hover:bg-cyan-950/40 hover:border-cyan-400 transition-all duration-300 bg-slate-900/60 backdrop-blur-lg"
          >
            <Shield size={16} className="text-cyan-400" />
            <span>Ghost Engine (LGPD)</span>
          </Link>

          <Link
            href="/ferramentas-premium/orbe-visual-studio"
            className="inline-flex items-center gap-2 font-mono text-xs sm:text-sm uppercase tracking-wider border border-amber-500/50 text-amber-300 px-6 py-3.5 rounded-xl hover:bg-amber-950/40 hover:border-amber-400 transition-all duration-300 bg-slate-900/60 backdrop-blur-lg"
          >
            <Sparkles size={16} className="text-amber-400" />
            <span>Orbe Studio</span>
          </Link>
        </div>
      </div>

      <div className="w-full flex flex-col items-center gap-2 opacity-50 mt-12 md:mt-20">
        <span className="font-mono text-[10px] tracking-widest text-neon-cyan uppercase animate-pulse">Role para explorar mais</span>
        <div className="w-px h-10 bg-gradient-to-b from-neon-cyan to-transparent animate-pulse" />
      </div>
    </section>
  );
}
