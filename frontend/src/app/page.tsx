import Header from '@/components/Header';
import { Skiper30 } from '@/components/v1/skiper30';
import OrbeAssistantHeroCard from '@/components/OrbeAssistantHeroCard';
import dynamicImport from 'next/dynamic';

export const dynamic = 'force-static';
export const revalidate = 3600;

const StarryBackground = dynamicImport(() => import('@/components/StarryBackground'), {
  ssr: false,
});

// Below-the-fold sections: ssr: true preserves 100% SEO HTML while splitting JS hydration chunks
const OrbeMusicHero = dynamicImport(() => import('@/components/OrbeMusicHero'), { ssr: true });
const MusicDownloaderHero = dynamicImport(() => import('@/components/MusicDownloaderHero'), { ssr: true });
const OrbeCleanerPromo = dynamicImport(() => import('@/components/OrbeCleanerPromo'), { ssr: true });
const VoidFieldPromo = dynamicImport(() => import('@/components/VoidFieldPromo'), { ssr: true });
const InhoPromo = dynamicImport(() => import('@/components/InhoPromo'), { ssr: true });
const InhoManifestoHero = dynamicImport(() => import('@/components/InhoManifestoHero'), { ssr: true });
const ScrollNarrativeEngine = dynamicImport(() => import('@/components/ScrollNarrativeEngine'), { ssr: true });
const HeroSection = dynamicImport(() => import('@/components/HeroSection'), { ssr: true });
const FeaturedSitesSection = dynamicImport(() => import('@/components/FeaturedSitesSection'), { ssr: true });
const JovemPanoHero = dynamicImport(() => import('@/components/JovemPanoHero'), { ssr: true });
const EloProtocolHero = dynamicImport(() => import('@/components/EloProtocolHero'), { ssr: true });
const FreedomSection = dynamicImport(() => import('@/components/FreedomSection'), { ssr: true });
const Footer = dynamicImport(() => import('@/components/Footer'), { ssr: true });

export default function HomePage() {
  return (
    <main className="min-h-screen bg-transparent pt-16 relative">
      <StarryBackground />
      <Header />
      {/* 🚀 Hero Card Oficial: Orbe Assistant Convidando para os Planos INHO ERP */}
      <OrbeAssistantHeroCard />
      <Skiper30 />
      <div className="below-fold-section"><OrbeMusicHero /></div>
      <div className="below-fold-section"><MusicDownloaderHero /></div>
      <div className="below-fold-section"><OrbeCleanerPromo /></div>
      <div className="below-fold-section"><VoidFieldPromo /></div>
      <div className="below-fold-section"><InhoPromo /></div>
      <div className="below-fold-section"><InhoManifestoHero /></div>
      <div className="below-fold-section">
        <ScrollNarrativeEngine>
          <HeroSection />
        </ScrollNarrativeEngine>
      </div>
      <div className="below-fold-section"><FeaturedSitesSection /></div>
      <div className="below-fold-section"><JovemPanoHero /></div>
      <div className="below-fold-section"><EloProtocolHero /></div>
      <div className="below-fold-section"><FreedomSection /></div>
      <div className="below-fold-section"><Footer /></div>
    </main>
  );
}
