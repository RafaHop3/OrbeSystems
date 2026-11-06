import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Planos e Preços INHO ERP | Orbe Systems — Automação WhatsApp, PIX, Mercados e Redes Corporativas',
  description:
    'Conheça os planos do INHO: Sistema ERP inteligente com Central WhatsApp OrBrick-IA, cobrança automática PIX/Boletos, CBM Preditivo e Governança Corporativa e Multi-Empresas. Planos a partir de R$ 290/mês.',
  keywords: [
    'INHO ERP',
    'Planos INHO',
    'ERP Cooperativa',
    'Sistema de Gestão Cooperativismo',
    'Cobrança Automática WhatsApp',
    'Régua de Cobrança PIX',
    'OrBrick IA',
    'ERP PME Serviços',
    'Software Cooperativa de Crédito e Agro',
    'Automação Financeira PIX Boleto',
    'Orbe Systems Assinatura'
  ],
  alternates: {
    canonical: 'https://orbesystems.com.br/assinar',
  },
  openGraph: {
    title: 'Planos INHO ERP & OrBrick-IA | Orbe Systems',
    description:
      'Automatize o faturamento da sua empresa ou rede corporativa: Central WhatsApp c/ IA, régua de cobrança PIX/Boleto, DRE em tempo real e compliance BACEN. Escolha o plano ideal com 2 meses grátis no anual.',
    url: 'https://orbesystems.com.br/assinar',
    siteName: 'Orbe Systems',
    type: 'website',
  },
};

export default function AssinarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    'name': 'INHO ERP & OrBrick-IA',
    'operatingSystem': 'Web, Cloud, iOS, Android',
    'applicationCategory': 'BusinessApplication',
    'offers': [
      {
        '@type': 'Offer',
        'name': 'INHO Essencial',
        'price': '290.00',
        'priceCurrency': 'BRL',
        'description': 'ERP para PMEs, PDV, Contratos, até 3 operadores e Central WhatsApp.'
      },
      {
        '@type': 'Offer',
        'name': 'INHO Pro + IA (Mais Popular)',
        'price': '590.00',
        'priceCurrency': 'BRL',
        'description': 'ERP completo, OrBrick-IA ativa, alçada dual-control, CBM preditivo e até 8 operadores.'
      },
      {
        '@type': 'Offer',
        'name': 'INHO Enterprise & Corporativo (Padrão Ouro)',
        'price': '990.00',
        'priceCurrency': 'BRL',
        'description': 'Governança Corporativa Multi-Empresas, Quadro Societário, Open Finance e até 25 operadores.'
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
