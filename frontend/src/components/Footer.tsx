'use client';

import { useState } from 'react';
import { Github, Mail, Shield, Check, Command } from 'lucide-react';

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
    <footer className="mt-24 relative glass-magnetic border-t-2 border-glow-purple">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-8 right-8 z-[100] animate-fade-in-up">
          <div className="bg-terminal-bg border-glow-cyan px-4 py-2.5 rounded flex items-center gap-3">
            <Check size={14} className="text-neon-cyan" />
            <span className="font-mono text-[10px] text-neon-cyan uppercase tracking-widest">
              &gt; Email copiado com sucesso.
            </span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Branding */}
          <div className="flex flex-col items-center md:items-start gap-3">
            <div className="flex items-center gap-3">
              <Shield size={24} className="text-neon-cyan animate-pulse-neon" />
              <span className="font-grotesk text-lg text-white font-bold tracking-widest uppercase flex items-center gap-2">
                The Orbe<span className="text-neon-cyan font-outfit">Systems</span>
              </span>
            </div>
            <p className="font-mono text-xs text-slate-400">
              Arquitetura de Informação & Engenharia de Código
            </p>
          </div>

          {/* Social links & Contact */}
          <div id="contact" className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex items-center gap-2 text-neon-purple font-mono text-xs hidden md:flex border border-glow-purple px-4 py-1.5 rounded-full bg-black/40">
              <Command size={14} /> SYS.CONTACT
            </div>
            <a
              href={`mailto:${email}`}
              className="font-mono text-sm text-slate-400 transition-colors hover:text-neon-cyan hidden md:block"
            >
              {email}
            </a>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/theorbesystems-sketch"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="w-10 h-10 rounded border border-glow-cyan/30 text-neon-cyan flex items-center justify-center transition-all duration-300 hover:text-neon-cyan hover:border-glow-cyan hover:shadow-neon-cyan bg-black/50"
              >
                <Github size={16} />
              </a>
              <button
                onClick={handleCopyEmail}
                aria-label="Copy Email"
                className="w-10 h-10 rounded border border-glow-purple/30 text-neon-purple flex items-center justify-center transition-all duration-300 hover:text-neon-purple hover:border-glow-purple hover:shadow-neon-cyan bg-black/50"
              >
                <Mail size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div className="mt-10 pt-6 border-t border-slate-800/50 flex flex-col md:flex-row items-center justify-between gap-2">
          <p className="font-mono text-xs text-slate-500">
            &copy; {year} The Orbe Systems. Todos os direitos reservados.
          </p>
          <p className="font-mono text-[10px] tracking-widest text-neon-cyan/50">
            orbesystems.com.br _
          </p>
        </div>
      </div>
    </footer>
  );
}
