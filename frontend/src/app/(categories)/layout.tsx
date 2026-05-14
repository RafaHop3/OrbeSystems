'use client';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Minus, Square, X, Terminal } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

export default function CategoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const categoryName = pathname.split('/').pop()?.replace(/-/g, ' ') || 'Untitled Category';

  return (
    <div className="min-h-screen bg-terminal-bg flex flex-col">
      <Header />
      
      <main className="flex-1 flex flex-col items-center justify-center p-6 pt-24 pb-16">
        {/* Terminal Window Container */}
        <div className="w-full max-w-5xl bg-terminal-surface/90 border border-terminal-border rounded-lg overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] animate-fade-in-up">
          {/* Terminal Title Bar */}
          <div className="bg-[#161b22] border-b border-terminal-border px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5 mr-4">
                <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
              </div>
              <Terminal size={14} className="text-terminal-muted" />
              <span className="font-mono text-xs text-terminal-muted uppercase tracking-widest mt-0.5">
                bash — {categoryName}.sh
              </span>
            </div>
            <div className="flex items-center gap-4 text-terminal-muted/40">
              <button 
                className="hover:text-terminal-muted transition-colors cursor-pointer outline-none focus:text-terminal-muted" 
                title="Minimize"
              >
                <Minus size={14} />
              </button>
              <button 
                className="hover:text-terminal-muted transition-colors cursor-pointer outline-none focus:text-terminal-muted" 
                title="Maximize"
              >
                <Square size={10} />
              </button>
              <button 
                onClick={() => router.back()} 
                className="hover:text-red-500 transition-colors cursor-pointer outline-none focus:text-red-500"
                title="Close (Go Back)"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Terminal Body */}
          <div className="p-6 md:p-10 font-mono text-sm md:text-base text-white/90">
            {children}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
