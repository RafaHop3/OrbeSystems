import type { Metadata } from 'next';
import ImortalHero from '@/components/imortal/ImortalHero';
import ImortalFeatures from '@/components/imortal/ImortalFeatures';
import ImortalPipeline from '@/components/imortal/ImortalPipeline';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const runtime = 'nodejs';


export const metadata: Metadata = {
  title: 'IMORTAL — AI Formal Verification Toolchain | Orbe Systems',
  description:
    'Toolchain de verificação formal com IA para sistemas embarcados. A IA propõe, a matemática (Z3) prova, a sandbox estressa e o humano autoriza. Gera Intel HEX para ATMega328P.',
  keywords: ['IMORTAL', 'embedded systems', 'formal verification', 'Z3 prover', 'Arduino', 'AVR', 'AI', 'Orbe Systems'],
  openGraph: {
    title: 'IMORTAL — AI Formal Verification Toolchain',
    description: 'Triple-verification AI pipeline for bare-metal embedded systems.',
    type: 'website',
  },
};

export default function ImortalPage() {
  return (
    <main className="min-h-screen bg-terminal-bg">
      <Header />
      <ImortalHero />
      <ImortalFeatures />
      <ImortalPipeline />
      <Footer />
    </main>
  );
}
