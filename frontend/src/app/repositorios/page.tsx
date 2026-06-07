'use client';


import React, { useState, useEffect } from 'react';
import {
  Search, GitBranch, Star, Eye, ExternalLink, ShieldCheck,
  AlertTriangle, RefreshCw, Terminal, ArrowLeft, Code2, Tag, Copy, Check
} from 'lucide-react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import type { Repository } from '@/types/repository';

import { API_BASE_URL as API_URL } from '@/lib/api';

export default function RepositoriesPage() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [search, setSearch] = useState('');
  const [filterLang, setFilterLang] = useState('Todos');
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [copied, setCopied] = useState(false);

  async function loadProjects() {
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch(`${API_URL}/api/projects`, { next: { revalidate: 3600 } });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} — ${res.statusText}`);
      }
      const data: Repository[] = await res.json();
      setRepos(data);
      setStatus('success');
    } catch (err: any) {
      setErrorMsg(err.message || String(err));
      setStatus('error');
    }
  }

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCopyInstall = (name: string) => {
    const cmd = `npm install @orbesystems/${name.toLowerCase()}-sdk`;
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Extract all unique languages
  const languages = ['Todos', ...Array.from(new Set(repos.map(r => r.language).filter((l): l is string => typeof l === 'string')))];

  // Filter repositories
  const filteredRepos = repos.filter(repo => {
    const matchesSearch = 
      repo.name.toLowerCase().includes(search.toLowerCase()) ||
      (repo.description || '').toLowerCase().includes(search.toLowerCase());
    
    const matchesLang = filterLang === 'Todos' || repo.language === filterLang;
    
    return matchesSearch && matchesLang;
  });

  return (
    <main className="min-h-screen bg-[#0c0a08] text-[#dfd2b8] flex flex-col pt-24 sketch-grid">
      <Header />

      <div className="flex-1 max-w-7xl w-full mx-auto px-6 py-12 space-y-12">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center gap-2 font-cinzel text-[10px] tracking-wider uppercase text-renaissance-muted">
          <Link href="/" className="hover:text-renaissance-gold flex items-center gap-1 transition-colors">
            <ArrowLeft size={10} className="text-renaissance-gold" />
            Galleria d'Orbe
          </Link>
          <span className="text-white/25">/</span>
          <span className="text-renaissance-gold">expositio repositorium</span>
        </div>

        {/* Section Header */}
        <div className="space-y-4">
          <h1 className="font-cinzel text-3xl md:text-5xl font-semibold tracking-wide text-white/95">
            Ecosistema di <span className="text-renaissance-gold italic font-serif normal-case font-normal">Capolavori</span>
          </h1>
          <p className="font-serif text-sm md:text-base text-renaissance-muted max-w-3xl leading-relaxed italic">
            Coleção completa de bibliotecas, engines de cálculo lógico e auditorias de segurança estruturadas em divina proporção pela Officina d'Orbe.
          </p>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-renaissance-surface border border-renaissance-border rounded p-4 shadow-md">
          {/* Search Box */}
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-renaissance-muted" size={14} />
            <input
              type="text"
              placeholder="Buscar obra por nome ou descrição..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-renaissance-bg border border-renaissance-border rounded pl-10 pr-4 py-2 font-serif text-xs text-[#dfd2b8] outline-none focus:border-renaissance-gold/50 focus:shadow-gilt transition-all"
            />
          </div>

          {/* Language filters */}
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            {languages.map(lang => (
              <button
                key={lang}
                onClick={() => setFilterLang(lang)}
                className={`px-4 py-2 rounded font-cinzel text-[9px] uppercase tracking-widest transition-all border whitespace-nowrap ${
                  filterLang === lang
                    ? 'bg-renaissance-gold/25 text-renaissance-gold border-renaissance-gold/65 shadow-gilt'
                    : 'bg-renaissance-bg text-renaissance-muted border-renaissance-border hover:text-[#dfd2b8] hover:border-renaissance-gold/40'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {status === 'loading' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white/2 border border-white/5 rounded-xl p-5 space-y-4 animate-pulse">
                <div className="h-4 bg-white/10 rounded w-1/3" />
                <div className="space-y-2">
                  <div className="h-3 bg-white/5 rounded w-full" />
                  <div className="h-3 bg-white/5 rounded w-5/6" />
                </div>
                <div className="h-8 bg-white/5 rounded-lg w-full mt-4" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="flex flex-col items-center justify-center gap-6 py-20 text-center">
            <div className="w-16 h-16 rounded-full border border-red-500/40 flex items-center justify-center bg-red-500/5">
              <AlertTriangle size={28} className="text-red-400" />
            </div>
            <div>
              <p className="font-mono text-sm text-red-400 mb-1">Falha na conexão com a gateway de projetos</p>
              <p className="font-mono text-xs text-terminal-muted">{errorMsg}</p>
            </div>
            <button
              onClick={loadProjects}
              className="flex items-center gap-2 font-mono text-xs border border-neon-cyan/40 text-neon-cyan px-4 py-2 rounded hover:bg-neon-cyan/10 transition-all duration-300"
            >
              <RefreshCw size={12} />
              Tentar Novamente
            </button>
          </div>
        )}

        {/* Empty State */}
        {status === 'success' && filteredRepos.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-4 py-24 border border-dashed border-renaissance-border rounded bg-renaissance-surface/40">
            <Terminal size={32} className="text-renaissance-muted" />
            <p className="font-serif text-sm text-renaissance-muted italic">Nenhuma obra técnica corresponde aos filtros aplicados.</p>
          </div>
        )}

        {/* Success Grid */}
        {status === 'success' && filteredRepos.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRepos.map(repo => (
              <div
                key={repo.id}
                onClick={() => setSelectedRepo(repo)}
                className="group cursor-pointer bg-renaissance-surface hover:shadow-spotlight flex flex-col justify-between transition-all duration-300 relative overflow-hidden gilded-frame"
              >
                {/* Visual Glow */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-500 spotlight-glow" />

                <div className="space-y-4 relative z-10 p-5 pb-0">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2 text-white/90 group-hover:text-renaissance-gold transition-colors">
                      <Code2 size={16} className="text-renaissance-gold" />
                      <h3 className="font-cinzel text-sm font-semibold tracking-wider truncate max-w-[190px]">
                        {repo.name}
                      </h3>
                    </div>
                    {repo.is_featured && (
                      <span className="font-cinzel text-[8px] text-[#ffd700] tracking-widest px-2 py-0.5 rounded border border-[#ffd700]/30 bg-renaissance-gold/5">
                        CAPOLAVORO
                      </span>
                    )}
                  </div>

                  <p className="font-serif text-xs text-[#dfd2b8]/75 line-clamp-3 leading-relaxed italic">
                    {repo.description || 'Nenhuma descrição fornecida para esta obra técnica.'}
                  </p>
                </div>

                {/* Cartellino info plate */}
                <div className="mx-5 my-3 relative z-10 cartellino">
                  <div className="text-[7.5px] font-cinzel tracking-widest text-[#52141a] uppercase font-bold">Cartellino</div>
                  <div className="text-[10px] font-serif font-bold text-[#1c130d] truncate mt-0.5">{repo.name}</div>
                  <div className="text-[9px] font-serif italic text-[#1c130d]/85 mt-0.5 leading-none">
                    Materia: {repo.language || 'Codice Logico'} su Silicio
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-renaissance-border pt-4 px-5 pb-5 mt-3 relative z-10 text-renaissance-muted">
                  {/* Language Badge */}
                  <span className="font-cinzel text-[9px] uppercase tracking-wider flex items-center gap-1.5">
                    <Tag size={10} className="text-renaissance-gold/80" />
                    {repo.language || 'Documentazione'}
                  </span>

                  {/* Stars / Watchers */}
                  <div className="flex items-center gap-3 font-serif text-xs">
                    <span className="flex items-center gap-1">
                      <Star size={11} className="text-renaissance-gold" /> {repo.stargazers_count || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye size={11} /> {repo.watchers_count || 0}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Project Detail Modal */}
        {selectedRepo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-[#0c0a08]/95 backdrop-blur-sm" onClick={() => setSelectedRepo(null)} />
            
            {/* Modal Body */}
            <div className="relative z-10 w-full max-w-lg bg-[#f1e7d0] border-4 border-double border-[#c5a059] rounded overflow-hidden shadow-2xl animate-fade-in-up">
              {/* Top Banner */}
              <div className="h-2 bg-gradient-to-r from-renaissance-gold to-renaissance-burgundy" />
              
              <div className="p-6 space-y-6">
                
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-cinzel text-base font-bold text-[#1c130d] flex items-center gap-2 tracking-wide uppercase">
                      <GitBranch size={16} className="text-renaissance-burgundy" />
                      {selectedRepo.name}
                    </h3>
                    <p className="font-serif text-[11px] text-renaissance-burgundy/80 italic mt-1 font-bold">
                      {selectedRepo.language || 'Logical Scroll'} su Silicio
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedRepo(null)}
                    className="text-renaissance-muted hover:text-renaissance-burgundy font-cinzel text-[10px] uppercase tracking-widest transition-colors"
                  >
                    chiudere [esc]
                  </button>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <h4 className="font-cinzel text-[9px] text-[#52141a] font-bold tracking-wider uppercase">Descrizione Generale</h4>
                  <p className="font-serif text-xs text-[#2b1d16] leading-relaxed italic">
                    {selectedRepo.description || 'Este projeto faz parte do ecossistema tecnológico da Orbe Systems, cobrindo automação inteligente, verificação rigorosa de software e arquiteturas descentralizadas.'}
                  </p>
                </div>

                {/* SDK Installation Command */}
                <div className="space-y-2">
                  <h4 className="font-cinzel text-[9px] text-[#52141a] font-bold tracking-wider uppercase">Instalação / SDK</h4>
                  <div className="flex items-center justify-between bg-[#181310] border border-renaissance-border rounded p-3 font-mono text-xs text-[#dfd2b8] shadow-inner select-all">
                    <span>npm install @orbesystems/{selectedRepo.name.toLowerCase()}-sdk</span>
                    <button
                      onClick={() => handleCopyInstall(selectedRepo.name)}
                      className="p-1 hover:bg-white/5 rounded text-renaissance-muted hover:text-renaissance-gold transition-colors"
                      title="Copiar comando"
                    >
                      {copied ? <Check size={14} className="text-renaissance-gold" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                {/* Details list */}
                <div className="grid grid-cols-3 gap-4 border-t border-[#2b1d16]/15 pt-4 text-[#1c130d]">
                  <div>
                    <div className="font-cinzel text-[8px] text-renaissance-burgundy/80 font-bold uppercase tracking-wider">Stars</div>
                    <div className="font-serif text-sm font-bold mt-0.5">{selectedRepo.stargazers_count || 0}</div>
                  </div>
                  <div>
                    <div className="font-cinzel text-[8px] text-renaissance-burgundy/80 font-bold uppercase tracking-wider">Watchers</div>
                    <div className="font-serif text-sm font-bold mt-0.5">{selectedRepo.watchers_count || 0}</div>
                  </div>
                  <div>
                    <div className="font-cinzel text-[8px] text-renaissance-burgundy/80 font-bold uppercase tracking-wider">Forks</div>
                    <div className="font-serif text-sm font-bold mt-0.5">{selectedRepo.forks_count || 0}</div>
                  </div>
                </div>

                {/* External Link */}
                {selectedRepo.html_url && (
                  <a
                    href={selectedRepo.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 bg-renaissance-surface border border-renaissance-border rounded font-cinzel text-[10px] uppercase tracking-widest text-[#dfd2b8] hover:bg-renaissance-bg transition-colors shadow-sm"
                  >
                    Ver Repositório no GitHub <ExternalLink size={12} className="text-renaissance-gold" />
                  </a>
                )}

              </div>
            </div>
          </div>
        )}

      </div>

      <Footer />
    </main>
  );
}
