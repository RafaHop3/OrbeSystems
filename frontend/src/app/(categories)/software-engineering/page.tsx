import { Code2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import ScrollReveal from '@/components/ScrollReveal';

export default function SoftwareEngineeringPage() {
  return (
    <div className="space-y-8">
      <ScrollReveal variant="fade-up" delay={0}>
        <section className="space-y-4">
          <div className="flex items-center gap-3 text-neon-cyan mb-2">
            <Code2 size={20} />
            <h1 className="text-2xl font-bold tracking-tight">Software Engineering</h1>
          </div>
          
          <div className="space-y-2 opacity-80">
            <p className="flex items-center gap-2">
              <span className="text-neon-green">$</span> 
              <span>cat description.txt</span>
            </p>
            <p className="text-terminal-muted leading-relaxed font-mono">
              Desenvolvimento de sistemas robustos e escaláveis utilizando as melhores práticas do mercado. 
              Foco em arquitetura limpa, performance e manutenibilidade. Especializado em ecossistemas Python (FastAPI/Django) 
              e interfaces modernas com Next.js 14+.
            </p>
          </div>
        </section>
      </ScrollReveal>

      <ScrollReveal variant="fade-up" delay={120}>
        <section className="space-y-6 pt-6 border-t border-terminal-border/30">
          <div className="space-y-2">
            <p className="flex items-center gap-2">
              <span className="text-neon-green">$</span> 
              <span>ls -la ./projects</span>
            </p>
            
            <div className="grid grid-cols-1 gap-2 mt-4 font-mono text-xs md:text-sm">
              {[
                { name: 'orbe-systems-gateway', type: 'drwxr-xr-x', size: '4.2KB' },
                { name: 'safety-flow-api', type: 'drwxr-xr-x', size: '12.8MB' },
                { name: 'astrowatch-v2', type: 'drwxr-xr-x', size: '2.1MB' },
                { name: 'caronice-mobile', type: 'drwxr-xr-x', size: '840KB' },
              ].map((item, i) => (
                <ScrollReveal key={item.name} variant="fade-left" delay={i * 60}>
                  <div className="group flex items-center justify-between p-2 hover:bg-white/5 rounded transition-colors cursor-default">
                    <div className="flex items-center gap-4">
                      <span className="text-terminal-muted/40">{item.type}</span>
                      <span className="text-white group-hover:text-neon-cyan transition-colors">{item.name}</span>
                    </div>
                    <span className="text-terminal-muted/40">{item.size}</span>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      </ScrollReveal>

      <ScrollReveal variant="fade-in" delay={100}>
        <div className="pt-10">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-xs text-terminal-muted hover:text-neon-cyan transition-colors group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            <span>cd ..</span>
          </Link>
        </div>
      </ScrollReveal>
    </div>
  );
}
