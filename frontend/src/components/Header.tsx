'use client';

import { useState } from 'react';
import { Menu, X, FileText, LayoutGrid, Mail, LogIn, LogOut, Crown, Zap, Building2, ChevronDown, Monitor, Terminal } from 'lucide-react';
import Link from 'next/link';
import OrbeLogo from './OrbeLogo';
import { useAuth } from '@/hooks/useAuth';
import { logoutAction } from '@/lib/auth-actions';

const NAV_LINKS = [
  { label: 'Workspace', href: '/workspace', icon: Monitor },
  { label: 'Repositórios', href: '/repositorios', icon: FileText },
  { label: 'Skills', href: '/skills', icon: LayoutGrid },
  { label: 'Contato', href: '/#contact', icon: Mail },
];

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const { user, loading } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-renaissance-border backdrop-blur-md bg-renaissance-bg/85 shadow-md">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo area */}
        <Link href="/" className="flex items-center gap-3 group z-50">
          <div className="relative">
            <div className="w-10 h-10 flex items-center justify-center transition-all duration-300">
              <OrbeLogo className="w-8 h-8" />
            </div>
          </div>
          <span className="font-cinzel text-sm font-bold tracking-widest text-[#dfd2b8] group-hover:text-renaissance-gold-light transition-colors uppercase">
            ORBE<span className="text-renaissance-gold">SYSTEMS</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-1.5 font-cinzel text-[11px] uppercase tracking-widest text-renaissance-muted hover:text-renaissance-gold transition-all duration-200 group"
            >
              <Icon size={12} className="group-hover:scale-110 transition-transform text-renaissance-gold/80" />
              <span>{label}</span>
            </Link>
          ))}

          {/* Premium Tools dropdown — visible only to premium users */}
          {user?.role === 'premium' && (
            <div style={{ position: 'relative' }} onMouseEnter={() => setIsToolsOpen(true)} onMouseLeave={() => setIsToolsOpen(false)}>
              <button
                className="flex items-center gap-2 font-cinzel text-[11px] uppercase tracking-widest text-renaissance-gold hover:text-white transition-all duration-200 group"
              >
                <Zap size={12} className="group-hover:scale-110 transition-transform" />
                <span>Ferramentas</span>
                <ChevronDown size={11} style={{ transition: 'transform 0.2s', transform: isToolsOpen ? 'rotate(180deg)' : 'none' }} />
              </button>
              {isToolsOpen && (
                <div style={{
                  position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
                  marginTop: '8px', background: '#181310', border: '1px solid rgba(197,160,89,0.3)',
                  borderRadius: '6px', padding: '8px', minWidth: '200px', zIndex: 100,
                  boxShadow: '0 20px 40px rgba(0,0,0,0.65)',
                }}>
                  <Link
                    href="/imortal"
                    className="flex items-center gap-3 px-3 py-2.5 rounded hover:bg-white/5 transition-colors"
                    onClick={() => setIsToolsOpen(false)}
                  >
                    <Zap size={14} color="#c5a059" />
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#f1e7d0', fontFamily: 'var(--font-cinzel), serif' }}>IMORTAL</div>
                      <div style={{ fontSize: '10px', color: '#8e7f73' }}>Formal Verification + Z3</div>
                    </div>
                  </Link>
                  <Link
                    href="/ferramentas-premium/imobverse"
                    className="flex items-center gap-3 px-3 py-2.5 rounded hover:bg-white/5 transition-colors"
                    onClick={() => setIsToolsOpen(false)}
                  >
                    <Building2 size={14} color="#c5a059" />
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#f1e7d0', fontFamily: 'var(--font-cinzel), serif' }}>Imobverse</div>
                      <div style={{ fontSize: '10px', color: '#8e7f73' }}>Proptech + Reputation Engine</div>
                    </div>
                  </Link>
                  <Link
                    href="/ferramentas-premium/powershell-bot"
                    className="flex items-center gap-3 px-3 py-2.5 rounded hover:bg-white/5 transition-colors"
                    onClick={() => setIsToolsOpen(false)}
                  >
                    <Terminal size={14} color="#c5a059" />
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#f1e7d0', fontFamily: 'var(--font-cinzel), serif' }}>PowerShell Bot</div>
                      <div style={{ fontSize: '10px', color: '#8e7f73' }}>SecDevOps + SAST Auditor</div>
                    </div>
                  </Link>
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Right side controls */}
        <div className="flex items-center gap-3 z-50">
          {/* Status badge */}
          <div className="hidden sm:flex items-center gap-2 font-cinzel text-[9px] text-renaissance-gold border border-renaissance-gold/30 rounded px-3 py-1 bg-renaissance-gold/5">
            <span className="w-1 h-1 rounded-full bg-renaissance-gold animate-pulse" />
            <span className="tracking-widest uppercase">GALLERIA APERTA</span>
          </div>

          {/* Login & Premium buttons (desktop) */}
          <div className="hidden md:flex items-center gap-2">
            {!user && (
              <Link
                href="/assinar"
                className="flex items-center gap-1.5 font-cinzel text-[9px] uppercase tracking-widest text-[#dfd2b8] hover:text-renaissance-gold-light transition-colors border border-renaissance-gold/30 rounded px-3 py-1.5 hover:bg-renaissance-gold/10"
              >
                <Crown size={11} className="text-renaissance-gold" />
                <span>Premium</span>
              </Link>
            )}
            {loading ? (
              <span className="flex items-center gap-1.5 font-cinzel text-[9px] uppercase tracking-widest text-renaissance-muted border border-renaissance-border/30 rounded px-3 py-1.5">
                ...
              </span>
            ) : user ? (
              <button
                onClick={async () => {
                  await logoutAction();
                  window.location.href = '/';
                }}
                className="flex items-center gap-1.5 font-cinzel text-[9px] uppercase tracking-widest text-renaissance-muted hover:text-renaissance-gold transition-colors border border-renaissance-border/40 rounded px-3 py-1.5 hover:border-renaissance-gold/30 hover:bg-renaissance-gold/5"
              >
                <LogOut size={11} className="text-renaissance-gold" />
                <span>Logout</span>
              </button>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 font-cinzel text-[9px] uppercase tracking-widest text-renaissance-muted hover:text-renaissance-gold transition-colors border border-renaissance-border/40 rounded px-3 py-1.5 hover:border-renaissance-gold/30 hover:bg-renaissance-gold/5"
              >
                <LogIn size={11} className="text-renaissance-gold" />
                <span>Login</span>
              </Link>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-1.5 text-renaissance-muted hover:text-renaissance-gold transition-colors"
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
            {/* Premium tools links for mobile */}
            {user?.role === 'premium' && (
              <>
                <Link
                  href="/imortal"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 font-mono text-xs text-neon-purple hover:text-white transition-colors duration-200 tracking-wider py-3"
                >
                  <Zap size={16} />
                  <span>IMORTAL</span>
                </Link>
                <Link
                  href="/ferramentas-premium/imobverse"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 font-mono text-xs text-neon-purple hover:text-white transition-colors duration-200 tracking-wider py-3"
                >
                  <Building2 size={16} />
                  <span>Imobverse</span>
                </Link>
                <Link
                  href="/ferramentas-premium/powershell-bot"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 font-mono text-xs text-neon-cyan hover:text-white transition-colors duration-200 tracking-wider py-3"
                >
                  <Terminal size={16} />
                  <span>PowerShell Bot</span>
                </Link>
              </>
            )}
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
