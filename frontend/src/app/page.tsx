import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import Footer from '@/components/Footer';
import ScrollNarrativeEngine from '@/components/ScrollNarrativeEngine';
import FreedomSection from '@/components/FreedomSection';
import FeaturedSitesSection from '@/components/FeaturedSitesSection';
import VoidFieldPromo from '@/components/VoidFieldPromo';
import OrbeStudioPromo from '@/components/OrbeStudioPromo';
import dynamic from 'next/dynamic';

const StarryBackground = dynamic(() => import('@/components/StarryBackground'), {
  ssr: false,
});

export default function HomePage() {
  return (
    <main className="min-h-screen bg-transparent pt-16 relative">
      <StarryBackground />
      <Header />
      <OrbeStudioPromo />
      <VoidFieldPromo />
      <ScrollNarrativeEngine>
        <HeroSection />
      </ScrollNarrativeEngine>
      <FeaturedSitesSection />
      <FreedomSection />
      <Footer />
    </main>
  );
}

