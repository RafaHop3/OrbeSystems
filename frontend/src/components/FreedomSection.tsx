import { Heart } from 'lucide-react';

export default function FreedomSection() {
  return (
    <section
      id="freedom-manifesto"
      className="max-w-4xl mx-auto px-6 py-12 my-12 border border-renaissance-gold/20 rounded bg-black/40 backdrop-blur-sm text-center relative z-10"
    >
      <div className="flex items-center justify-center gap-2 mb-4">
        <Heart size={16} className="text-[#ff3b30]" />
        <h2 className="font-cinzel text-2xl md:text-3xl font-semibold text-white/90 uppercase tracking-wide">
          Manifesto Freedom
        </h2>
      </div>

      <p className="font-serif text-sm md:text-base text-[#dfd2b8]/80 leading-relaxed italic max-w-2xl mx-auto">
        "Acreditamos que o ecossistema da Orbe Systems deve ser, antes de tudo, um território de liberdade.
        Nossa filosofia de <strong className="text-renaissance-gold font-normal not-italic">Zero Trust</strong> não se limita aos sistemas digitais; ela se estende ao nosso ambiente corporativo e social, onde não há tolerância para hostilidade ou assédio."
      </p>
    </section>
  );
}
