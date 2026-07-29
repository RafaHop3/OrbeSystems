import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import ProjectsGrid from '@/components/ProjectsGrid';
import Footer from '@/components/Footer';
import ScrollNarrativeEngine from '@/components/ScrollNarrativeEngine';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-transparent">
      <Header />
      <ScrollNarrativeEngine>
        <HeroSection />
        <ProjectsGrid />
      </ScrollNarrativeEngine>
      <Footer />
    </main>
  );
}

