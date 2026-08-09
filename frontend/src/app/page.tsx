import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import Footer from '@/components/Footer';
import ScrollNarrativeEngine from '@/components/ScrollNarrativeEngine';
import FreedomSection from '@/components/FreedomSection';
import FeaturedSitesSection from '@/components/FeaturedSitesSection';
import GhostEnginePromo from '@/components/GhostEnginePromo';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-transparent pt-16">
      <Header />
      <GhostEnginePromo />
      <ScrollNarrativeEngine>
        <HeroSection />
      </ScrollNarrativeEngine>
      <FeaturedSitesSection />
      <FreedomSection />
      <Footer />
    </main>
  );
}

