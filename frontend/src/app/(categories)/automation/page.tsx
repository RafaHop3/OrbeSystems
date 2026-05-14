import { Zap, ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function AutomationPage() {
  return (
    <div className="space-y-8">
      <section className="space-y-4 font-mono">
        <div className="flex items-center gap-3 text-neon-cyan mb-2">
          <Zap size={20} />
          <h1 className="text-2xl font-bold tracking-tight uppercase">Automation</h1>
        </div>
        
        <div className="space-y-4 opacity-80">
          <p className="flex items-center gap-2">
            <span className="text-neon-cyan">$</span> 
            <span>sh run_workflows.sh</span>
          </p>
          <div className="text-terminal-muted leading-relaxed space-y-2 border border-neon-cyan/20 p-4 bg-neon-cyan/5 rounded">
            <p>&gt; Automatização de processos repetitivos, pipelines de CI/CD e infraestrutura como código (IaC).</p>
            <p>&gt; Otimização de tempo e recursos através de scripts inteligentes e orquestração de containers.</p>
            <div className="flex items-center gap-2 mt-4 text-[10px] text-neon-cyan animate-pulse">
              <RefreshCw size={10} className="animate-spin" />
              <span>Pipeline Status: Active</span>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6 pt-6 border-t border-terminal-border/30 font-mono text-xs md:text-sm">
        <div className="space-y-2">
          <p className="flex items-center gap-2">
            <span className="text-neon-cyan">$</span> 
            <span>ls -la ./scripts</span>
          </p>
          
          <div className="grid grid-cols-1 gap-2 mt-4">
            {[
              { name: 'backup-sync.py', type: '-rwxr-xr-x', size: '15KB' },
              { name: 'deploy-prod.yaml', type: '-rwxr-xr-x', size: '2.5KB' },
              { name: 'log-analyzer.js', type: '-rwxr-xr-x', size: '1.8MB' },
              { name: 'docker-compose-v3', type: '-rwxr-xr-x', size: '4KB' },
            ].map((item) => (
              <div key={item.name} className="group flex items-center justify-between p-2 hover:bg-neon-cyan/5 rounded transition-colors cursor-default border-b border-terminal-border/10">
                <div className="flex items-center gap-4">
                  <span className="text-neon-cyan/40">{item.type}</span>
                  <span className="text-white group-hover:text-neon-cyan transition-colors">{item.name}</span>
                </div>
                <span className="text-terminal-muted/40">{item.size}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="pt-10">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-xs text-terminal-muted hover:text-neon-cyan transition-colors group font-mono"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
          <span>cd ..</span>
        </Link>
      </div>
    </div>
  );
}
