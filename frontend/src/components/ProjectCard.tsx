'use client';

import { useState, useEffect, useRef } from 'react';
import { Star, GitFork, ExternalLink, Shield, Zap, Globe, Lock } from 'lucide-react';
import Link from 'next/link';
import type { Repository } from '@/types/repository';

const LANGUAGE_COLORS: Record<string, string> = {
  Python: '#3776ab',
  TypeScript: '#3178c6',
  JavaScript: '#f7df1e',
  Rust: '#dea584',
  Go: '#00add8',
  'C++': '#f34b7d',
  C: '#555555',
  Shell: '#89e051',
  HTML: '#e34c26',
  CSS: '#563d7c',
};

interface ProjectCardProps {
  repo: Repository;
  index: number;
}

function formatDate(raw: string): string {
  if (!raw) return '—';
  return new Date(raw).toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateYear(raw: string): string {
  if (!raw) return '—';
  return new Date(raw).getFullYear().toString();
}

export default function ProjectCard({ repo, index }: ProjectCardProps) {
  const langColor = LANGUAGE_COLORS[repo.language ?? ''] ?? '#8e7f73';
  const animDelay = `${index * 80}ms`;

  const [scanState, setScanState] = useState<'hidden' | 'scanning' | 'decrypting' | 'discovered'>('hidden');
  const [scanProgress, setScanProgress] = useState(0);
  const cardRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setScanState('scanning');
          observer.unobserve(el);
        }
      },
      { threshold: 0.05 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (scanState === 'hidden' || scanState === 'discovered') return;

    const duration = 1200; // 1.2 segundos para restaurar
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.floor((elapsed / duration) * 100));
      setScanProgress(pct);

      if (pct >= 50 && scanState === 'scanning') {
        setScanState('decrypting');
      }

      if (pct >= 100) {
        clearInterval(interval);
        setScanState('discovered');
      }
    }, 50);

    return () => clearInterval(interval);
  }, [scanState]);

  return (
    <article
      ref={cardRef}
      className={`group relative flex flex-col overflow-hidden transition-all duration-700 ease-in-out hover:-translate-y-1 bg-[#181310]
                 ${scanState === 'discovered' 
                   ? 'max-h-[850px] gilded-frame hover:shadow-spotlight' 
                   : 'max-h-[130px] border-2 border-renaissance-gold/30 shadow-[0_0_15px_rgba(212,175,55,0.05)]'
                 }`}
      style={{ animationDelay: animDelay }}
    >
      {/* Museum Title/Catalog Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#130f0d] border-b border-renaissance-border flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="font-cinzel text-[9px] tracking-widest text-renaissance-gold uppercase">
            OPERA N. {index + 1}
          </span>
        </div>
        <span className="font-serif text-[10px] text-renaissance-muted italic truncate max-w-[150px]">
          {repo.name.toLowerCase()}
        </span>
        {repo.is_featured && scanState === 'discovered' && (
          <span className="font-cinzel text-[8px] tracking-widest text-[#ffd700] border border-[#ffd700]/30 bg-renaissance-gold/10 px-1.5 py-0.5 rounded">
            CAPOLAVORO
          </span>
        )}
      </div>

      {/* Museum Restoration Scan overlay */}
      {scanState !== 'discovered' && (
        <div className="flex-1 flex flex-col justify-center p-5 bg-[#120d0a] relative overflow-hidden h-[94px] font-serif select-none">
          {/* Scanning Golden Light Beam */}
          <div className="absolute left-0 right-0 h-0.5 bg-[#d4af37] shadow-[0_0_10px_#ffd700] animate-scan-beam" />
          
          <div className="flex items-center justify-between mb-1.5 font-cinzel">
            <span className="text-[9px] text-renaissance-gold tracking-widest animate-pulse flex items-center gap-1.5 uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-renaissance-gold animate-ping" />
              Svelando il Disegno ({scanProgress}%)
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-white/5 border border-renaissance-border rounded overflow-hidden mb-2">
            <div 
              className="h-full bg-renaissance-gold transition-all duration-75" 
              style={{ width: `${scanProgress}%` }} 
            />
          </div>

          {/* Telemetry logs */}
          <div className="text-[9px] text-renaissance-muted italic">
            {scanProgress < 30 && `> Preparando: ORBE://${repo.name.toUpperCase()}`}
            {scanProgress >= 30 && scanProgress < 60 && `> Processando: delineando contornos`}
            {scanProgress >= 60 && scanProgress < 90 && `> Analisando: [${repo.language ? repo.language.toUpperCase() : 'DOCUMENTAÇÃO'}]`}
            {scanProgress >= 90 && `> Concluído: projeto revelado.`}
          </div>
        </div>
      )}

      {/* Card content - revealed once discovered */}
      <div className={`flex flex-col flex-1 gap-0 transition-opacity duration-500 ${scanState === 'discovered' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {/* Media Section */}
        {(repo.image_url || repo.video_url) && (
          <div className="relative w-full aspect-video bg-black/40 overflow-hidden border-b border-renaissance-border/50 transition-colors">
            {repo.video_url ? (
              <video 
                src={repo.video_url} 
                autoPlay 
                muted 
                loop 
                playsInline
                className="w-full h-full object-cover opacity-75 group-hover:opacity-95 transition-opacity"
              />
            ) : (
              <img 
                src={repo.image_url} 
                alt={repo.name}
                className="w-full h-full object-cover opacity-75 group-hover:opacity-95 transition-opacity"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          </div>
        )}

        <div className="p-5 flex flex-col flex-1 gap-4">
          {/* Name */}
          <div>
            <h3 className="font-cinzel text-sm font-semibold tracking-wider text-white group-hover:text-renaissance-gold transition-colors duration-300">
              {repo.name}
            </h3>
          </div>

          {/* Description */}
          <p className="font-serif text-xs text-[#dfd2b8]/75 leading-relaxed flex-1 line-clamp-3 italic">
            {repo.custom_description || repo.description || (
              <span className="italic text-renaissance-muted/50">
                # O código conta sua própria história.
              </span>
            )}
          </p>

          {/* Info do Projeto */}
          <div className="cartellino mt-1 select-none">
            <div className="text-[8px] font-cinzel tracking-widest text-[#52141a] uppercase font-bold">Info do Projeto</div>
            <div className="text-[11px] font-serif font-bold text-[#1c130d] mt-0.5">{repo.name}</div>
            <div className="text-[10px] font-serif italic text-[#1c130d]/85 leading-none mt-1">
              Linguagem: <span className="font-bold">{repo.language || 'Código'}</span> · {formatDateYear(repo.updated_at)}
            </div>
          </div>

          {/* Topics */}
          {/* Topics */}
          {Array.isArray(repo.topics) && repo.topics.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {repo.topics.slice(0, 4).map((topic) => (
                <span
                  key={topic}
                  className="font-cinzel text-[8px] tracking-wider px-2 py-0.5 rounded border border-renaissance-gold/20 text-renaissance-gold/85 bg-renaissance-gold/5"
                >
                  {topic.toUpperCase()}
                </span>
              ))}
            </div>
          )}

          {/* Meta row */}
          <div className="flex items-center justify-between pt-3 border-t border-renaissance-border text-renaissance-muted">
            <div className="flex items-center gap-4">
              {/* Language */}
              {repo.language && (
                <span className="flex items-center gap-1.5 font-cinzel text-[9px] uppercase tracking-wider">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: langColor }}
                  />
                  {repo.language}
                </span>
              )}

              {/* Stars */}
              <span className="flex items-center gap-1 font-serif text-xs">
                <Star size={11} className="text-renaissance-gold" />
                {repo.stargazers_count ?? 0}
              </span>

              {/* Forks */}
              <span className="flex items-center gap-1 font-serif text-xs">
                <GitFork size={11} />
                {repo.forks_count ?? 0}
              </span>
            </div>

            {/* Updated */}
            <span className="font-serif text-[10px] italic">
              Aggiornato il {formatDate(repo.updated_at)}
            </span>
          </div>

          {/* CTA buttons */}
          <div className="flex flex-col gap-2 mt-1">
            {typeof repo.deploy_url === 'string' && repo.deploy_url.startsWith('/') ? (
              <Link
                href={repo.deploy_url}
                className="group/btn flex items-center justify-center gap-2 w-full py-2.5 rounded
                           font-cinzel text-[10px] tracking-widest uppercase font-bold
                           border-2 border-renaissance-gold text-[#dfd2b8]
                           bg-renaissance-gold/10
                           hover:bg-renaissance-gold/20 hover:text-white
                           hover:shadow-gilt
                           transition-all duration-300 relative overflow-hidden"
              >
                <Lock size={12} className="text-renaissance-gold group-hover/btn:scale-110 transition-transform duration-300" />
                Acessar Premium
              </Link>
            ) : typeof repo.deploy_url === 'string' ? (
              <a
                href={repo.deploy_url}
                target="_blank"
                rel="noopener noreferrer"
                className="group/btn flex items-center justify-center gap-2 w-full py-2.5 rounded
                           font-cinzel text-[10px] tracking-widest uppercase font-bold
                           border-2 border-renaissance-gold text-[#dfd2b8]
                           bg-renaissance-gold/10
                           hover:bg-renaissance-gold/20 hover:text-white
                           hover:shadow-gilt
                           transition-all duration-300 relative overflow-hidden"
              >
                <Globe size={12} className="text-renaissance-gold group-hover/btn:scale-110 transition-transform duration-300" />
                Ver Projeto Online
              </a>
            ) : null}
            
            <a
              href={repo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="group/btn flex items-center justify-center gap-2 w-full py-2.5 rounded
                         font-cinzel text-[9px] tracking-widest uppercase
                         border border-renaissance-gold/40 text-renaissance-gold/90
                         bg-renaissance-gold/5
                         hover:bg-renaissance-gold/15 hover:border-renaissance-gold hover:text-renaissance-gold
                         hover:shadow-gilt
                         transition-all duration-300"
            >
              <ExternalLink size={11} className="group-hover/btn:rotate-12 transition-transform duration-300" />
              Acessar Repositório
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
