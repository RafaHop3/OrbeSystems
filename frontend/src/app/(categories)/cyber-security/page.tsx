import { Shield, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import ScrollReveal from '@/components/ScrollReveal';

export default function CyberSecurityPage() {
  return (
    <div className="space-y-8">
      <ScrollReveal variant="fade-up" delay={0}>
        <section className="space-y-4">
          <div className="flex items-center gap-3 text-neon-green mb-2">
            <Shield size={20} />
            <h1 className="text-2xl font-bold tracking-tight uppercase">Cyber Security</h1>
          </div>
          
          <div className="space-y-2 opacity-80 font-mono">
            <p className="flex items-center gap-2">
              <span className="text-neon-cyan">$</span> 
              <span>./show_vision.sh</span>
            </p>
            <p className="text-terminal-muted leading-relaxed">
              Proteção de ativos digitais e infraestrutura crítica. Implementação de defesas em camadas, 
              análise de vulnerabilidades e endurecimento de sistemas (hardening). Foco em garantir 
              confidencialidade, integridade e disponibilidade (CIA Triad).
            </p>
          </div>
        </section>
      </ScrollReveal>

      <ScrollReveal variant="fade-up" delay={120}>
        <section className="space-y-6 pt-6 border-t border-terminal-border/30 font-mono">
          <div className="space-y-2">
            <p className="flex items-center gap-2">
              <span className="text-neon-cyan">$</span> 
              <span>ls -la ./defenses</span>
            </p>
            
            <div className="grid grid-cols-1 gap-2 mt-4 text-xs md:text-sm">
              {[
                { name: 'firewall-rules-v4', type: 'rwxr--r--', size: '42KB' },
                { name: 'intrusion-detection', type: 'rwxr--r--', size: '8.2MB' },
                { name: 'security-audit-report', type: 'rwxr--r--', size: '1.5MB' },
                { name: 'access-control-list', type: 'rwxr--r--', size: '200KB' },
              ].map((item, i) => (
                <ScrollReveal key={item.name} variant="fade-left" delay={i * 60}>
                  <div className="group flex items-center justify-between p-2 hover:bg-neon-green/5 rounded transition-colors cursor-default">
                    <div className="flex items-center gap-4">
                      <span className="text-terminal-muted/40">{item.type}</span>
                      <span className="text-white group-hover:text-neon-green transition-colors">{item.name}</span>
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
            className="inline-flex items-center gap-2 text-xs text-terminal-muted hover:text-neon-green transition-colors group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            <span>cd ..</span>
          </Link>
        </div>
      </ScrollReveal>
    </div>
  );
}
