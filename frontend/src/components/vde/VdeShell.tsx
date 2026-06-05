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
} from 'lucide-react';
import OrbeLogo from '../OrbeLogo';
import type { VdeView } from './types';
import VdeDesktop from './VdeDesktop';
import VdeTerminal from './VdeTerminal';
import VdeWebIDE from './VdeWebIDE';
import VdeAssistant from './VdeAssistant';

function formatTimer(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatClock() {
  return new Date().toLocaleString('pt-BR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const TABS: { id: VdeView; label: string; icon: typeof Monitor }[] = [
  { id: 'desktop', label: 'Desktop', icon: Monitor },
  { id: 'terminal', label: 'Terminal', icon: Terminal },
  { id: 'webide', label: 'WebIDE', icon: Code2 },
];

export default function VdeShell() {
  const [view, setView] = useState<VdeView>('desktop');
  const [secondsLeft, setSecondsLeft] = useState(59 * 60 + 40);
  const [clock, setClock] = useState(formatClock());

  useEffect(() => {
    const t = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 59 * 60 + 40));
      setClock(formatClock());
    }, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="h-[100dvh] flex flex-col bg-[#0a0c10] text-white overflow-hidden">
      {/* Top bar — estilo LabEx / VDE */}
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
          <span className="text-neon-cyan/80">Cyber Safety</span>
          <span className="mx-2 text-white/20">/</span>
          <span>Configurando ambiente Orbe VDE</span>
        </div>

        <div className="flex items-center gap-1 md:gap-2 ml-auto shrink-0">
          <span className="hidden lg:flex items-center gap-1 font-mono text-[10px] text-neon-green border border-neon-green/30 rounded-full px-2 py-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
            LIVE
          </span>
          <button type="button" className="p-1.5 text-terminal-muted hover:text-white" aria-label="Idioma">
            <Globe size={16} />
          </button>
          <button type="button" className="p-1.5 text-terminal-muted hover:text-white" aria-label="Tema">
            <Moon size={16} />
          </button>
          <button type="button" className="p-1.5 text-terminal-muted hover:text-white" aria-label="Configurações">
            <Settings size={16} />
          </button>
          <button type="button" className="p-1.5 text-terminal-muted hover:text-white" aria-label="Ajuda">
            <HelpCircle size={16} />
          </button>
          <div className="font-mono text-xs md:text-sm font-bold text-white tabular-nums bg-red-500/15 border border-red-500/30 rounded px-2 py-1">
            {formatTimer(secondsLeft)}
          </div>
        </div>
      </header>

      {/* Main: canvas + assistant */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {view === 'desktop' && <VdeDesktop onOpenView={setView} />}
          {view === 'terminal' && <VdeTerminal />}
          {view === 'webide' && <VdeWebIDE />}
        </div>
        <VdeAssistant />
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
