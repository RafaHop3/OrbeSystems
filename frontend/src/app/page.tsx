import Header from '@/components/Header';
import AnimatedHero from '@/components/AnimatedHero';
import PeaceSection from '@/components/PeaceSection';
import ProjectsGrid from '@/components/ProjectsGrid';
import Footer from '@/components/Footer';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-terminal-bg">
      <Header />
      <AnimatedHero />
      <PeaceSection />
      <ProjectsGrid />
      <Footer />
    </main>
  );
}
