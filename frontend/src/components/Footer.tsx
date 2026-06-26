'use client';

import { useState } from 'react';
import { Github, Mail, Shield, Check } from 'lucide-react';

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
    <footer className="border-t border-renaissance-border mt-24 relative bg-[#130f0d]">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-8 right-8 z-[100] animate-fade-in-up">
          <div className="bg-renaissance-surface border-2 border-renaissance-gold px-4 py-2.5 rounded shadow-gilt flex items-center gap-3">
            <Check size={14} className="text-renaissance-gold" />
            <span className="font-cinzel text-[10px] text-renaissance-gold uppercase tracking-widest">
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
              <span className="font-cinzel text-sm text-[#dfd2b8] tracking-widest uppercase font-bold">
                ORBE<span className="text-renaissance-gold">SYSTEMS</span>
              </span>
            </div>
            <p className="font-serif text-xs italic text-renaissance-muted">
              L’Architettura dell’Informazione &amp; Ingegneria di Codice
            </p>
          </div>

          {/* Social links & Contact */}
          <div id="contact" className="flex flex-col md:flex-row items-center gap-4">
            <a
              href={`mailto:${email}`}
              className="font-serif text-sm text-renaissance-muted transition-colors hover:text-white hidden md:block"
            >
              {email}
            </a>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/theorbesystems-sketch"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="w-9 h-9 rounded border border-renaissance-border text-renaissance-muted flex items-center justify-center transition-all duration-300 hover:text-white hover:border-renaissance-gold hover:shadow-gilt"
              >
                <Github size={15} />
              </a>
              <button
                onClick={handleCopyEmail}
                aria-label="Copy Email"
                className="w-9 h-9 rounded border border-renaissance-border text-renaissance-muted flex items-center justify-center transition-all duration-300 hover:text-renaissance-gold hover:border-renaissance-gold hover:shadow-gilt"
              >
                <Mail size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div className="mt-10 pt-6 border-t border-renaissance-border/55 flex flex-col md:flex-row items-center justify-between gap-2">
          <p className="font-serif text-xs text-renaissance-muted/60">
            &copy; {year} Orbe Systems. Todos os direitos reservados.
          </p>
          <p className="font-cinzel text-[10px] tracking-widest text-renaissance-gold/50">
            orbesystems.com.br
          </p>
        </div>
      </div>
    </footer>
  );
}
