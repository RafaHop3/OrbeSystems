import Link from 'next/link';
import type { Metadata } from 'next';
import { MANIFESTO_KEYWORDS, MANIFESTO_STAGES, MANIFESTO_TAGLINE } from '@/data/inho_manifesto';

const TITLE = 'INHO Business: ERP inteligente para cooperativas e PMEs | Orbe Systems';
const DESCRIPTION =
  'Gestão financeira, CRM, cobrança por WhatsApp com IA segura e análise de churn num só sistema, com isolamento multiempresa e LGPD.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: 'https://www.orbesystems.com.br/inho' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://www.orbesystems.com.br/inho',
    type: 'article',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'INHO Business',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description: DESCRIPTION,
  keywords: MANIFESTO_KEYWORDS.join(', '),
  publisher: { '@type': 'Organization', name: 'Orbe Systems', url: 'https://www.orbesystems.com.br' },
  url: 'https://inho.orbesystems.com.br',
};

export default function InhoPage() {
  return (
    <main className="min-h-screen bg-[#030305] text-slate-200 px-6 py-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article className="max-w-3xl mx-auto space-y-10 leading-relaxed text-base">
        <Link href="/" className="text-neon-cyan text-sm hover:underline">← Voltar ao início</Link>

        <header className="space-y-4">
          <h1 className="text-4xl font-bold text-white font-tilt-neon">
            INHO: onde a gestão encontra a inteligência
          </h1>
          <p className="text-slate-300 text-lg">
            Um sistema de gestão empresarial que cuida do seu negócio como quem cuida de um jardim.
          </p>
        </header>

        {MANIFESTO_STAGES.map((stage) => (
          <section key={stage.numeral} className="space-y-3" aria-labelledby={`estacao-${stage.numeral}`}>
            <p className="text-xs font-mono uppercase tracking-widest text-purple-300">
              {stage.numeral} · {stage.title}
            </p>
            <h2 id={`estacao-${stage.numeral}`} className="text-2xl font-semibold text-white">
              {stage.heading}
            </h2>
            {stage.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </section>
        ))}

        <blockquote className="border-l-2 border-purple-500/60 pl-4 text-xl font-semibold text-white">
          {MANIFESTO_TAGLINE}
          <span className="block text-sm font-normal text-slate-400 mt-1">Um produto Orbe Systems.</span>
        </blockquote>

        <a
          href="https://inho.orbesystems.com.br/login"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-[#8b5cf6] hover:bg-white text-white hover:text-black font-bold uppercase tracking-widest text-sm px-8 py-4 transition-all duration-300"
        >
          Acessar INHO via Orbe SSO
        </a>
      </article>
    </main>
  );
}
