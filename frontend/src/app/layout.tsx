import type { Metadata } from 'next';
import './globals.css';
import AnalyticsTracker from '@/components/AnalyticsTracker';
import MouseAtomTrail from '@/components/MouseAtomTrail';
import dynamic from 'next/dynamic';
import LgpdBanner from '@/components/LgpdBanner';
import WhatsappButton from '@/components/WhatsappButton';

const OrbeAssistant = dynamic(() => import('@/components/OrbeAssistant'), { ssr: false });

export const metadata: Metadata = {
  metadataBase: new URL('https://orbesystems.com.br'),
  title: 'Orbe Systems | Engineering & Arquitetura de Dados',
  description:
    'Hub tecnológico da Orbe Systems. Soluções escaláveis em engenharia de software, cyber safety e design de sistemas de alta disponibilidade.',
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    title: 'Orbe Systems | Engineering',
    description: 'Hub tecnológico: engenharia de software, cyber safety e design de sistemas.',
    url: 'https://orbesystems.com.br',
    siteName: 'Orbe Systems',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-terminal-bg text-[#c8d6e3] antialiased selection:bg-neon-cyan selection:text-black bg-cyber-grid bg-fixed font-sans">
        <div className="scanline-effect"></div>
        <AnalyticsTracker />
        <MouseAtomTrail />
        {children}
        <OrbeAssistant />
        <LgpdBanner />
        <WhatsappButton />
      </body>
    </html>
  );
}
