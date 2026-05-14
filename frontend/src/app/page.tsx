import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import ProjectsGrid from '@/components/ProjectsGrid';
import Footer from '@/components/Footer';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-terminal-bg">
      <Header />
      <HeroSection />
      <ProjectsGrid />
      <Footer />
    </main>
  );
}
