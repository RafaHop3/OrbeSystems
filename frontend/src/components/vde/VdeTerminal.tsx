'use client';

import { useEffect, useState } from 'react';

const BOOT_LINES = [
  'Orbe VDE kernel 6.1 — cyber-safety mode',
  '[OK] PostgREST lockdown verified (RLS enabled)',
  '[OK] FastAPI gateway orbesystems.com.br',
  'login: rafael@orbesystems',
];

const PROMPT_LINES = [
  '$ orbe audit --infra',
  '→ Scanning public schema... 23 tables secured',
  '→ deny_postgrest_access policies: active',
  '$ orbe deploy --check',
  '→ Build: OK | Bundle: optimized | GSAP+Lottie: loaded',
  '$ _',
];

export default function VdeTerminal() {
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    const all = [...BOOT_LINES, '', ...PROMPT_LINES];
    let i = 0;

    const tick = () => {
      if (cancelled || i >= all.length) return;
      setLines((prev) => [...prev, all[i]]);
      i += 1;
      setTimeout(tick, i < BOOT_LINES.length ? 280 : 420);
    };
    tick();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex-1 m-2 md:m-3 rounded-lg overflow-hidden border border-terminal-border flex flex-col bg-[#0d1117]">
      <div className="flex items-center gap-2 px-3 py-2 bg-[#161b22] border-b border-terminal-border">
        <span className="w-3 h-3 rounded-full bg-red-500/80" />
        <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
        <span className="w-3 h-3 rounded-full bg-green-500/80" />
        <span className="font-mono text-[10px] text-terminal-muted ml-2">
          orbe@workspace — bash
        </span>
      </div>
      <div className="flex-1 p-4 font-mono text-xs md:text-sm overflow-y-auto leading-relaxed">
        {lines.map((line, idx) => (
          <div
            key={idx}
            className={
              line.startsWith('[OK]')
                ? 'text-neon-green'
                : line.startsWith('→')
                  ? 'text-neon-cyan/80'
                  : line.startsWith('$')
                    ? 'text-white mt-2'
                    : 'text-terminal-muted'
            }
          >
            {line || '\u00A0'}
          </div>
        ))}
        <span className="inline-block w-2 h-4 bg-neon-cyan animate-blink ml-0.5 align-middle" />
      </div>
    </div>
  );
}
