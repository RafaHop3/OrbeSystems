'use client';

import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import MetallicNavyCanvas from './MetallicNavyCanvas';
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
            if (hudLoc) hudLoc.innerText = 'CH_01';
            if (hudMod) {
              hudMod.innerText = 'INGRESSO';
              hudMod.style.color = '#7eb8e0';
            }
            if (hudTel) hudTel.innerText = `COHESION: ${(Math.min(100, progress * 4.5 * 100)).toFixed(0)}%`;
          } else if (progress < 0.65) {
            if (hudLoc) hudLoc.innerText = 'CH_02';
            if (hudMod) {
              hudMod.innerText = 'WORKSPACE';
              hudMod.style.color = '#7eb8e0';
            }
            if (hudTel) hudTel.innerText = `SYNC: ${(Math.min(100, (progress - 0.28) / (0.65 - 0.28) * 100)).toFixed(0)}%`;
          } else {
            if (hudLoc) hudLoc.innerText = 'CH_03';
            if (hudMod) {
              hudMod.innerText = 'PROJECTS';
              hudMod.style.color = '#5a8fb5';
            }
            if (hudTel) hudTel.innerText = `EXPOSE: READY`;
          }

          const container = document.getElementById('hud-logs-container');
          if (container) {
            const currentScrollPos = window.scrollY;
            const lastScrollPos = (container as HTMLElement & { lastScrollPos?: number }).lastScrollPos || 0;
            const delta = Math.abs(currentScrollPos - lastScrollPos);

            if (delta > 35) {
              (container as HTMLElement & { lastScrollPos?: number }).lastScrollPos = currentScrollPos;

              const logPool = [
                'RLS lockdown verified',
                'PostgREST deny-all active',
                'Metallic navy canvas synced',
                'Orb cohesion stable',
                'API gateway operational',
                'Cyber safety posture OK',
              ];
              const randomLog = logPool[Math.floor(Math.random() * logPool.length)];

              const newLine = document.createElement('span');
              newLine.innerText = `> ${randomLog}`;
              newLine.className = 'text-navy-glow/80 text-[8px] font-mono truncate';

              container.appendChild(newLine);
              if (container.children.length > 5) {
                container.removeChild(container.children[0]);
              }
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

      // ── FreedomSection: slide up and fade in ──
      const freedomSection = narrative.querySelector('#freedom-manifesto');
      if (freedomSection) {
        gsap.fromTo(
          freedomSection,
          { opacity: 0, y: 50 },
          {
            opacity: 1,
            y: 0,
            duration: 0.95,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: freedomSection,
              start: 'top 85%',
              end: 'top 50%',
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
        <MetallicNavyCanvas variant="full" className="absolute inset-0 w-full h-full" />
      </div>

      <div className="relative z-10">{children}</div>

      {/* Floating HUD: Codex Orbe Scroll diary */}
      <div
        id="scroll-hud"
        className="fixed right-6 top-[35%] -translate-y-1/2 z-[40] hidden xl:flex flex-col w-56 glass-navy rounded-lg p-4 font-mono text-[10px] text-navy-mist space-y-3 opacity-0 transition-opacity duration-300 pointer-events-none"
      >
        <div className="flex items-center justify-between border-b border-navy-metallic/30 pb-2">
          <span className="text-xs text-navy-glow font-medium tracking-wider uppercase">Orbe HUD</span>
          <span className="w-1.5 h-1.5 rounded-full bg-navy-glow animate-pulse" />
        </div>
        <div className="space-y-1.5 text-navy-mist/80">
          <div className="flex justify-between">
            <span>CH:</span>
            <span id="hud-location" className="text-white/90 font-medium">CH_01</span>
          </div>
          <div className="flex justify-between">
            <span>MOD:</span>
            <span id="hud-module" className="text-navy-glow font-medium">INGRESSO</span>
          </div>
          <div className="flex justify-between">
            <span>TELEM:</span>
            <span id="hud-telemetry" className="text-navy-shine">—</span>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-[9px] opacity-60">
            <span>SCROLL</span>
            <span id="hud-progress-pct">0.0%</span>
          </div>
          <div className="h-0.5 w-full bg-navy-steel/40 rounded-full overflow-hidden">
            <div id="hud-progress-bar" className="h-full bg-navy-glow transition-all duration-75" style={{ width: '0%' }} />
          </div>
        </div>
        <div
          id="hud-logs-container"
          className="border-t border-navy-metallic/25 pt-2 text-[8px] flex flex-col gap-0.5 h-16 overflow-hidden"
        >
          <span className="text-navy-glow/70">&gt; navy canvas online</span>
        </div>
      </div>

      {/* Espaço extra de scroll — capítulo 2 (projetos) */}
      <div className="h-[30vh] pointer-events-none" aria-hidden="true" />
    </div>
  );
}
