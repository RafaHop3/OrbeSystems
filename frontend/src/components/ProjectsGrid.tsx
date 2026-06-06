'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, Terminal } from 'lucide-react';
import type { Repository } from '@/types/repository';
import ProjectCard from './ProjectCard';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="bg-terminal-surface border border-terminal-border rounded-lg overflow-hidden animate-pulse"
        >
          <div className="h-10 bg-[#161b22] border-b border-terminal-border" />
          <div className="p-5 space-y-3">
            <div className="h-4 bg-white/5 rounded w-2/3" />
            <div className="h-3 bg-white/5 rounded w-full" />
            <div className="h-3 bg-white/5 rounded w-5/6" />
            <div className="h-3 bg-white/5 rounded w-4/6" />
            <div className="h-8 bg-white/5 rounded-full mt-4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ProjectsGrid() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function loadProjects() {
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch(`${API_URL}/api/projects`, { cache: 'no-store' });
      if (!res.ok) {
        let errDetail = `HTTP ${res.status}`;
        try {
          const errData = await res.json();
          if (errData && errData.detail) {
            errDetail += ` — ${errData.detail}`;
          } else {
            errDetail += ` — ${res.statusText}`;
          }
        } catch {
          errDetail += ` — ${res.statusText}`;
        }
        throw new Error(errDetail);
      }
      const data: Repository[] = await res.json();
      setRepos(data);
      setStatus('success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setErrorMsg(message);
      setStatus('error');
    }
  }

  useEffect(() => {
    loadProjects();
  }, []);

  return (
    <section
      id="projects"
      data-narrative-chapter="2"
      className="max-w-7xl mx-auto px-6 py-24 scroll-mt-8"
    >
      {/* Section header */}
      <div className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gradient-to-r from-neon-cyan/40 to-transparent" />
          <span className="font-mono text-xs text-neon-cyan tracking-widest uppercase">
            ls -la ~/projects
          </span>
          <div className="flex-1 h-px bg-gradient-to-l from-neon-cyan/40 to-transparent" />
        </div>
        <h2 className="font-mono text-3xl md:text-4xl font-bold text-white/90 text-center">
          Repositórios{' '}
          <span className="text-neon-cyan">Públicos</span>
        </h2>
        <p className="font-mono text-sm text-terminal-muted text-center mt-3">
          <span className="text-neon-green">$</span> github.com/theorbesystems-sketch — projetos em produção e em desenvolvimento
        </p>
      </div>

      {/* States */}
      {status === 'loading' && <LoadingSkeleton />}

      {status === 'error' && (
        <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
          <div className="w-16 h-16 rounded-full border border-red-500/40 flex items-center justify-center">
            <AlertTriangle size={28} className="text-red-400" />
          </div>
          <div>
            <p className="font-mono text-sm text-red-400 mb-1">Connection refused — API unreachable</p>
            <p className="font-mono text-xs text-terminal-muted">{errorMsg}</p>
          </div>
          <button
            onClick={loadProjects}
            className="flex items-center gap-2 font-mono text-xs border border-neon-cyan/40 text-neon-cyan px-4 py-2 rounded hover:border-neon-cyan hover:shadow-neon-cyan transition-all duration-300"
          >
            <RefreshCw size={12} />
            Tentar Novamente
          </button>
        </div>
      )}

      {status === 'success' && repos.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-24">
          <Terminal size={32} className="text-terminal-muted" />
          <p className="font-mono text-sm text-terminal-muted">Nenhum repositório público encontrado.</p>
        </div>
      )}

      {status === 'success' && repos.length > 0 && (
        <>
          {/* Featured section */}
          {repos.some((r) => r.is_featured) && (
            <div className="mb-12">
              <p className="font-mono text-xs text-neon-purple/70 mb-5 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-neon-purple animate-pulse" />
                projetos em destaque
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {repos
                  .filter((r) => r.is_featured)
                  .map((repo, i) => (
                    <ProjectCard key={repo.id} repo={repo} index={i} />
                  ))}
              </div>
            </div>
          )}

          {/* All other repos */}
          {repos.some((r) => !r.is_featured) && (
            <div>
              <p className="font-mono text-xs text-terminal-muted/60 mb-5 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-terminal-muted/40" />
                outros repositórios
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {repos
                  .filter((r) => !r.is_featured)
                  .map((repo, i) => (
                    <ProjectCard key={repo.id} repo={repo} index={i} />
                  ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
