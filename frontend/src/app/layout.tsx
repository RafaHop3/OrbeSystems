import type { Metadata } from 'next';
import './globals.css';
import AnalyticsTracker from '@/components/AnalyticsTracker';
import MouseAtomTrail from '@/components/MouseAtomTrail';

export const metadata: Metadata = {
  metadataBase: new URL('https://orbesystems.com.br'),
  title: 'Orbe Systems | Engineering & Arquitetura de Dados',
  description:
    'Hub tecnológico da Orbe Systems. Soluções escaláveis em engenharia de software, cyber safety e design de sistemas de alta disponibilidade.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-navy-black text-navy-mist antialiased selection:bg-navy-steel selection:text-white">
        <AnalyticsTracker />
        <MouseAtomTrail />
        {children}
      </body>
    </html>
  );
}
