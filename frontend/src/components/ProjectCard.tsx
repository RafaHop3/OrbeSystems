'use client';

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

export default function ProjectCard({ repo, index }: ProjectCardProps) {
  const langColor = LANGUAGE_COLORS[repo.language ?? ''] ?? '#8b949e';
  const animDelay = `${index * 80}ms`;

  return (
    <article
      className="group relative flex flex-col bg-terminal-surface border border-terminal-border rounded-lg overflow-hidden 
                 transition-all duration-400 hover:-translate-y-1
                 hover:border-neon-cyan/60 hover:shadow-[0_0_30px_rgba(0,255,245,0.12),0_8px_40px_rgba(0,0,0,0.6)]"
      style={{ animationDelay: animDelay }}
    >
      {/* Terminal title bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#161b22] border-b border-terminal-border">
        <span className="w-3 h-3 rounded-full bg-[#ff5f57] border border-[#e0443e]" />
        <span className="w-3 h-3 rounded-full bg-[#febc2e] border border-[#d4a10e]" />
        <span className="w-3 h-3 rounded-full bg-[#28c840] border border-[#1aab29]" />
        <span className="ml-2 font-mono text-xs text-terminal-muted/70 flex-1 text-center truncate">
          {repo.full_name}.git
        </span>
        {repo.is_featured && (
          <span className="flex items-center gap-1 text-[10px] font-mono text-neon-purple border border-neon-purple/40 rounded px-1.5 py-0.5">
            <Zap size={8} />
            FEATURED
          </span>
        )}
      </div>

      {/* Card content */}
      <div className="flex flex-col flex-1 gap-0">
        {/* Media Section */}
        {(repo.image_url || repo.video_url) && (
          <div className="relative w-full aspect-video bg-black/40 overflow-hidden border-b border-terminal-border/50 group-hover:border-neon-cyan/30 transition-colors">
            {repo.video_url ? (
              <video 
                src={repo.video_url} 
                autoPlay 
                muted 
                loop 
                playsInline
                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
              />
            ) : (
              <img 
                src={repo.image_url} 
                alt={repo.name}
                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        )}

        <div className="p-5 flex flex-col flex-1 gap-4">
          {/* Name */}
          <div>
            <h3 className="font-mono text-base font-semibold text-white group-hover:text-neon-cyan transition-colors duration-300 flex items-center gap-2">
              <span className="text-neon-green/60 font-normal">~/</span>
              {repo.name}
            </h3>
          </div>

          {/* Description */}
          <p className="font-mono text-xs text-terminal-muted leading-relaxed flex-1 line-clamp-3">
            {repo.custom_description || repo.description || (
              <span className="italic text-terminal-muted/50">
                # Sem descrição — código fala por si.
              </span>
            )}
          </p>

          {/* Topics */}
          {repo.topics.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {repo.topics.slice(0, 5).map((topic) => (
                <span
                  key={topic}
                  className="font-mono text-[10px] px-2 py-0.5 rounded border border-neon-cyan/20 text-neon-cyan/70 bg-neon-cyan/5"
                >
                  {topic}
                </span>
              ))}
            </div>
          )}

          {/* Meta row */}
          <div className="flex items-center justify-between pt-3 border-t border-terminal-border">
            <div className="flex items-center gap-4">
              {/* Language */}
              {repo.language && (
                <span className="flex items-center gap-1.5 font-mono text-xs text-terminal-muted">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: langColor }}
                  />
                  {repo.language}
                </span>
              )}

              {/* Stars */}
              <span className="flex items-center gap-1 font-mono text-xs text-terminal-muted">
                <Star size={11} className="text-yellow-400/70" />
                {repo.stargazers_count}
              </span>

              {/* Forks */}
              <span className="flex items-center gap-1 font-mono text-xs text-terminal-muted">
                <GitFork size={11} />
                {repo.forks_count}
              </span>
            </div>

            {/* Updated */}
            <span className="font-mono text-[10px] text-terminal-muted/50">
              {formatDate(repo.updated_at)}
            </span>
          </div>

          {/* CTA buttons */}
          <div className="flex flex-col gap-2 mt-1">
            {repo.deploy_url && (
              // Internal route (premium tools) → SPA Link
              // External URL → new tab anchor
              repo.deploy_url.startsWith('/') ? (
                <Link
                  href={repo.deploy_url}
                  className="group/btn flex items-center justify-center gap-2 w-full py-2.5 rounded
                             font-mono text-xs font-bold tracking-[0.2em] uppercase
                             border border-neon-purple/50 text-neon-purple
                             bg-neon-purple/10
                             hover:bg-neon-purple/20 hover:border-neon-purple hover:text-white
                             hover:shadow-[0_0_20px_rgba(188,19,254,0.4)]
                             transition-all duration-300 relative overflow-hidden"
                >
                  <Lock size={14} className="group-hover/btn:scale-110 transition-transform duration-300" />
                  Acessar Premium
                </Link>
              ) : (
                <a
                  href={repo.deploy_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group/btn flex items-center justify-center gap-2 w-full py-2.5 rounded
                             font-mono text-xs font-bold tracking-[0.2em] uppercase
                             border border-neon-purple/50 text-neon-purple
                             bg-neon-purple/10
                             hover:bg-neon-purple/20 hover:border-neon-purple hover:text-white
                             hover:shadow-[0_0_20px_rgba(188,19,254,0.4)]
                             transition-all duration-300 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:animate-shimmer" />
                  <Globe size={14} className="group-hover/btn:scale-110 transition-transform duration-300" />
                  Ver Projeto Online
                </a>
              )
            )}
            
            <a
              href={repo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="group/btn flex items-center justify-center gap-2 w-full py-2.5 rounded
                         font-mono text-xs font-medium tracking-wider
                         border border-neon-cyan/40 text-neon-cyan/80
                         bg-neon-cyan/5
                         hover:bg-neon-cyan/15 hover:border-neon-cyan hover:text-neon-cyan
                         hover:shadow-neon-cyan
                         transition-all duration-300"
            >
              <ExternalLink size={12} className="group-hover/btn:rotate-12 transition-transform duration-300" />
              Acessar Repositório
            </a>
          </div>
        </div>
      </div>

      {/* Featured glow overlay */}
      {repo.is_featured && (
        <div className="absolute inset-0 rounded-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="absolute inset-0 bg-gradient-to-b from-neon-purple/5 via-transparent to-neon-cyan/5 rounded-lg" />
        </div>
      )}
    </article>
  );
}
