import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import Footer from '@/components/Footer';
import ScrollNarrativeEngine from '@/components/ScrollNarrativeEngine';
import VdePreview from '@/components/vde/VdePreview';
import FreedomSection from '@/components/FreedomSection';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-transparent">
      <Header />
      <ScrollNarrativeEngine>
        <HeroSection />
        <VdePreview />
        <FreedomSection />
      </ScrollNarrativeEngine>
      <Footer />
    </main>
  );
}

