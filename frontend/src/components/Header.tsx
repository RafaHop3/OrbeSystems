'use client';

import { useState } from 'react';
import { Menu, X, FileText, LayoutGrid, Mail, LogIn, LogOut, Crown } from 'lucide-react';
import Link from 'next/link';
import OrbeLogo from './OrbeLogo';
import { useAuth } from '@/hooks/useAuth';
import { logoutAction } from '@/lib/auth-actions';

const NAV_LINKS = [
  { label: 'Projetos', href: '/#projects', icon: FileText },
  { label: 'Skills', href: '/skills', icon: LayoutGrid },
  { label: 'Contato', href: '/#contact', icon: Mail },
];

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, loading } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-terminal-border backdrop-blur-md bg-terminal-bg/80">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo area */}
        <Link href="/" className="flex items-center gap-3 group z-50">
          <div className="relative">
            <div className="w-10 h-10 flex items-center justify-center transition-all duration-300">
              <OrbeLogo className="w-8 h-8" />
            </div>
          </div>
          <span className="font-mono text-sm font-bold tracking-tighter text-white group-hover:text-neon-cyan transition-colors">
            ORBE<span className="text-neon-cyan">SYSTEMS</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-terminal-muted hover:text-neon-cyan transition-all duration-200 group"
            >
              <Icon size={14} className="group-hover:scale-110 transition-transform" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        {/* Right side controls */}
        <div className="flex items-center gap-3 z-50">
          {/* Status badge */}
          <div className="hidden sm:flex items-center gap-2 font-mono text-[10px] text-terminal-muted border border-neon-green/30 rounded-full px-3 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse-neon" />
            <span className="text-neon-green">SYSTEM ACTIVE</span>
          </div>

          {/* Login & Premium buttons (desktop) */}
          <div className="hidden md:flex items-center gap-2">
            {!user && (
              <Link
                href="/assinar"
                className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-neon-purple hover:text-white transition-colors border border-neon-purple/30 rounded-full px-3 py-1.5 hover:bg-neon-purple/10"
              >
                <Crown size={12} />
                <span>Premium</span>
              </Link>
            )}
            {loading ? (
              <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-terminal-muted border border-terminal-border/30 rounded-full px-3 py-1.5">
                ...
              </span>
            ) : user ? (
              <button
                onClick={async () => {
                  await logoutAction();
                  window.location.href = '/';
                }}
                className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-terminal-muted hover:text-neon-cyan transition-colors border border-terminal-border/30 rounded-full px-3 py-1.5 hover:border-neon-cyan/30 hover:bg-neon-cyan/5"
              >
                <LogOut size={12} />
                <span>Logout</span>
              </button>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-terminal-muted hover:text-neon-cyan transition-colors border border-terminal-border/30 rounded-full px-3 py-1.5 hover:border-neon-cyan/30 hover:bg-neon-cyan/5"
              >
                <LogIn size={12} />
                <span>Login</span>
              </Link>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-1.5 text-terminal-muted hover:text-neon-cyan transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav Overlay */}
      {isMobileMenuOpen && (
        <nav className="md:hidden absolute top-full left-0 right-0 border-b border-terminal-border bg-terminal-surface/95 backdrop-blur-md flex flex-col px-6 py-4 gap-4 animate-fade-in-up">
          {NAV_LINKS.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 font-mono text-xs text-terminal-muted hover:text-neon-cyan transition-colors duration-200 tracking-wider py-3 border-b border-white/5 last:border-none"
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
          {/* Mobile Auth Links */}
          <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
            {!user && (
              <Link
                href="/assinar"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 font-mono text-xs text-neon-purple hover:text-white transition-colors duration-200 tracking-wider py-3"
              >
                <Crown size={16} />
                <span>Assinar Premium</span>
              </Link>
            )}
            {loading ? (
              <span className="flex items-center gap-3 font-mono text-xs text-terminal-muted py-3">
                ...
              </span>
            ) : user ? (
              <button
                onClick={async () => {
                  setIsMobileMenuOpen(false);
                  await logoutAction();
                  window.location.href = '/';
                }}
                className="flex items-center gap-3 font-mono text-xs text-terminal-muted hover:text-neon-cyan transition-colors duration-200 tracking-wider py-3"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 font-mono text-xs text-terminal-muted hover:text-neon-cyan transition-colors duration-200 tracking-wider py-3"
              >
                <LogIn size={16} />
                <span>Login</span>
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
