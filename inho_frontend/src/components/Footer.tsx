'use client';

import Link from 'next/link';
import { Github, Mail, Shield, Globe } from 'lucide-react';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-inho-dark border-t border-inho-border">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">

          {/* Brand */}
          <div className="col-span-1 md:col-span-2 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-inho-gold-gradient flex items-center justify-center">
                <span className="font-black text-inho-black text-lg">I</span>
              </div>
              <div>
                <div className="font-black text-xl text-inho-text tracking-widest uppercase">INHO</div>
                <div className="font-mono text-[10px] text-inho-muted tracking-wider uppercase">Finance &amp; Impact</div>
              </div>
            </div>
            <p className="text-inho-muted text-sm leading-relaxed max-w-sm">
              Plataforma de gestão financeira de alta disponibilidade, projetada para gerar impacto social global com transparência e segurança de ponta.
            </p>
            <div className="flex items-center gap-3 mt-2">
              <a href="https://github.com" id="footer-github" target="_blank" rel="noopener noreferrer"
                className="p-2 rounded-lg text-inho-muted hover:text-inho-gold hover:bg-[#FAF8F2] transition-all">
                <Github size={18} />
              </a>
              <a href="mailto:contato@inho.io" id="footer-email"
                className="p-2 rounded-lg text-inho-muted hover:text-inho-gold hover:bg-[#FAF8F2] transition-all">
                <Mail size={18} />
              </a>
              <a href="#" id="footer-global"
                className="p-2 rounded-lg text-inho-muted hover:text-inho-gold hover:bg-[#FAF8F2] transition-all">
                <Globe size={18} />
              </a>
            </div>
          </div>

          {/* Platform */}
          <div className="flex flex-col gap-3">
            <h3 className="text-inho-text font-semibold text-sm uppercase tracking-wider">Plataforma</h3>
            {['Sobre o INHO', 'Impacto Social', 'Tecnologia', 'Segurança'].map(item => (
              <Link key={item} href="#"
                className="text-inho-muted hover:text-inho-gold text-sm transition-colors">
                {item}
              </Link>
            ))}
          </div>

          {/* Legal */}
          <div className="flex flex-col gap-3">
            <h3 className="text-inho-text font-semibold text-sm uppercase tracking-wider">Legal</h3>
            {['Privacidade', 'Termos de Uso', 'Cookies', 'Conformidade'].map(item => (
              <Link key={item} href="#"
                className="text-inho-muted hover:text-inho-gold text-sm transition-colors">
                {item}
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-inho-border pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-inho-muted text-sm">
            <Shield size={14} className="text-inho-gold" />
            <span>© {year} <strong className="text-inho-text">INHO by OrbeSystems</strong> — Todos os direitos reservados</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-inho-green rounded-full animate-pulse" />
            <span className="font-mono text-xs text-inho-muted">Sistema Operacional</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
