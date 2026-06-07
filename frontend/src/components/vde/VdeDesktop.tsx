'use client';

import {
  Terminal,
  Code2,
  Home,
  Globe,
  Shield,
  Zap,
  Building2,
  LayoutGrid,
} from 'lucide-react';
import OrbeLogo from '../OrbeLogo';
import type { DesktopApp } from './types';
import type { VdeView } from './types';

const APPS: DesktopApp[] = [
  { id: 'home', label: 'Home', icon: 'home', action: 'view', view: 'desktop' },
  { id: 'dashboard', label: 'Painel Orbe', icon: 'layout', action: 'view', view: 'dashboard' },
  { id: 'terminal', label: 'Xfce Terminal', icon: 'terminal', action: 'view', view: 'terminal' },
  { id: 'webide', label: 'WebIDE', icon: 'code', action: 'view', view: 'webide' },
  { id: 'site', label: 'Firefox', icon: 'globe', action: 'link', href: 'https://orbesystems.com.br' },
  { id: 'audit', label: 'Cyber Audit', icon: 'shield', action: 'link', href: '/cyber-security' },
  { id: 'imortal', label: 'IMORTAL', icon: 'zap', action: 'link', href: '/imortal' },
  { id: 'imob', label: 'Imobverse', icon: 'building', action: 'link', href: '/ferramentas-premium/imobverse' },
];

const ICONS = {
  terminal: Terminal,
  code: Code2,
  home: Home,
  globe: Globe,
  shield: Shield,
  zap: Zap,
  building: Building2,
  layout: LayoutGrid,
};

type Props = {
  onOpenView: (view: VdeView) => void;
};

export default function VdeDesktop({ onOpenView }: Props) {
  const handleApp = (app: DesktopApp) => {
    if (app.action === 'link' && app.href) {
      window.open(app.href, app.href.startsWith('http') ? '_blank' : '_self');
      return;
    }
    if (app.view) onOpenView(app.view);
  };

  return (
    <div
      className="flex-1 relative overflow-hidden rounded-lg m-2 md:m-3"
      style={{
        background:
          'linear-gradient(160deg, #0c1929 0%, #0a1420 35%, #060a12 100%)',
      }}
    >
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 30%, #00fff5 0%, transparent 50%), radial-gradient(circle at 80% 70%, #0066ff 0%, transparent 45%)',
        }}
      />

      <div className="relative z-10 flex h-full p-4 md:p-6 gap-6">
        <div className="flex flex-col gap-5 md:gap-6 shrink-0">
          {APPS.map((app) => {
            const Icon = ICONS[app.icon];
            return (
              <button
                key={app.id}
                type="button"
                onClick={() => handleApp(app)}
                className="group flex flex-col items-center gap-1.5 w-[72px] md:w-[80px] focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan/50 rounded-lg p-1"
              >
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-neon-cyan/10 group-hover:border-neon-cyan/40 transition-all shadow-lg">
                  <Icon size={26} className="text-neon-cyan/90 group-hover:text-neon-cyan" />
                </div>
                <span className="font-sans text-[10px] md:text-[11px] text-white/90 text-center leading-tight group-hover:text-neon-cyan transition-colors">
                  {app.label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center pointer-events-none select-none">
          <div className="w-32 h-32 md:w-44 md:h-44 mb-6 text-neon-cyan/80 opacity-90">
            <OrbeLogo className="w-full h-full" variant="giant" />
          </div>
          <p className="font-mono text-3xl md:text-4xl font-bold text-white tracking-tight">
            ORBE<span className="text-neon-cyan">SYSTEMS</span>
          </p>
          <p className="font-mono text-sm text-neon-cyan/70 mt-2">orbesystems.com.br</p>
          <p className="font-mono text-[10px] text-terminal-muted mt-6 uppercase tracking-widest">
            Virtual Desktop Environment — v1.0
          </p>
        </div>
      </div>
    </div>
  );
}
