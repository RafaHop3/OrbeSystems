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
  title: 'INHO ERP | Sistema de Gestão, PDV com Maquininha Smart POS, Emissor de Nota Fiscal & Cobrança WhatsApp | Orbe Systems',
  description:
    'Aumente o lucro da sua empresa e elimine o trabalho manual com o INHO ERP. Frente de Caixa (PDV) com Maquininha Smart POS sem aluguel, Emissão de Nota Fiscal (NFS-e), Balança pesável integrada, Régua de Cobrança Automática via WhatsApp com PIX e Co-piloto Orbe AI com Poder ROOT.',
  keywords: [
    'sistema erp para empresas',
    'software de gestao empresarial',
    'pdv frente de caixa com maquininha',
    'maquininha smart pos stripe terminal',
    'emissor de nota fiscal integrado',
    'emissao de nfse automatica',
    'sistema para supermercados e mercados',
    'sistema para comercio e varejo',
    'cobranca automatica whatsapp com pix',
    'como diminuir inadimplencia',
    'fechamento de caixa com inteligencia artificial',
    'balanca pesavel ean 13 plu',
    'orbe ai',
    'inho erp',
    'sistema para cooperativas agropecuarias',
    'open finance bacen empresas',
    'alçada dual control financeiro',
    'orbe systems'
  ],
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    title: 'INHO ERP | Mais Lucro, Menos Trabalho Manual e Gestão com IA',
    description: 'Automatize sua empresa: PDV com Maquininha Smart POS, Emissão de Nota Fiscal, Cobrança Automática no WhatsApp com PIX e Orbe AI.',
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
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "name": "INHO ERP",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web, Cloud, Smart POS",
        "offers": [
          {
            "@type": "Offer",
            "price": "290.00",
            "priceCurrency": "BRL",
            "name": "INHO Essencial",
            "url": "https://orbesystems.com.br/assinar"
          },
          {
            "@type": "Offer",
            "price": "590.00",
            "priceCurrency": "BRL",
            "name": "INHO Pro + Orbe AI",
            "url": "https://orbesystems.com.br/assinar"
          },
          {
            "@type": "Offer",
            "price": "990.00",
            "priceCurrency": "BRL",
            "name": "INHO Enterprise & Corporativo",
            "url": "https://orbesystems.com.br/assinar"
          }
        ],
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.9",
          "reviewCount": "142"
        },
        "description": "Sistema ERP completo para comércios, mercados e cooperativas com PDV integrado a Maquininhas Smart POS, Emissão de Nota Fiscal, Cobrança Automática via WhatsApp e Inteligência Artificial Orbe AI."
      },
      {
        "@type": "Organization",
        "name": "The Orbe Systems",
        "url": "https://orbesystems.com.br",
        "logo": "https://orbesystems.com.br/favicon.ico",
        "contactPoint": {
          "@type": "ContactPoint",
          "telephone": "+55-11-99999-9999",
          "contactType": "customer service",
          "availableLanguage": "Portuguese"
        }
      }
    ]
  };

  return (
    <html lang="pt-BR">
      <head>
        <link rel="dns-prefetch" href="https://api.orbesystems.com.br" />
        <link rel="dns-prefetch" href="https://inho-api.orbesystems.com.br" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="bg-[#050508] text-white antialiased selection:bg-purple-500 selection:text-white">
        <AnalyticsTracker />
        <MouseAtomTrail />
        <LgpdBanner />
        {children}
        <WhatsappButton />
        <OrbeAssistant />
      </body>
    </html>
  );
}
