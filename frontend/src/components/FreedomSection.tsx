'use client';

import { Heart, Scale, ShieldAlert, Mail } from 'lucide-react';
import { useState } from 'react';

export default function FreedomSection() {
  const [copied, setCopied] = useState(false);
  const justiceEmail = 'justica@orbesystems.com.br';

  const handleCopy = () => {
    navigator.clipboard.writeText(justiceEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <section
      id="freedom-manifesto"
      className="relative max-w-5xl mx-auto px-6 py-20 my-16 border-2 border-renaissance-gold/30 rounded bg-renaissance-surface/40 backdrop-blur-md overflow-hidden"
      style={{
        boxShadow: '0 0 40px rgba(197, 160, 89, 0.05)',
      }}
    >
      {/* Background Decorative Glow */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-neon-cyan/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-renaissance-gold/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Subtitle */}
        <div className="flex items-center gap-2 mb-6">
          <Heart size={12} className="text-[#ff3b30] animate-pulse" />
          <span className="font-cinzel text-[10px] tracking-widest text-[#dfd2b8] uppercase font-bold">
            Protocolo Freedom · Liberdade, Respeito &amp; Inclusão
          </span>
          <Heart size={12} className="text-[#ff3b30] animate-pulse" />
        </div>

        {/* Heading */}
        <h2 className="font-cinzel text-3xl md:text-5xl font-semibold mb-8 text-white/90 uppercase tracking-wide">
          Manifesto <span className="text-renaissance-gold drop-shadow-[0_0_15px_rgba(212,175,55,0.2)]">Freedom</span>
        </h2>

        {/* Main Text */}
        <p className="font-serif text-base md:text-lg text-[#dfd2b8]/90 leading-relaxed max-w-3xl mb-10 italic">
          "Acreditamos que o ecossistema da Orbe Systems deve ser, antes de tudo, um território de liberdade — 
          um espaço seguro onde cada indivíduo tem o direito de se expressar e ser quem verdadeiramente é. 
          Nossa filosofia de <strong className="text-renaissance-gold font-normal not-italic">Zero Trust</strong> não se limita a sistemas; ela se estende à convivência humana. 
          Temos tolerância zero contra assédio e comportamentos hostis. Para garantir a integridade desse ecossistema, 
          nosso Departamento de Justiça Digital atua ativamente no suporte a vítimas e na resposta a violações éticas. 
          Projetamos tecnologia não apenas para construir sistemas eficientes, mas para pavimentar o caminho para um mundo digital mais livre, leve e com amor."
        </p>

        {/* Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl mb-12">
          {/* Pillar 1 */}
          <div className="border border-renaissance-gold/20 rounded p-5 bg-black/20 hover:border-renaissance-gold/45 transition-all duration-300">
            <div className="flex justify-center mb-3">
              <Scale size={24} className="text-renaissance-gold" />
            </div>
            <h3 className="font-cinzel text-xs text-[#dfd2b8] uppercase tracking-wider mb-2 font-bold">Departamento de Justiça</h3>
            <p className="font-serif text-[11px] text-[#dfd2b8]/70 leading-relaxed">
              Estrutura interna focada no amparo legal, monitoramento ético e compliance de convívio digital.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="border border-[#00fff5]/20 rounded p-5 bg-black/20 hover:border-[#00fff5]/45 transition-all duration-300">
            <div className="flex justify-center mb-3">
              <ShieldAlert size={24} className="text-[#00fff5]" />
            </div>
            <h3 className="font-cinzel text-xs text-[#00fff5] uppercase tracking-wider mb-2 font-bold">Zero Trust para Agressores</h3>
            <p className="font-serif text-[11px] text-[#dfd2b8]/70 leading-relaxed">
              Bloqueio perimetral imediato de contas e identidades associadas a assédio ou discursos discriminatórios.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="border border-renaissance-gold/20 rounded p-5 bg-black/20 hover:border-renaissance-gold/45 transition-all duration-300">
            <div className="flex justify-center mb-3">
              <Heart size={24} className="text-renaissance-gold" />
            </div>
            <h3 className="font-cinzel text-xs text-[#dfd2b8] uppercase tracking-wider mb-2 font-bold">Livre &amp; Com Amor</h3>
            <p className="font-serif text-[11px] text-[#dfd2b8]/70 leading-relaxed">
              Design de UX inclusivo pensado para acolher e empoderar a autenticidade humana sem amarras corporativas.
            </p>
          </div>
        </div>

        {/* Contact CTA */}
        <div className="flex flex-col items-center gap-3">
          <p className="font-serif text-xs text-[#dfd2b8]/60 italic">
            Presenciou comportamento hostil? Denuncie confidencialmente:
          </p>
          <button
            onClick={handleCopy}
            className="group flex items-center gap-2 border border-renaissance-gold text-renaissance-gold px-6 py-2.5 rounded font-cinzel text-xs tracking-widest uppercase hover:bg-renaissance-gold/10 hover:shadow-gilt transition-all duration-300"
          >
            <Mail size={12} className="transition-transform group-hover:scale-110" />
            {copied ? 'Copiado para o Clip!' : 'justica@orbesystems.com.br'}
          </button>
        </div>
      </div>
    </section>
  );
}
