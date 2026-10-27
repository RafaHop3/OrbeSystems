'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Menu, X, Globe, Shield, TrendingUp } from 'lucide-react';
import clsx from 'clsx';
import OrbeLogo from './OrbeLogo';

const navLinks = [
  { href: '#about', label: 'Sobre', icon: Globe },
  { href: '#impact', label: 'Impacto', icon: TrendingUp },
  { href: '#security', label: 'Segurança', icon: Shield },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <header
      className={clsx(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
        scrolled
          ? 'bg-inho-black/90 backdrop-blur-xl border-b border-inho-border shadow-inho-card'
          : 'bg-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">

          {/* ── Logo ── */}
          <Link href="/" id="inho-logo" className="flex items-center gap-3 group">
            <OrbeLogo className="w-12 h-12" variant="header" />
            <div className="flex flex-col">
              <span className="font-black text-xl text-inho-text tracking-widest uppercase">INHO</span>
              <span className="font-mono text-[10px] text-inho-muted tracking-wider uppercase">
                Finance &amp; Impact
              </span>
            </div>
          </Link>

          {/* ── Desktop Nav ── */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                id={`nav-${label.toLowerCase()}`}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-inho-muted hover:text-inho-text hover:bg-[#FAF8F2] transition-all duration-200 text-sm font-medium uppercase tracking-wider"
              >
                <Icon size={14} />
                {label}
              </Link>
            ))}
          </nav>

          {/* ── CTA ── */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              id="header-login"
              className="px-4 py-2 text-sm font-medium text-inho-muted hover:text-inho-gold transition-colors duration-200"
            >
              Entrar
            </Link>
            <Link
              href="https://orbesystems.com.br"
              id="header-register"
              className="px-5 py-2.5 bg-inho-gold-gradient text-white font-bold text-sm rounded-xl hover:shadow-inho-gold transition-all duration-300 hover:-translate-y-0.5"
            >
              Assinar Premium
            </Link>
          </div>

          {/* ── Mobile Toggle ── */}
          <button
            id="header-mobile-toggle"
            className="md:hidden p-2 text-inho-muted hover:text-inho-gold transition-colors"
            onClick={() => setOpen(prev => !prev)}
            aria-label="Toggle menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* ── Mobile Menu ── */}
      <div
        className={clsx(
          'md:hidden overflow-hidden transition-all duration-300 ease-in-out',
          open ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="bg-inho-dark/95 backdrop-blur-xl border-t border-inho-border px-6 py-4 flex flex-col gap-2">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-inho-muted hover:text-inho-gold hover:bg-[#FAF8F2] transition-all text-sm font-medium uppercase tracking-wider"
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
          <div className="mt-3 pt-3 border-t border-inho-border flex flex-col gap-2">
            <Link href="/login" id="mobile-login"
              className="px-4 py-3 text-center text-sm text-inho-muted hover:text-inho-gold transition-colors rounded-xl"
            >
              Entrar
            </Link>
            <Link href="https://orbesystems.com.br" id="mobile-register"
              className="px-4 py-3 text-center bg-inho-gold-gradient text-white font-bold text-sm rounded-xl"
            >
              Assinar Premium
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
