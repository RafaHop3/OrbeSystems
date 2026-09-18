'use client';

import { useState } from 'react';
import { Menu, X, LayoutGrid, Lightbulb, Mail, LogIn, LogOut, Crown, Zap, Building2, ChevronDown, Terminal, Cpu, Globe } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { logoutAction } from '@/lib/auth-actions';
import { Trash2 } from 'lucide-react';
import { useEffect } from 'react';
import { CustomPlasmaButton } from '@/shaders/neuform-isolated/CustomPlasmaButton';
import { CustomInductionButton } from '@/shaders/neuform-isolated/NeuformIsolatedEffects';
import { GlobeCollection } from '@/shaders/globe/GlobeCollection';

const NAV_LINKS = [
  { label: 'Workspace', href: '/workspace', icon: LayoutGrid },
  { label: 'Cleaner', href: '/orbe-cleaner', icon: Trash2 },
  { label: 'Contato', href: '/#contact', icon: Mail },
];

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const { user, loading } = useAuth();

  useEffect(() => {
    const handleMessage = async (e: MessageEvent) => {
      if (e.data?.type === 'CUSTOM_INDUCTION_CLICK') {
        const text = e.data.text;
        const link = NAV_LINKS.find(l => l.label === text);
        if (link) {
          window.location.href = link.href;
          return;
        }

        if (text === 'PREMIUM') window.location.href = '/assinar';
        else if (text === 'LOGIN') window.location.href = '/login';
        else if (text === 'LOGOUT') {
          await logoutAction();
          window.location.href = '/';
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-black/70">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between relative z-10">
        <Link href="/" className="flex items-center gap-3 group z-50">
          <div className="relative w-[36px] h-[36px] shrink-0 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.6)] overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[144px] h-[144px] scale-[0.25]">
              <GlobeCollection variant="energy-orb" speed={1.00} scale={1.4} smokeScale={1.5} hue={0} saturation={1.2} brightness={1.1} />
            </div>
          </div>
          <span className="font-grotesk text-sm font-bold tracking-wide text-white group-hover:text-neon-cyan transition-colors">
            ORBE<span className="text-neon-cyan font-outfit">SYSTEMS</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map(({ label, href }) => (
            <Link key={href} href={href} title={label} className="w-[140px] h-[48px] relative block cursor-pointer transition-transform hover:scale-105">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-[0.5] hover:scale-[0.52] w-[280px] h-[96px] transition-transform">
                <CustomPlasmaButton mode="dark" text={label} hue={0} saturation={1.2} />
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
                    <Building2 size={16} className="text-neon-blue" />
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
              <Link href="/assinar" className="w-[140px] h-[48px] relative block cursor-pointer transition-transform hover:scale-105">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-[0.5] hover:scale-[0.52] w-[280px] h-[96px] transition-transform">
                  <CustomInductionButton mode="dark" text="PREMIUM" hue={210} saturation={1.4} />
                </div>
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
                className="w-[140px] h-[48px] relative block cursor-pointer transition-transform hover:scale-105"
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-[0.5] hover:scale-[0.52] w-[280px] h-[96px] transition-transform">
                  <CustomInductionButton mode="dark" text="LOGOUT" hue={210} saturation={1.4} />
                </div>
              </button>
            ) : (
              <Link href="/login" className="w-[140px] h-[48px] relative block cursor-pointer transition-transform hover:scale-105">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-[0.5] hover:scale-[0.52] w-[280px] h-[96px] transition-transform">
                  <CustomInductionButton mode="dark" text="LOGIN" hue={210} saturation={1.4} />
                </div>
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
              <Icon size={16} className="text-neon-blue" />
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
                  className="flex items-center gap-3 font-mono text-xs text-neon-blue hover:text-white transition-colors duration-200 tracking-wider py-3"
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
                className="flex items-center gap-3 font-mono text-xs text-slate-400 hover:text-neon-blue transition-colors duration-200 tracking-wider py-3"
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
                <span>Login VIP</span>
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
