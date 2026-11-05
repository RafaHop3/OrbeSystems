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
  title: 'Orbe Systems | INHO ERP, Mesh Core & Engenharia de Software',
  description:
    'Hub tecnológico da Orbe Systems: Conheça o INHO (ERP para PMEs e Cooperativas com Inteligência OrBrick-IA e Cobrança WhatsApp), a Mesh Social e soluções avançadas em cyber segurança e LGPD.',
  keywords: [
    'Orbe Systems',
    'INHO ERP',
    'INHO Cooperativa',
    'OrBrick IA',
    'Régua de Cobrança WhatsApp',
    'Mesh Core',
    'Nexus Core',
    'Mesh Social',
    'rede social sem anuncios',
    'engenharia de software',
    'cyber seguranca',
    'privacidade digital',
    'remocao de dados LGPD',
    'Ghost Engine',
    'inteligencia artificial',
    'gestao cooperativismo BACEN'
  ],
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    title: 'Orbe Systems | INHO ERP & Mesh Core',
    description: 'Hub tecnológico: INHO ERP com IA no WhatsApp, Gestão de Cooperativas, Mesh Social e Engenharia de Software.',
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
