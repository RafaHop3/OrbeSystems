import type { Metadata } from 'next';
import './globals.css';
import logo from '../../imagems/logos/Design sem nome.png'; // Nota: Verifique se a pasta 'imagems' está correta ou se é um typo de 'imagens'
import AnalyticsTracker from '@/components/AnalyticsTracker';
import MouseAtomTrail from '@/components/MouseAtomTrail';
import OrbeAssistant from '@/components/OrbeAssistant';

export const metadata: Metadata = {
  metadataBase: new URL('https://orbesystems.com.br'),
  title: 'Orbe Systems | Engineering & Arquitetura de Dados',
  description:
    'Hub tecnológico da Orbe Systems. Soluções escaláveis em engenharia de software (Python/FastAPI, Next.js), modelagem avançada de banco de dados e design de sistemas de alta disponibilidade.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-renaissance-bg text-renaissance-parchment antialiased selection:bg-renaissance-gold selection:text-white">
        {/* Componentes Globais de Rastreamento e Animação */}
        <AnalyticsTracker />
        <MouseAtomTrail />
        <OrbeAssistant />
        
        <main className="relative min-h-screen overflow-x-hidden">
          {children}
        </main>
      </body>
    </html>
  );
}
