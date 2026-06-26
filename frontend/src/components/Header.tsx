'use client';

import { useState } from 'react';
import { Menu, X, FileText, LayoutGrid, Mail, LogIn, LogOut, Crown, Zap, Building2, ChevronDown, Monitor, Terminal, Sparkles, Cpu } from 'lucide-react';
import Link from 'next/link';
import MetallicNavyCanvas from './MetallicNavyCanvas';
import { useAuth } from '@/hooks/useAuth';
import { logoutAction } from '@/lib/auth-actions';

const NAV_LINKS = [
  { label: 'Workspace', href: '/workspace', icon: Monitor },
  { label: 'Repositórios', href: '/repositorios', icon: FileText },
  { label: 'Skills', href: '/skills', icon: LayoutGrid },
  { label: 'Inovações 🔬', href: '/inovacoes', icon: Cpu },
  { label: 'Kids 🚀', href: '/kids', icon: Sparkles },
  { label: 'Contato', href: '/#contact', icon: Mail },
];


export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const { user, loading } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-navy-metallic/20 backdrop-blur-md bg-black/70">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group z-50">
          <div className="relative w-9 h-9 rounded-full overflow-hidden">
            <MetallicNavyCanvas variant="mini" className="w-full h-full" />
          </div>
          <span className="font-sans text-sm font-medium tracking-wide text-white/85 group-hover:text-navy-glow transition-colors">
            ORBE<span className="text-navy-glow">SYSTEMS</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-navy-mist/70 hover:text-navy-glow transition-all duration-200 group"
            >
              <Icon size={12} className="group-hover:scale-110 transition-transform text-blue-400/80" />
              <span>{label}</span>
            </Link>
          ))}

          {/* Premium Tools dropdown — visible only to premium users */}
          {user?.role === 'premium' && (
            <div className="relative" onMouseEnter={() => setIsToolsOpen(true)} onMouseLeave={() => setIsToolsOpen(false)}>
              <button
                className="flex items-center gap-2 font-cinzel text-[11px] uppercase tracking-widest text-blue-400 hover:text-white transition-all duration-200 group"
              >
                <Zap size={12} className="group-hover:scale-110 transition-transform" />
                <span>Ferramentas</span>
                <ChevronDown size={11} className={`transition-transform ${isToolsOpen ? 'rotate-180' : ''}`} />
              </button>
              {isToolsOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-black border border-blue-400/30 rounded-lg p-2 min-w-[200px] z-100 shadow-[0_20px_40px_rgba(0,0,0,0.65)]">
                  <Link
                    href="/imortal"
                    className="flex items-center gap-3 px-3 py-2.5 rounded hover:bg-blue-500/10 transition-colors"
                    onClick={() => setIsToolsOpen(false)}
                  >
                    <Zap size={14} className="text-blue-400" />
                    <div>
                      <div className="text-[11px] font-bold text-white font-cinzel">IMORTAL</div>
                      <div className="text-[10px] text-white/60">Formal Verification + Z3</div>
                    </div>
                  </Link>
                  <Link
                    href="/ferramentas-premium/imobverse"
                    className="flex items-center gap-3 px-3 py-2.5 rounded hover:bg-blue-500/10 transition-colors"
                    onClick={() => setIsToolsOpen(false)}
                  >
                    <Building2 size={14} className="text-blue-400" />
                    <div>
                      <div className="text-[11px] font-bold text-white font-cinzel">Imobverse</div>
                      <div className="text-[10px] text-white/60">Proptech + Reputation Engine</div>
                    </div>
                  </Link>
                  <Link
                    href="/ferramentas-premium/powershell-bot"
                    className="flex items-center gap-3 px-3 py-2.5 rounded hover:bg-blue-500/10 transition-colors"
                    onClick={() => setIsToolsOpen(false)}
                  >
                    <Terminal size={14} className="text-blue-400" />
                    <div>
                      <div className="text-[11px] font-bold text-white font-cinzel">PowerShell Bot</div>
                      <div className="text-[10px] text-white/60">SecDevOps + SAST Auditor</div>
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
          <div className="hidden sm:flex items-center gap-2 font-cinzel text-[9px] text-blue-400 border border-blue-400/30 rounded px-3 py-1 bg-blue-500/5">
            <span className="w-1 h-1 rounded-full bg-blue-400 animate-pulse" />
            <span className="tracking-widest uppercase">GALLERIA APERTA</span>
          </div>

          {/* Login & Premium buttons (desktop) */}
          <div className="hidden md:flex items-center gap-2">
            {!user && (
              <Link
                href="/assinar"
                className="flex items-center gap-1.5 font-cinzel text-[9px] uppercase tracking-widest text-white/80 hover:text-blue-400 transition-colors border border-blue-400/30 rounded px-3 py-1.5 hover:bg-blue-500/10"
              >
                <Crown size={11} className="text-blue-400" />
                <span>Premium</span>
              </Link>
            )}
            {loading ? (
              <span className="flex items-center gap-1.5 font-cinzel text-[9px] uppercase tracking-widest text-white/60 border border-white/10 rounded px-3 py-1.5">
                ...
              </span>
            ) : user ? (
              <button
                onClick={async () => {
                  await logoutAction();
                  window.location.href = '/';
                }}
                className="flex items-center gap-1.5 font-cinzel text-[9px] uppercase tracking-widest text-white/60 hover:text-blue-400 transition-colors border border-white/10 rounded px-3 py-1.5 hover:border-blue-400/30 hover:bg-blue-500/5"
              >
                <LogOut size={11} className="text-blue-400" />
                <span>Logout</span>
              </button>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 font-cinzel text-[9px] uppercase tracking-widest text-white/60 hover:text-blue-400 transition-colors border border-white/10 rounded px-3 py-1.5 hover:border-blue-400/30 hover:bg-blue-500/5"
              >
                <LogIn size={11} className="text-blue-400" />
                <span>Login</span>
              </Link>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-1.5 text-white/60 hover:text-blue-400 transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav Overlay */}
      {isMobileMenuOpen && (
        <nav className="md:hidden absolute top-full left-0 right-0 border-b border-white/10 bg-black/95 backdrop-blur-md flex flex-col px-6 py-4 gap-4 animate-fade-in-up">
          {NAV_LINKS.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 font-mono text-xs text-white/60 hover:text-blue-400 transition-colors duration-200 tracking-wider py-3 border-b border-white/5 last:border-none"
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
                  className="flex items-center gap-3 font-mono text-xs text-blue-400 hover:text-white transition-colors duration-200 tracking-wider py-3"
                >
                  <Zap size={16} />
                  <span>IMORTAL</span>
                </Link>
                <Link
                  href="/ferramentas-premium/imobverse"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 font-mono text-xs text-blue-400 hover:text-white transition-colors duration-200 tracking-wider py-3"
                >
                  <Building2 size={16} />
                  <span>Imobverse</span>
                </Link>
                <Link
                  href="/ferramentas-premium/powershell-bot"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 font-mono text-xs text-blue-400 hover:text-white transition-colors duration-200 tracking-wider py-3"
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
                className="flex items-center gap-3 font-mono text-xs text-blue-400 hover:text-white transition-colors duration-200 tracking-wider py-3"
              >
                <Crown size={16} />
                <span>Assinar Premium</span>
              </Link>
            )}
            {loading ? (
              <span className="flex items-center gap-3 font-mono text-xs text-white/60 py-3">
                ...
              </span>
            ) : user ? (
              <button
                onClick={async () => {
                  setIsMobileMenuOpen(false);
                  await logoutAction();
                  window.location.href = '/';
                }}
                className="flex items-center gap-3 font-mono text-xs text-white/60 hover:text-blue-400 transition-colors duration-200 tracking-wider py-3"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 font-mono text-xs text-white/60 hover:text-blue-400 transition-colors duration-200 tracking-wider py-3"
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
