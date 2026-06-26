import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import ProjectsGrid from '@/components/ProjectsGrid';
import Footer from '@/components/Footer';
import ScrollNarrativeEngine from '@/components/ScrollNarrativeEngine';
import VdePreview from '@/components/vde/VdePreview';
import FreedomSection from '@/components/FreedomSection';
import KidsPromoSection from '@/components/KidsPromoSection';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-transparent">
      <Header />
      <ScrollNarrativeEngine>
        <HeroSection />
        <VdePreview />
        <FreedomSection />
        <KidsPromoSection />
        <ProjectsGrid />
      </ScrollNarrativeEngine>
      <Footer />
    </main>
  );
}

