'use client';

import { useState } from 'react';
import { Menu, X, LayoutGrid, Lightbulb, Mail, LogIn, LogOut, Crown, Zap, Building2, ChevronDown, Terminal, Cpu } from 'lucide-react';
import Link from 'next/link';
import OrbeLogo from './OrbeLogo';
import { useAuth } from '@/hooks/useAuth';
import { logoutAction } from '@/lib/auth-actions';

const NAV_LINKS = [
  { label: 'Workspace', href: '/workspace', icon: LayoutGrid },
  { label: 'Skills', href: '/skills', icon: Cpu },
  { label: 'Inovações', href: '/inovacoes', icon: Lightbulb },
  { label: 'Contato', href: '/#contact', icon: Mail },
];

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const { user, loading } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] glass-magnetic border-b-0 pb-[1px]">
      <div className="absolute bottom-0 left-0 right-0 border-b border-glow-cyan"></div>
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between relative z-10">
        <Link href="/" className="flex items-center gap-3 group z-50">
          <div className="relative w-9 h-9 rounded-full overflow-visible">
            <OrbeLogo className="w-9 h-9 transition-transform group-hover:scale-110 duration-300" variant="header" />
          </div>
          <span className="font-grotesk text-sm font-bold tracking-wide text-white group-hover:text-neon-cyan transition-colors">
            ORBE<span className="text-neon-cyan font-outfit">SYSTEMS</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-slate-400 transition-all duration-300 hover:text-neon-cyan"
            >
              <Icon size={14} className="group-hover:animate-pulse-neon text-neon-purple group-hover:text-neon-cyan transition-colors" />
              <div className="flex">
                {label.split('').map((char, i) => (
                  <span
                    key={i}
                    className="transition-all duration-300 group-hover:-translate-y-[2px]"
                    style={{ transitionDelay: `${i * 30}ms` }}
                  >
                    {char === ' ' ? '\u00A0' : char}
                  </span>
                ))}
              </div>
            </Link>
          ))}

          {/* Premium Tools dropdown — visible only to premium users */}
          {user?.role === 'premium' && (
            <div className="relative" onMouseEnter={() => setIsToolsOpen(true)} onMouseLeave={() => setIsToolsOpen(false)}>
              <button
                className="flex items-center gap-2 font-outfit text-xs font-bold uppercase tracking-widest text-neon-blue hover:text-neon-cyan transition-all duration-200 group"
              >
                <Zap size={14} className="group-hover:scale-110 transition-transform animate-pulse-neon" />
                <span>Ferramentas</span>
                <ChevronDown size={12} className={`transition-transform ${isToolsOpen ? 'rotate-180' : ''}`} />
              </button>
              {isToolsOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 glass-magnetic rounded-lg p-2 min-w-[200px] z-[110] border-glow-cyan animate-fade-in-up">
                  <Link
                    href="/imortal"
                    className="flex items-center gap-3 px-3 py-2.5 rounded hover:bg-neon-blue/10 transition-colors"
                    onClick={() => setIsToolsOpen(false)}
                  >
                    <Zap size={16} className="text-neon-cyan" />
                    <div>
                      <div className="text-[11px] font-bold text-white font-grotesk tracking-wide">IMORTAL</div>
                      <div className="text-[10px] text-slate-400 font-mono">Formal Verification + Z3</div>
                    </div>
                  </Link>
                  <Link
                    href="/ferramentas-premium/imobverse"
                    className="flex items-center gap-3 px-3 py-2.5 rounded hover:bg-neon-blue/10 transition-colors"
                    onClick={() => setIsToolsOpen(false)}
                  >
                    <Building2 size={16} className="text-neon-purple" />
                    <div>
                      <div className="text-[11px] font-bold text-white font-grotesk tracking-wide">Imobverse</div>
                      <div className="text-[10px] text-slate-400 font-mono">Proptech + Reputation Engine</div>
                    </div>
                  </Link>
                  <Link
                    href="/ferramentas-premium/powershell-bot"
                    className="flex items-center gap-3 px-3 py-2.5 rounded hover:bg-neon-blue/10 transition-colors"
                    onClick={() => setIsToolsOpen(false)}
                  >
                    <Terminal size={16} className="text-neon-green" />
                    <div>
                      <div className="text-[11px] font-bold text-white font-grotesk tracking-wide">PowerShell Bot</div>
                      <div className="text-[10px] text-slate-400 font-mono">SecDevOps + SAST Auditor</div>
                    </div>
                  </Link>
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Right side controls */}
        <div className="flex items-center gap-3 z-50">
          {/* Login & Premium buttons (desktop) */}
          <div className="hidden md:flex items-center gap-3">
            {!user && (
              <Link
                href="/assinar"
                className="flex items-center gap-1.5 font-outfit font-bold text-[10px] uppercase tracking-widest text-black bg-neon-cyan hover:bg-white transition-colors border border-glow-cyan rounded px-4 py-2 hover:shadow-neon-cyan"
              >
                <Crown size={12} className="text-black" />
                <span>Premium Access</span>
              </Link>
            )}
            {loading ? (
              <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-slate-500 border border-slate-800 rounded px-3 py-1.5">
                Sys.Wait()
              </span>
            ) : user ? (
              <button
                onClick={async () => {
                  await logoutAction();
                  window.location.href = '/';
                }}
                className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-slate-300 hover:text-neon-purple transition-all duration-300 border border-slate-700 rounded px-3 py-1.5 hover:border-glow-purple hover:bg-neon-purple/5"
              >
                <LogOut size={12} className="text-neon-purple" />
                <span>Logout</span>
              </button>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-slate-300 hover:text-neon-cyan transition-all duration-300 border border-slate-700 rounded px-3 py-1.5 hover:border-glow-cyan hover:bg-neon-cyan/5"
              >
                <LogIn size={12} className="text-neon-cyan" />
                <span>Sys.Login</span>
              </Link>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-1.5 text-slate-300 hover:text-neon-cyan transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav Overlay */}
      {isMobileMenuOpen && (
        <nav className="md:hidden absolute top-full left-0 right-0 border-b border-glow-cyan glass-magnetic flex flex-col px-6 py-4 gap-4 animate-fade-in-up">
          {NAV_LINKS.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 font-mono text-xs text-slate-300 hover:text-neon-cyan transition-colors duration-200 tracking-wider py-3 border-b border-slate-800/50 last:border-none"
            >
              <Icon size={16} className="text-neon-purple" />
              {label}
            </Link>
          ))}
          {/* Mobile Auth Links */}
          <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
            {user?.role === 'premium' && (
              <>
                <Link
                  href="/imortal"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 font-mono text-xs text-neon-cyan hover:text-white transition-colors duration-200 tracking-wider py-3"
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
                  className="flex items-center gap-3 font-mono text-xs text-neon-green hover:text-white transition-colors duration-200 tracking-wider py-3"
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
                className="flex items-center gap-3 font-mono text-xs text-black bg-neon-cyan font-bold transition-colors duration-200 tracking-wider py-3 px-4 rounded border border-glow-cyan"
              >
                <Crown size={16} />
                <span>Assinar Premium</span>
              </Link>
            )}
            {loading ? (
              <span className="flex items-center gap-3 font-mono text-xs text-slate-500 py-3">
                Sys.Wait()...
              </span>
            ) : user ? (
              <button
                onClick={async () => {
                  setIsMobileMenuOpen(false);
                  await logoutAction();
                  window.location.href = '/';
                }}
                className="flex items-center gap-3 font-mono text-xs text-slate-400 hover:text-neon-purple transition-colors duration-200 tracking-wider py-3"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 font-mono text-xs text-slate-400 hover:text-neon-cyan transition-colors duration-200 tracking-wider py-3"
              >
                <LogIn size={16} />
                <span>Sys.Login</span>
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
