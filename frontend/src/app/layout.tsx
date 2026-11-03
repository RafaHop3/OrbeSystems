import type { Metadata } from 'next';
import './globals.css';
import "@/shaders/threeui.css";
import AnalyticsTracker from '@/components/AnalyticsTracker';
import dynamic from 'next/dynamic';

const MouseAtomTrail = dynamic(() => import('@/components/MouseAtomTrail'), { ssr: false });
import LgpdBanner from '@/components/LgpdBanner';
import WhatsappButton from '@/components/WhatsappButton';

const OrbeAssistant = dynamic(() => import('@/components/OrbeAssistant'), { ssr: false });

export const metadata: Metadata = {
  metadataBase: new URL('https://orbesystems.com.br'),
  title: 'Orbe Systems | Engineering & Mesh Core',
  description:
    'Hub tecnológico da Orbe Systems: Conheça a Mesh Social / Nexus Core (nova rede social autêntica, sem anúncios e gratuita), soluções em engenharia de software, cyber segurança, privacidade LGPD e inteligência artificial.',
  keywords: [
    'Orbe Systems',
    'Mesh Core',
    'Nexus Core',
    'Mesh Social',
    'rede social sem anuncios',
    'rede social amigos',
    'engenharia de software',
    'cyber seguranca',
    'privacidade digital',
    'remocao de dados LGPD',
    'Ghost Engine',
    'inteligencia artificial',
    'arquitetura de dados',
    'tecnologia brasil',
    'desenvolvimento de software',
    'plataforma digital inovadora'
  ],
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    title: 'Orbe Systems | Engineering & Mesh Core',
    description: 'Hub tecnológico: Mesh Social, Nexus Core, engenharia de software, cyber safety e soluções digitais.',
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
      <head>
        <link rel="dns-prefetch" href="https://api.orbesystems.com.br" />
        <link rel="dns-prefetch" href="https://inho-api.orbesystems.com.br" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body suppressHydrationWarning className="bg-terminal-bg text-[#c8d6e3] antialiased selection:bg-neon-cyan selection:text-black bg-cyber-grid bg-fixed font-sans">
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
