'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Save, FolderOpen, Terminal, Code2, RefreshCw, ChevronRight, ChevronDown, File, Folder } from 'lucide-react';

import { API_BASE_URL } from '@/lib/api';

const API_URL = API_BASE_URL;

// ── File system tree ──────────────────────────────────────────────────────────
type FileNode = { name: string; type: 'file' | 'dir'; lang?: string; content?: string; children?: FileNode[] };

const FILE_TREE: FileNode[] = [
  {
    name: 'backend', type: 'dir', children: [
      { name: 'main.py', type: 'file', lang: 'python', content: `from fastapi import FastAPI
from routes.imobverse import router as imobverse_router
from routes.imortal import router as imortal_router
from database import engine, Base

app = FastAPI(title="Orbe Systems API", version="1.3.0")

@app.on_event("startup")
async def startup():
    Base.metadata.create_all(bind=engine)
    print("[Orbe] ✅ Infraestrutura inicializada")

app.include_router(imobverse_router, prefix="/api")
app.include_router(imortal_router, prefix="/api")

@app.get("/health")
async def health():
    return {"status": "operational", "service": "orbe-systems-api"}
` },
      { name: 'services', type: 'dir', children: [
        { name: 'reputation_engine.py', type: 'file', lang: 'python', content: `"""
Motor de Reputação Imobverse
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Regras:
  • Deterioração "critico" → penaliza -1.5 no score
  • score < 3.2            → status = UNHEALTHY (limbo)
"""

UNHEALTHY_THRESHOLD = 3.2
CRITICAL_PENALTY    = 1.5

class ReputationEngineService:
    @staticmethod
    def process_checkout_analysis(db, analysis):
        item = db.query(ImobInspectionItem).filter_by(
            id=analysis.inspection_item_id
        ).first()

        if analysis.divergencia_detectada and \\
           analysis.grau_de_deterioracao == "critico":
            prop = item.property
            prop.reputation_score = max(
                0.0,
                round(prop.reputation_score - CRITICAL_PENALTY, 2)
            )
            if prop.reputation_score < UNHEALTHY_THRESHOLD:
                prop.status = "unhealthy"

        db.commit()
        return {"status": item.status, "score": item.property.reputation_score}
` },
      ]},
      { name: 'routes', type: 'dir', children: [
        { name: 'imobverse.py', type: 'file', lang: 'python', content: `from fastapi import APIRouter, Depends, BackgroundTasks
from services.reputation_engine import run_automated_analysis
from database import SessionLocal

router = APIRouter(prefix="/imobverse", tags=["imobverse"])

@router.post("/inspections/checkout")
def submit_checkout_photo(
    payload: CheckoutPhotoSubmit,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_premium),
):
    """
    1. Salva checkout_url no banco
    2. Dispara análise LLM em background (Gemini → Ollama → Heurística)
    3. LLM retorna JSON → ReputationEngine aplica penalidades
    """
    result = ReputationEngineService.submit_checkout_photo(
        db, payload, tenant_user_id=current_user.id
    )
    background_tasks.add_task(
        run_automated_analysis, result["id"], SessionLocal
    )
    return result
` },
      ]},
    ],
  },
  {
    name: 'frontend', type: 'dir', children: [
      { name: 'src', type: 'dir', children: [
        { name: 'components', type: 'dir', children: [
          { name: 'vde', type: 'dir', children: [
            { name: 'VdeUserDashboard.tsx', type: 'file', lang: 'tsx', content: `'use client';
// Painel interativo do usuário Orbe Systems
// Abas: Geral | Orquestrador IA | Repositórios

export default function VdeUserDashboard() {
  return (
    <div className="flex-1 bg-[#0d1117] rounded-lg border border-terminal-border">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-terminal-border">
        <span className="w-2.5 h-2.5 rounded-full bg-neon-cyan animate-pulse" />
        <span className="font-mono text-xs font-bold text-white uppercase">
          Painel do Usuário Orbe Systems
        </span>
      </div>
      {/* Content rendered by sub-tabs */}
    </div>
  );
}
` },
          ]},
        ]},
      ]},
    ],
  },
];

// ── Syntax highlight (tokenizer simples) ─────────────────────────────────────
function highlight(code: string, lang: string): string {
  if (!code) return '';
  // Replace < > para não quebrar HTML
  let s = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  if (lang === 'python') {
    s = s
      .replace(/("""[\s\S]*?""")/g, '<span class="text-yellow-400/80">$1</span>')
      .replace(/(#[^\n]*)/g, '<span class="text-terminal-muted/70 italic">$1</span>')
      .replace(/\b(from|import|def|class|return|async|await|if|else|elif|for|while|try|except|with|as|not|and|or|in|True|False|None|print|raise)\b/g, '<span class="text-neon-purple">$1</span>')
      .replace(/(".*?"|'.*?')/g, '<span class="text-neon-green/90">$1</span>')
      .replace(/\b(\d+\.?\d*)\b/g, '<span class="text-orange-400">$1</span>')
      .replace(/(@\w+)/g, '<span class="text-neon-cyan">$1</span>');
  } else if (lang === 'tsx' || lang === 'ts' || lang === 'js') {
    s = s
      .replace(/(\/\/[^\n]*)/g, '<span class="text-terminal-muted/70 italic">$1</span>')
      .replace(/\b(import|export|from|default|const|let|var|function|return|async|await|if|else|for|while|class|extends|typeof|type|interface|new|true|false|null|undefined)\b/g, '<span class="text-neon-purple">$1</span>')
      .replace(/(`[^`]*`)/g, '<span class="text-neon-green/90">$1</span>')
      .replace(/(".*?"|'.*?')/g, '<span class="text-neon-green/90">$1</span>')
      .replace(/\b(\d+)\b/g, '<span class="text-orange-400">$1</span>')
      .replace(/(&lt;\/?[A-Z]\w*)/g, '<span class="text-neon-cyan">$1</span>');
  }
  return s;
}

// ── Flatten tree for fast lookup ──────────────────────────────────────────────
function flattenTree(nodes: FileNode[], path = ''): FileNode[] {
  let result: FileNode[] = [];
  for (const n of nodes) {
    const full = path ? `${path}/${n.name}` : n.name;
    result.push({ ...n, name: full });
    if (n.children) result = result.concat(flattenTree(n.children, full));
  }
  return result;
}

// ── FileTree component ────────────────────────────────────────────────────────
function FileTree({ nodes, depth = 0, onSelect, selected }: { nodes: FileNode[]; depth?: number; onSelect: (n: FileNode) => void; selected: string }) {
  const [open, setOpen] = useState<Record<string, boolean>>({ backend: true, frontend: false });
  return (
    <div>
      {nodes.map(node => {
        if (!node) return null;
        return (
          <div key={node.name}>
            {node.type === 'dir' ? (
              <>
                <button
                  onClick={() => setOpen(o => ({ ...o, [node.name]: !o[node.name] }))}
                  className="flex items-center gap-1 w-full px-2 py-0.5 hover:bg-white/5 text-terminal-muted hover:text-white font-mono text-[11px] transition-colors"
                  style={{ paddingLeft: `${8 + depth * 12}px` }}
                >
                  {open[node.name] ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                  <Folder size={11} className="text-yellow-400/80" />
                  <span>{node.name}</span>
                </button>
                {open[node.name] && node.children && (
                  <FileTree nodes={node.children} depth={depth + 1} onSelect={onSelect} selected={selected} />
                )}
              </>
            ) : (
              <button
                onClick={() => onSelect(node)}
                className={`flex items-center gap-1.5 w-full px-2 py-0.5 font-mono text-[11px] transition-colors ${selected === node.name ? 'bg-neon-cyan/10 text-neon-cyan' : 'text-terminal-muted hover:text-white hover:bg-white/5'}`}
                style={{ paddingLeft: `${8 + depth * 12}px` }}
              >
                <File size={11} />
                <span>{node.name}</span>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── API Runner panel ──────────────────────────────────────────────────────────
const QUICK_REQUESTS = [
  { label: 'GET /health',           method: 'GET',  path: '/health' },
  { label: 'GET /api/projects',     method: 'GET',  path: '/api/projects' },
  { label: 'GET /api/imobverse/properties', method: 'GET', path: '/api/imobverse/properties' },
  { label: 'GET /health (ping)',    method: 'GET',  path: '/health' },
];

function ApiRunner() {
  const [method, setMethod] = useState('GET');
  const [path, setPath] = useState('/health');
  const [body, setBody] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);

  const run = async () => {
    setLoading(true);
    setResult(null);
    const t0 = Date.now();
    try {
      const opts: RequestInit = { method, credentials: 'include' };
      if (body && method !== 'GET') {
        opts.body = body;
        opts.headers = { 'Content-Type': 'application/json' };
      }
      const res = await fetch(`${API_URL}${path}`, opts);
      setStatus(res.status);
      setElapsed(Date.now() - t0);
      const text = await res.text();
      try { setResult(JSON.stringify(JSON.parse(text), null, 2)); }
      catch { setResult(text); }
    } catch (e: any) {
      setStatus(0);
      setElapsed(Date.now() - t0);
      setResult(`Error: ${e.message}`);
    } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col h-full font-mono text-xs">
      {/* Quick requests */}
      <div className="flex flex-wrap gap-1.5 p-3 border-b border-white/5">
        {QUICK_REQUESTS.map(q => (
          <button key={q.label} onClick={() => { setMethod(q.method); setPath(q.path); }}
            className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] text-terminal-muted hover:text-neon-cyan hover:border-neon-cyan/30 transition-all">
            {q.label}
          </button>
        ))}
      </div>

      {/* Method + Path */}
      <div className="flex gap-2 p-3 border-b border-white/5">
        <select value={method} onChange={e => setMethod(e.target.value)}
          className="bg-white/5 border border-white/10 rounded px-2 py-1 text-neon-cyan outline-none">
          {['GET','POST','PUT','DELETE','PATCH'].map(m => <option key={m} value={m} className="bg-[#0d1117]">{m}</option>)}
        </select>
        <input value={path} onChange={e => setPath(e.target.value)}
          className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-1 text-white outline-none focus:border-neon-cyan/50"
          placeholder="/api/endpoint" />
        <button onClick={run} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1 bg-neon-cyan/20 border border-neon-cyan/40 text-neon-cyan rounded hover:bg-neon-cyan/30 transition-all disabled:opacity-50">
          {loading ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} />}
          Send
        </button>
      </div>

      {/* Body */}
      {method !== 'GET' && (
        <textarea value={body} onChange={e => setBody(e.target.value)}
          className="mx-3 mt-2 h-20 bg-black/30 border border-white/10 rounded p-2 text-white/80 outline-none resize-none text-[11px]"
          placeholder='{"key": "value"}' />
      )}

      {/* Response */}
      <div className="flex-1 overflow-auto p-3">
        {status !== null && (
          <div className="flex items-center gap-3 mb-2">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${status >= 200 && status < 300 ? 'bg-neon-green/15 text-neon-green' : 'bg-red-500/15 text-red-400'}`}>
              HTTP {status}
            </span>
            <span className="text-terminal-muted text-[10px]">{elapsed}ms</span>
          </div>
        )}
        {result && (
          <pre className="text-neon-green/90 text-[11px] leading-relaxed whitespace-pre-wrap">{result}</pre>
        )}
        {!result && !loading && (
          <div className="text-terminal-muted/40 italic py-8 text-center">Aguardando requisição...</div>
        )}
      </div>
    </div>
  );
}

// ── Terminal emulator ─────────────────────────────────────────────────────────
const COMMANDS: Record<string, string> = {
  help:    '  Comandos: help, ls, status, api, clear, whoami, version',
  ls:      '  backend/  frontend/  README.md  requirements.txt',
  status:  '  ✅ FastAPI     → localhost:8000\n  ✅ Next.js     → localhost:3000\n  ⚡ Gemini API  → cloud (production)\n  🟡 Ollama      → localhost:11434 (opcional)',
  api:     '  Endpoints: /health /api/projects /api/imobverse/properties /api/imortal/analyze',
  whoami:  '  orbe@workspace — Orbe Systems VDE v1.0',
  version: '  Orbe WebIDE v2.0 | FastAPI 0.115 | Next.js 14.2 | Python 3.11',
};

function TerminalEmulator() {
  const [lines, setLines] = useState<{text: string; type: 'input'|'output'|'error'}[]>([
    { text: 'Orbe Systems WebIDE Terminal v2.0', type: 'output' },
    { text: 'Digite "help" para ver os comandos disponíveis.', type: 'output' },
    { text: '', type: 'output' },
  ]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [lines]);

  const run = () => {
    const cmd = input.trim().toLowerCase();
    if (!cmd) return;
    setHistory(h => [cmd, ...h]);
    setHistIdx(-1);
    const newLines = [...lines, { text: `$ ${cmd}`, type: 'input' as const }];
    if (cmd === 'clear') { setLines([]); setInput(''); return; }
    const out = COMMANDS[cmd] ?? `  zsh: command not found: ${cmd}`;
    const type = COMMANDS[cmd] ? 'output' : 'error';
    setLines([...newLines, { text: out, type }]);
    setInput('');
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { run(); return; }
    if (e.key === 'ArrowUp') {
      const idx = Math.min(histIdx + 1, history.length - 1);
      setHistIdx(idx);
      setInput(history[idx] ?? '');
    }
    if (e.key === 'ArrowDown') {
      const idx = Math.max(histIdx - 1, -1);
      setHistIdx(idx);
      setInput(idx === -1 ? '' : history[idx]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-black font-mono text-xs">
      <div className="flex-1 overflow-auto p-3 space-y-0.5">
        {lines.map((l, i) => {
          if (!l) return null;
          return (
            <div key={i} className={l.type === 'input' ? 'text-neon-cyan' : l.type === 'error' ? 'text-red-400' : 'text-white/70'}>
              {l.text || '\u00A0'}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="flex items-center gap-2 border-t border-white/10 px-3 py-2">
        <span className="text-neon-green shrink-0">orbe@workspace $</span>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKey}
          className="flex-1 bg-transparent text-white outline-none caret-neon-cyan"
          placeholder="digite um comando..."
          autoFocus
        />
      </div>
    </div>
  );
}

// ── Main VdeWebIDE ────────────────────────────────────────────────────────────
type Panel = 'editor' | 'api' | 'terminal';

export default function VdeWebIDE() {
  const [selectedFile, setSelectedFile] = useState<FileNode>(FILE_TREE[0].children![0]);
  const [panel, setPanel] = useState<Panel>('editor');
  const [editorContent, setEditorContent] = useState(selectedFile.content ?? '');
  const [saved, setSaved] = useState(true);

  const handleSelect = (node: FileNode) => {
    if (node.type === 'file' && node.content !== undefined) {
      setSelectedFile(node);
      setEditorContent(node.content);
      setSaved(true);
      setPanel('editor');
    }
  };

  const handleSave = () => { setSaved(true); };

  const highlighted = highlight(editorContent, selectedFile.lang ?? 'txt');
  const lines = editorContent.split('\n');

  return (
    <div className="flex-1 m-2 md:m-3 rounded-lg overflow-hidden border border-terminal-border flex flex-col bg-[#0d1117]">

      {/* Title bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#161b22] border-b border-terminal-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500/80" />
          <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <span className="w-3 h-3 rounded-full bg-green-500/80" />
          <span className="font-mono text-[10px] text-terminal-muted ml-2 flex items-center gap-1.5">
            <Code2 size={11} />
            {selectedFile.name}
            {!saved && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block" title="Não salvo" />}
          </span>
        </div>

        {/* Panel switcher */}
        <div className="flex items-center gap-1">
          {([['editor','Editor',Code2],['api','API Runner',Play],['terminal','Terminal',Terminal]] as const).map(([id, label, Icon]) => (
            <button key={id} onClick={() => setPanel(id)}
              className={`flex items-center gap-1 px-2 py-1 rounded font-mono text-[10px] transition-all border ${panel === id ? 'bg-neon-cyan/15 text-neon-cyan border-neon-cyan/30' : 'text-terminal-muted border-transparent hover:text-white'}`}>
              <Icon size={11} />{label}
            </button>
          ))}
          {panel === 'editor' && (
            <button onClick={handleSave}
              className="flex items-center gap-1 px-2 py-1 ml-1 rounded font-mono text-[10px] bg-neon-green/10 border border-neon-green/30 text-neon-green hover:bg-neon-green/20 transition-all">
              <Save size={11} /> Save
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* File explorer */}
        <div className="w-44 shrink-0 bg-[#0a0e14] border-r border-terminal-border overflow-y-auto">
          <div className="flex items-center gap-1.5 px-2 py-2 border-b border-white/5">
            <FolderOpen size={11} className="text-yellow-400/70" />
            <span className="font-mono text-[10px] text-white/50 uppercase tracking-wider">Explorer</span>
          </div>
          <FileTree nodes={FILE_TREE} onSelect={handleSelect} selected={selectedFile.name} />
        </div>

        {/* Main panel */}
        <div className="flex-1 overflow-hidden flex flex-col min-w-0">
          {panel === 'editor' && (
            <div className="flex flex-1 overflow-auto min-h-0">
              {/* Line numbers */}
              <div className="w-10 shrink-0 bg-[#0a0e14] border-r border-terminal-border py-3 font-mono text-[11px] text-terminal-muted/40 text-right pr-2 select-none leading-5">
                {lines.map((_, i) => <div key={i}>{i + 1}</div>)}
              </div>
              {/* Code */}
              <div className="flex-1 relative">
                <pre
                  className="absolute inset-0 p-3 font-mono text-[12px] leading-5 pointer-events-none overflow-auto"
                  dangerouslySetInnerHTML={{ __html: highlighted }}
                />
                <textarea
                  value={editorContent}
                  onChange={e => { setEditorContent(e.target.value); setSaved(false); }}
                  className="absolute inset-0 w-full h-full p-3 font-mono text-[12px] leading-5 bg-transparent text-transparent caret-neon-cyan outline-none resize-none"
                  spellCheck={false}
                />
              </div>
            </div>
          )}
          {panel === 'api' && <ApiRunner />}
          {panel === 'terminal' && <TerminalEmulator />}
        </div>
      </div>

      {/* Status bar */}
      <div className="shrink-0 flex items-center justify-between px-3 py-1 bg-neon-blue/20 border-t border-neon-cyan/20 font-mono text-[10px]">
        <div className="flex items-center gap-3 text-terminal-muted">
          <span className="text-neon-green flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-neon-green" />LIVE</span>
          <span>{selectedFile.lang?.toUpperCase() ?? 'TXT'}</span>
          <span>UTF-8</span>
          <span>{lines.length} linhas</span>
        </div>
        <div className="flex items-center gap-3 text-terminal-muted">
          <span>Orbe WebIDE v2.0</span>
          <span className={saved ? 'text-neon-green' : 'text-yellow-400'}>{saved ? '✓ Salvo' : '● Editando'}</span>
        </div>
      </div>
    </div>
  );
}
