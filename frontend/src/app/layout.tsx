import type { Metadata } from 'next';
import './globals.css';
import "@/shaders/threeui.css";
import AnalyticsTracker from '@/components/AnalyticsTracker';
import MouseAtomTrail from '@/components/MouseAtomTrail';
import dynamic from 'next/dynamic';
import LgpdBanner from '@/components/LgpdBanner';
import WhatsappButton from '@/components/WhatsappButton';

const OrbeAssistant = dynamic(() => import('@/components/OrbeAssistant'), { ssr: false });

export const metadata: Metadata = {
  metadataBase: new URL('https://orbesystems.com.br'),
  title: 'Orbe Systems | Tecnologia, Mesh Social & Engenharia de Software',
  description:
    'Hub tecnológico da Orbe Systems: Conheça a Mesh Social (nova rede social autêntica, sem anúncios e gratuita), soluções em engenharia de software, cyber segurança, privacidade LGPD e inteligência artificial.',
  keywords: [
    'Mesh Social',
    'rede social sem anuncios',
    'rede social amigos',
    'Orbe Systems',
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
    title: 'Orbe Systems | Tecnologia, Mesh Social & Inovação',
    description: 'Hub tecnológico: Mesh Social, engenharia de software, cyber safety e soluções digitais.',
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
