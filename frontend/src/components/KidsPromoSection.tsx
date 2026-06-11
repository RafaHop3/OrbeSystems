'use client';

import { Sparkles, ArrowRight, Code2, Heart, Award, Cpu } from 'lucide-react';
import Link from 'next/link';

export default function KidsPromoSection() {
  return (
    <section
      id="orbe-kids-promo"
      className="relative max-w-5xl mx-auto px-6 py-16 my-16 border-2 border-cyan-500/35 rounded-2xl bg-gradient-to-b from-[#120b24]/60 to-[#070311]/80 backdrop-blur-md overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.08)]"
    >
      {/* Ambient glows inside banner */}
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-cyan-400/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Floating particles aesthetic */}
      <div className="absolute top-8 right-12 text-3xl opacity-20 animate-bounce duration-3000">🤖</div>
      <div className="absolute bottom-8 left-12 text-3xl opacity-15 animate-pulse">🚀</div>

      <div className="relative z-10 flex flex-col items-center text-center">
        
        {/* Label tag */}
        <div className="inline-flex items-center gap-2 border border-cyan-400/30 bg-cyan-400/5 rounded-full px-4 py-1.5 mb-6">
          <Sparkles size={12} className="text-cyan-400 animate-pulse" />
          <span className="font-cinzel text-[10px] tracking-widest text-cyan-300 uppercase font-bold">
            NOVIDADE · ORBE KIDS STUDIO
          </span>
        </div>

        {/* Title */}
        <h2 className="font-cinzel text-3xl md:text-5xl font-extrabold mb-6 text-white uppercase tracking-wide">
          Ensine Tecnologia <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(6,182,212,0.25)]">para Crianças</span>
        </h2>

        {/* Supporting description */}
        <p className="font-serif text-base md:text-lg text-[#dfd2b8]/95 leading-relaxed max-w-2xl mb-10">
          Lançamos uma plataforma de programação interativa, gratuita e gamificada, voltada para crianças 
          e jovens aprenderem conceitos de computação, lógica, algoritmos e criação de jogos na prática.
        </p>

        {/* Features Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl mb-12">
          
          {/* Feature 1 */}
          <div className="border border-[#06b6d4]/20 rounded-xl p-5 bg-black/30 hover:border-[#06b6d4]/50 transition-all duration-300">
            <div className="flex justify-center mb-3">
              <Code2 size={24} className="text-cyan-400" />
            </div>
            <h3 className="font-cinzel text-xs text-cyan-300 uppercase tracking-wider mb-2 font-bold">Editor de Código Real</h3>
            <p className="font-serif text-[11px] text-gray-400 leading-relaxed">
              Escreva scripts interativos em JavaScript e Python Simulado, executando-os em tempo real com consoles de saída.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="border border-[#8b5cf6]/20 rounded-xl p-5 bg-black/30 hover:border-[#8b5cf6]/50 transition-all duration-300">
            <div className="flex justify-center mb-3">
              <Cpu size={24} className="text-purple-400" />
            </div>
            <h3 className="font-cinzel text-xs text-purple-300 uppercase tracking-wider mb-2 font-bold">Tutor de IA Integrado</h3>
            <p className="font-serif text-[11px] text-gray-400 leading-relaxed">
              O robozinho <strong>Techy</strong> acompanha cada lição tirando dúvidas, ensinando teoria e depurando bugs de escrita na hora.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="border border-yellow-500/20 rounded-xl p-5 bg-black/30 hover:border-yellow-500/50 transition-all duration-300">
            <div className="flex justify-center mb-3">
              <Award size={24} className="text-yellow-400 animate-pulse" />
            </div>
            <h3 className="font-cinzel text-xs text-yellow-300 uppercase tracking-wider mb-2 font-bold">Níveis &amp; Badges</h3>
            <p className="font-serif text-[11px] text-gray-400 leading-relaxed">
              Sistemas de pontos de experiência (XP), badges temáticos colecionáveis e lições estruturadas passo a passo.
            </p>
          </div>

        </div>

        {/* CTA Button */}
        <div className="flex flex-col items-center gap-3">
          <Link
            href="/kids"
            className="group flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-cinzel text-xs font-bold tracking-widest uppercase px-10 py-4 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all duration-300 hover:scale-[1.05]"
          >
            <span>Experimentar Orbe Kids</span>
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </Link>
          <span className="text-[10px] text-gray-500 uppercase tracking-widest mt-2">
            Plataforma 100% gratuita · Livre de anúncios e cadastros
          </span>
        </div>

      </div>
    </section>
  );
}
