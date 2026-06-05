'use client';

const LINES: { text: string; className: string }[] = [
  { text: '# orbe-systems — api/main.py', className: 'text-terminal-muted/50' },
  { text: 'from fastapi import FastAPI', className: 'text-neon-purple' },
  { text: 'from security.supabase_rls import ensure_supabase_rls', className: 'text-neon-purple' },
  { text: '', className: '' },
  { text: 'app = FastAPI(title="Orbe Systems API")', className: 'text-white/80' },
  { text: '', className: '' },
  { text: '@app.on_event("startup")', className: 'text-neon-cyan' },
  { text: 'async def startup():', className: 'text-white' },
  { text: '    ensure_supabase_rls(engine)', className: 'text-neon-green' },
  { text: '    print("[RLS] Infraestrutura blindada")', className: 'text-neon-green' },
];

export default function VdeWebIDE() {
  return (
    <div className="flex-1 m-2 md:m-3 rounded-lg overflow-hidden border border-terminal-border flex flex-col bg-[#0d1117]">
      <div className="flex items-center justify-between px-3 py-2 bg-[#161b22] border-b border-terminal-border">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500/80" />
          <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <span className="w-3 h-3 rounded-full bg-green-500/80" />
          <span className="font-mono text-[10px] text-terminal-muted ml-2">WebIDE — main.py</span>
        </div>
        <span className="font-mono text-[10px] text-neon-green">Python · UTF-8</span>
      </div>
      <div className="flex flex-1 min-h-0 overflow-auto">
        <div className="w-10 shrink-0 bg-[#0a0e14] border-r border-terminal-border py-3 font-mono text-[10px] text-terminal-muted/40 text-right pr-2">
          {LINES.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <pre className="flex-1 p-3 font-mono text-xs md:text-sm leading-relaxed">
          {LINES.map((line, i) => (
            <div key={i} className={line.className || 'text-white/80'}>
              {line.text || '\u00A0'}
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}
