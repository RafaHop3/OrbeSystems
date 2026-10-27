import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/AuthContext';

export const metadata: Metadata = {
  title: {
    default: 'INHO – Gestão Financeira e Impacto Social Global',
    template: '%s | INHO',
  },
  description:
    'Plataforma de gestão financeira de alta disponibilidade, projetada para impacto social global. Transparência, segurança e tecnologia de ponta.',
  keywords: ['INHO', 'finanças', 'impacto social', 'gestão financeira', 'fintech', 'global'],
  authors: [{ name: 'INHO Team' }],
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'INHO',
    title: 'INHO – Gestão Financeira e Impacto Social Global',
    description: 'Plataforma de gestão financeira de alta disponibilidade para impacto social global.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'INHO – Gestão Financeira e Impacto Social Global',
  },
  robots: { index: true, follow: true },
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://inho.orbesystems.com.br'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="scroll-smooth" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="bg-inho-black text-inho-text font-sans antialiased" suppressHydrationWarning>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
