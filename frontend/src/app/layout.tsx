import type { Metadata } from 'next';
import './globals.css';
import logo from '../../imagems/logos/Design sem nome.png';
import AnalyticsTracker from '@/components/AnalyticsTracker';
import MouseAtomTrail from '@/components/MouseAtomTrail';

export const metadata: Metadata = {
  title: 'Orbe Systems | Engineering & Arquitetura de Dados',
  description:
    'Hub tecnológico da Orbe Systems. Soluções escaláveis em engenharia de software (Python/FastAPI, Next.js), modelagem avançada de banco de dados e design de sistemas de alta disponibilidade.',
  keywords: ['Orbe Systems', 'Database Architecture', 'Backend Engineer', 'Software Engineering', 'FastAPI', 'Next.js', 'System Design', 'PostgreSQL', 'API'],
  authors: [{ name: 'Orbe Systems' }],

  icons: {
    icon: logo.src,
    shortcut: logo.src,
    apple: logo.src,
  },
  openGraph: {
    title: 'Orbe Systems | Engineering & Arquitetura de Dados',
    description: 'Explore uma vitrine técnica de engenharia de software, arquitetura de banco de dados e design de sistemas distribuídos.',
    type: 'website',
    url: 'https://orbesystems.com.br',
    siteName: 'Orbe Systems',
    images: [
      {
        url: logo.src,
        width: 1200,
        height: 630,
        alt: 'Orbe Systems - Command Center',
      },
    ],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <AnalyticsTracker />
        <MouseAtomTrail />
        {children}
      </body>
    </html>
  );
}
