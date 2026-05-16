'use client';

import { useState } from 'react';
import { Github, Mail, Server, Check } from 'lucide-react';

export default function Footer() {
  const [showToast, setShowToast] = useState(false);
  const year = new Date().getFullYear();
  const email = 'contato@orbesystems.com.br';

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.preventDefault();
    navigator.clipboard.writeText(email);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <footer className="border-t border-terminal-border mt-24 relative">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-8 right-8 z-[100] animate-fade-in-up">
          <div className="bg-terminal-surface border border-neon-green/50 px-4 py-2 rounded shadow-[0_0_20px_rgba(57,255,20,0.1)] flex items-center gap-3">
            <Check size={14} className="text-neon-green" />
            <span className="font-mono text-xs text-neon-green uppercase tracking-widest">
              &gt; Email copiado com sucesso.
            </span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Branding */}
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="flex items-center gap-2">
              <Server size={14} className="text-neon-cyan" />
              <span className="font-mono text-sm text-neon-cyan font-semibold uppercase tracking-tighter">
                Orbe Systems
              </span>
            </div>
            <p className="font-mono text-xs text-terminal-muted">
              Software Engineering &amp; Arquitetura de Dados
            </p>
          </div>

          {/* Social links & Contact */}
          <div id="contact" className="flex flex-col md:flex-row items-center gap-4">
            <a
              href={`mailto:${email}`}
              className="font-mono text-sm text-terminal-muted transition-colors hover:text-white hidden md:block"
            >
              {email}
            </a>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/theorbesystems-sketch"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="w-9 h-9 rounded border border-terminal-border text-terminal-muted flex items-center justify-center transition-all duration-300 hover:text-white hover:border-white/40"
              >
                <Github size={15} />
              </a>
              <button
                onClick={handleCopyEmail}
                aria-label="Copy Email"
                className="w-9 h-9 rounded border border-terminal-border text-terminal-muted flex items-center justify-center transition-all duration-300 hover:text-neon-green hover:border-neon-green/40 hover:shadow-neon-green"
              >
                <Mail size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div className="mt-10 pt-6 border-t border-terminal-border/50 flex flex-col md:flex-row items-center justify-between gap-2">
          <p className="font-mono text-xs text-terminal-muted/50">
            &copy; {year} Orbe Systems. Todos os direitos reservados.
          </p>
          <p className="font-mono text-xs text-terminal-muted/30">
            <span className="text-neon-cyan/40">exit 0</span>
            {' — '}
            orbesystems.com.br
          </p>
        </div>
      </div>
    </footer>
  );
}
