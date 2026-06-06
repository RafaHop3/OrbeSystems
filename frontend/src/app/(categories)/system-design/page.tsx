import { GitBranch, ArrowLeft, Layers, Network } from 'lucide-react';
import Link from 'next/link';
import ScrollReveal from '@/components/ScrollReveal';

export default function SystemDesignPage() {
  return (
    <div className="space-y-8">
      <ScrollReveal variant="fade-up" delay={0}>
        <section className="space-y-4 font-mono">
          <div className="flex items-center gap-3 text-neon-purple mb-2">
            <GitBranch size={20} />
            <h1 className="text-2xl font-bold tracking-tight uppercase">System Design</h1>
          </div>

          <div className="space-y-4 opacity-80">
            <p className="flex items-center gap-2">
              <span className="text-neon-cyan">$</span>
              <span>./describe_architecture.sh</span>
            </p>
            <div className="text-terminal-muted leading-relaxed space-y-4 border-l-2 border-neon-purple/30 pl-4 py-2 bg-neon-purple/5">
              <p>
                &gt; Projeto de sistemas distribuídos escaláveis, com foco em alta disponibilidade,
                tolerância a falhas e baixa latência.
              </p>
              <p>
                &gt; Design de APIs RESTful e microsserviços, aplicando padrões como CQRS, Event
                Sourcing e Domain-Driven Design (DDD) em ambientes de produção críticos.
              </p>
            </div>
          </div>
        </section>
      </ScrollReveal>

      <ScrollReveal variant="fade-up" delay={120}>
        <section className="space-y-6 pt-6 border-t border-terminal-border/30 font-mono">
          <div className="space-y-2">
            <p className="flex items-center gap-2">
              <span className="text-neon-cyan">$</span>
              <span>ls -la ./architecture</span>
            </p>

            <div className="grid grid-cols-1 gap-2 mt-4 text-xs md:text-sm">
              {[
                { name: 'microservices-topology', type: '-rwxr-xr-x', size: '4.8MB', icon: Network },
                { name: 'api-gateway-config', type: '-rwxr-xr-x', size: '720KB', icon: Layers },
                { name: 'event-sourcing-schema', type: '-rwxr-xr-x', size: '2.1MB', icon: GitBranch },
                { name: 'load-balancer-rules', type: '-rwxr-xr-x', size: '310KB', icon: Network },
              ].map((item, i) => (
                <ScrollReveal key={item.name} variant="fade-left" delay={i * 60}>
                  <div
                    className="group flex items-center justify-between p-2 hover:bg-neon-purple/5 rounded transition-colors cursor-default border border-transparent hover:border-neon-purple/10"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-neon-purple/40">{item.type}</span>
                      <item.icon size={12} className="text-neon-purple/50 group-hover:text-neon-purple transition-colors" />
                      <span className="text-white group-hover:text-neon-purple transition-colors">{item.name}</span>
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
        <div className="pt-10 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs text-terminal-muted hover:text-neon-purple transition-colors group font-mono"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            <span>cd ..</span>
          </Link>
          <div className="flex items-center gap-2 opacity-20">
            <Layers size={12} className="text-neon-purple" />
            <span className="font-mono text-[10px] uppercase">Infrastructure as Code</span>
          </div>
        </div>
      </ScrollReveal>
    </div>
  );
}
