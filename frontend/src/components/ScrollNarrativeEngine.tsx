'use client';

import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import AtomParticleField from './AtomParticleField';
import OrbLottieLayer from './OrbLottieLayer';
import { updateNarrativeFromScroll } from '@/lib/narrative-state';

gsap.registerPlugin(ScrollTrigger);

type Props = {
  children: React.ReactNode;
};

export default function ScrollNarrativeEngine({ children }: Props) {
  const narrativeRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const narrative = narrativeRef.current;
    const backdrop = backdropRef.current;
    if (!narrative || !backdrop) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      updateNarrativeFromScroll(0.65);
      return;
    }

    const ctx = gsap.context(() => {
      // ── Narrative progress ──
      ScrollTrigger.create({
        trigger: narrative,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1.15,
        onUpdate: (self) => {
          const progress = self.progress;
          updateNarrativeFromScroll(progress);
          
          // Direct HUD update (no React state re-render for high performance)
          const hud = document.getElementById('scroll-hud');
          const hudLoc = document.getElementById('hud-location');
          const hudMod = document.getElementById('hud-module');
          const hudTel = document.getElementById('hud-telemetry');
          const hudPct = document.getElementById('hud-progress-pct');
          const hudBar = document.getElementById('hud-progress-bar');
          
          if (hud) {
            if (progress > 0.02 && progress < 0.96) {
              hud.style.opacity = '1';
              hud.style.pointerEvents = 'auto';
            } else {
              hud.style.opacity = '0';
              hud.style.pointerEvents = 'none';
            }
          }
          
          if (hudPct) hudPct.innerText = `${(progress * 100).toFixed(1)}%`;
          if (hudBar) hudBar.style.width = `${progress * 100}%`;
          
          if (progress < 0.28) {
            if (hudLoc) hudLoc.innerText = 'CHAPTER_01';
            if (hudMod) {
              hudMod.innerText = 'CORE_NUCLEUS';
              hudMod.style.color = '#00fff5'; // neon cyan
            }
            if (hudTel) hudTel.innerText = `COHESION: ${(Math.min(100, progress * 4.5 * 100)).toFixed(0)}%`;
          } else if (progress < 0.65) {
            if (hudLoc) hudLoc.innerText = 'CHAPTER_02';
            if (hudMod) {
              hudMod.innerText = 'VDE_WORKSPACE';
              hudMod.style.color = '#39ff14'; // neon green
            }
            if (hudTel) hudTel.innerText = `LOTTIE_PROG: ${(Math.min(100, (progress - 0.28) / (0.65 - 0.28) * 100)).toFixed(0)}%`;
          } else {
            if (hudLoc) hudLoc.innerText = 'CHAPTER_03';
            if (hudMod) {
              hudMod.innerText = 'PUBLIC_REPOS';
              hudMod.style.color = '#bc13fe'; // neon purple
            }
            if (hudTel) hudTel.innerText = `DBMS_SYNC: ACTIVE`;
          }

          // Generate automatic technical logs based on scroll progress delta
          const container = document.getElementById('hud-logs-container');
          if (container) {
            const currentScrollPos = window.scrollY;
            const lastScrollPos = (container as any).lastScrollPos || 0;
            const delta = Math.abs(currentScrollPos - lastScrollPos);
            
            if (delta > 35) { // every 35px of scroll delta
              (container as any).lastScrollPos = currentScrollPos;
              
              const logPool = [
                `SYS: MEM_ALLOC 0x${Math.floor(Math.random()*16777215).toString(16).toUpperCase()}`,
                `NET: GATEWAY PING ${(Math.random()*15 + 5).toFixed(1)}ms`,
                `SEC: PORT_SCAN ${[22, 80, 443, 8000, 8080][Math.floor(Math.random()*5)]} (OPEN)`,
                `IA: MODEL_STATUS ${['QWEN2.5', 'DEEPSEEK', 'GEMINI_1.5'][Math.floor(Math.random()*3)]} ACTIVE`,
                `DB: SYNC_LATENCY ${Math.floor(Math.random()*120 + 40)}ms`,
                `Z3: PROVER_RESULT ${['OK', 'SAT', 'UNSAT'][Math.floor(Math.random()*3)]}`,
                `VDE: CPU_LOAD ${(Math.random()*20 + 5).toFixed(0)}%`,
                `SEC: SHIELD_RLS ENFORCED`,
                `SYS: TELEMETRY ${(Math.random()*100 + 50).toFixed(0)}kb/s`,
                `SYS: ENTROPY_VAL ${(Math.random()*100).toFixed(0)}%`,
                `SYS: CACHE_HIT FOR_REPOS`,
                `NET: WS_CONN ESTABLISHED`,
              ];
              const randomLog = logPool[Math.floor(Math.random() * logPool.length)];
              
              const newLine = document.createElement('span');
              newLine.innerText = `> ${randomLog}`;
              newLine.className = 'text-neon-cyan/70 text-[8px] tracking-tight truncate';
              
              container.appendChild(newLine);
              if (container.children.length > 6) {
                container.removeChild(container.children[0]);
              }
              // auto-scroll to bottom
              container.scrollTop = container.scrollHeight;
            }
          }
        },
      });

      // ── Backdrop fade ──
      gsap.fromTo(
        backdrop,
        { opacity: 1 },
        {
          opacity: 0.35,
          scrollTrigger: {
            trigger: narrative,
            start: '60% top',
            end: 'bottom top',
            scrub: true,
          },
        }
      );

      // ── Hero section: stagger children in ──
      const heroChildren = narrative.querySelectorAll('#hero > div.relative.z-10 > *');
      if (heroChildren.length) {
        gsap.fromTo(
          heroChildren,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            stagger: 0.12,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: '#hero',
              start: 'top 85%',
              end: 'top 30%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }

      // ── Hero decorative corners: pop in ──
      const corners = narrative.querySelectorAll('#hero > div:not(.relative)');
      if (corners.length) {
        gsap.fromTo(
          corners,
          { opacity: 0, scale: 0.7 },
          {
            opacity: 1,
            scale: 1,
            stagger: 0.08,
            duration: 0.6,
            ease: 'back.out(1.4)',
            scrollTrigger: {
              trigger: '#hero',
              start: 'top 80%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }

      // ── VdePreview: slide in from left ──
      const vdeSection = narrative.querySelector('#vde-preview, [data-section="vde"]');
      if (vdeSection) {
        gsap.fromTo(
          vdeSection,
          { opacity: 0, x: -60 },
          {
            opacity: 1,
            x: 0,
            duration: 0.9,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: vdeSection,
              start: 'top 80%',
              end: 'top 40%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }

      // ── Projects header ──
      const projectsHeader = narrative.querySelector('#projects h2');
      if (projectsHeader) {
        gsap.fromTo(
          projectsHeader,
          { opacity: 0, y: 24, scale: 0.96 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.7,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: '#projects',
              start: 'top 75%',
              end: 'top 40%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }

      // ── Project cards: staggered cascade ──
      const cards = narrative.querySelectorAll('#projects article');
      if (cards.length) {
        gsap.fromTo(
          cards,
          { opacity: 0, y: 50, scale: 0.94 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            stagger: 0.08,
            duration: 0.65,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: '#projects',
              start: 'top 65%',
              toggleActions: 'play none none none',
            },
          }
        );
      }

    }, narrative);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={narrativeRef} id="scroll-narrative" className="relative">
      <div
        ref={backdropRef}
        className="fixed inset-0 z-[1] pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        <AtomParticleField />
        <OrbLottieLayer />
      </div>

      <div className="relative z-10">{children}</div>

      {/* Floating HUD: Diagnostics console */}
      <div 
        id="scroll-hud" 
        className="fixed right-8 top-[35%] -translate-y-1/2 z-[40] hidden xl:flex flex-col w-64 bg-terminal-surface/75 border border-terminal-border/60 backdrop-blur-md rounded-lg p-4 font-mono text-[10px] text-terminal-muted space-y-3 opacity-0 transition-opacity duration-300 pointer-events-none"
        style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
      >
        <div className="flex items-center justify-between border-b border-terminal-border/40 pb-2">
          <span className="text-neon-cyan font-bold tracking-widest uppercase">SYS DIAGNOSTIC</span>
          <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-pulse" />
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <span>SYS_LOC:</span>
            <span id="hud-location" className="text-white font-bold">HERO_CORE</span>
          </div>
          <div className="flex justify-between">
            <span>MODULE:</span>
            <span id="hud-module" className="text-white">CORE_NUCLEUS</span>
          </div>
          <div className="flex justify-between">
            <span>TELEMETRY:</span>
            <span id="hud-telemetry" className="text-white">PARTICLES: 96/96</span>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-[9px] opacity-75">
            <span>SCROLL_TRIGGER:</span>
            <span id="hud-progress-pct">0.0%</span>
          </div>
          {/* Scroll progress bar */}
          <div className="h-1.5 w-full bg-white/5 border border-white/10 rounded overflow-hidden">
            <div id="hud-progress-bar" className="h-full bg-neon-cyan transition-all duration-75" style={{ width: '0%' }} />
          </div>
        </div>
        <div 
          id="hud-logs-container" 
          className="border-t border-terminal-border/30 pt-2 text-[8px] text-terminal-muted/75 flex flex-col gap-0.5 h-20 overflow-hidden font-mono"
          style={{ scrollBehavior: 'smooth' }}
        >
          <span className="text-neon-cyan/70">&gt; Booting Orbe HUD v1.2.0...</span>
          <span className="text-neon-cyan/70">&gt; Core nucleus online.</span>
        </div>
      </div>

      {/* Espaço extra de scroll — capítulo 2 (projetos) */}
      <div className="h-[30vh] pointer-events-none" aria-hidden="true" />
    </div>
  );
}
