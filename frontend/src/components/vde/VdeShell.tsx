'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Monitor,
  Terminal,
  Code2,
  Globe,
  Moon,
  Settings,
  HelpCircle,
  ArrowLeft,
  LayoutGrid,
  Bot,
  X,
} from 'lucide-react';
import OrbeLogo from '../OrbeLogo';
import type { VdeView } from './types';
import VdeDesktop from './VdeDesktop';
import VdeTerminal from './VdeTerminal';
import VdeWebIDE from './VdeWebIDE';
import VdeAssistant from './VdeAssistant';
import VdeUserDashboard from './VdeUserDashboard';

function formatClock() {
  return new Date().toLocaleString('pt-BR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const TABS: { id: VdeView; label: string; icon: any }[] = [
  { id: 'desktop', label: 'Desktop', icon: Monitor },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
  { id: 'terminal', label: 'Terminal', icon: Terminal },
  { id: 'webide', label: 'WebIDE', icon: Code2 },
];

export default function VdeShell() {
  const [view, setView] = useState<VdeView>('desktop');
  const [clock, setClock] = useState('');
  // Chat panel: hidden on mobile by default, always visible on lg+
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    setClock(formatClock());
    const t = setInterval(() => setClock(formatClock()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="h-[100dvh] flex flex-col bg-[#0a0c10] text-white overflow-hidden">

      {/* Top bar */}
      <header className="shrink-0 flex items-center gap-2 md:gap-4 px-2 md:px-4 py-2 bg-[#161b22] border-b border-terminal-border">
        <Link
          href="/"
          className="flex items-center gap-1.5 font-mono text-[10px] text-terminal-muted hover:text-neon-cyan shrink-0"
        >
          <ArrowLeft size={14} />
          <span className="hidden sm:inline">Site</span>
        </Link>

        <div className="flex items-center gap-0.5 bg-[#0d1117] rounded-lg p-0.5 border border-terminal-border">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              className={`flex items-center gap-1.5 px-2 md:px-4 py-1.5 rounded-md font-mono text-[10px] md:text-xs transition-all ${
                view === id
                  ? 'bg-neon-blue/20 text-neon-cyan border border-neon-cyan/30'
                  : 'text-terminal-muted hover:text-white'
              }`}
            >
              <Icon size={14} />
              <span className="hidden xs:inline">{label}</span>
            </button>
          ))}
        </div>

        <div className="hidden md:flex flex-1 min-w-0 items-center font-mono text-[10px] text-terminal-muted truncate px-2">
          <span className="text-neon-cyan/80">Orbe VDE</span>
          <span className="mx-2 text-white/20">/</span>
          <span>ambiente virtual — acesso livre</span>
        </div>

        <div className="flex items-center gap-1 md:gap-2 ml-auto shrink-0">
          <span className="flex items-center gap-1 font-mono text-[10px] text-neon-green border border-neon-green/30 rounded-full px-2 py-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
            LIVE
          </span>

          {/* Orbe Assistant toggle — visível em telas menores que lg */}
          <button
            type="button"
            onClick={() => setChatOpen(o => !o)}
            aria-label="Orbe Assistant"
            className={`lg:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-mono text-[10px] border transition-all ${
              chatOpen
                ? 'bg-neon-cyan/20 border-neon-cyan/40 text-neon-cyan'
                : 'bg-white/5 border-white/10 text-terminal-muted hover:text-white'
            }`}
          >
            {chatOpen ? <X size={13} /> : <Bot size={13} />}
            {chatOpen ? 'Fechar' : 'Orbe AI'}
          </button>

          <button type="button" className="hidden md:block p-1.5 text-terminal-muted hover:text-white" aria-label="Idioma">
            <Globe size={16} />
          </button>
          <button type="button" className="hidden md:block p-1.5 text-terminal-muted hover:text-white" aria-label="Tema">
            <Moon size={16} />
          </button>
          <button type="button" className="hidden md:block p-1.5 text-terminal-muted hover:text-white" aria-label="Ajuda">
            <HelpCircle size={16} />
          </button>
        </div>
      </header>

      {/* Main canvas */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden relative">

        {/* Content area */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {view === 'desktop'   && <VdeDesktop onOpenView={setView} />}
          {view === 'dashboard' && <VdeUserDashboard />}
          {view === 'terminal'  && <VdeTerminal />}
          {view === 'webide'    && <VdeWebIDE />}
        </div>

        {/* Sidebar assistant: always visible on lg, slide-in on mobile */}
        <div className={`
          flex-col
          lg:flex lg:relative lg:w-auto
          ${chatOpen ? 'flex fixed inset-0 z-50 bg-black/60 backdrop-blur-sm items-end justify-end p-3' : 'hidden'}
        `}>
          {/* Backdrop close on mobile */}
          {chatOpen && (
            <div
              className="absolute inset-0 lg:hidden"
              onClick={() => setChatOpen(false)}
            />
          )}
          <div className="relative z-10 w-full max-w-sm lg:max-w-none lg:w-auto flex-1 lg:flex-none">
            <VdeAssistant />
          </div>
        </div>

      </div>

      {/* Taskbar */}
      <footer className="shrink-0 flex items-center justify-between px-3 py-1.5 bg-[#e8eaed] text-[#1a1c23] border-t border-[#c4c7cc]">
        <button
          type="button"
          onClick={() => setView('desktop')}
          className="flex items-center gap-2 px-2 py-1 rounded hover:bg-black/5 transition-colors"
        >
          <div className="w-6 h-6 text-neon-blue">
            <OrbeLogo className="w-full h-full" />
          </div>
          <span className="font-sans text-xs font-medium hidden sm:inline">Aplicações</span>
        </button>
        <span className="font-sans text-xs text-[#5f6368] tabular-nums">{clock}</span>
      </footer>
    </div>
  );
}
