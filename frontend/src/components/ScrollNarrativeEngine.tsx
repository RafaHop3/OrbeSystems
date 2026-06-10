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
            if (hudLoc) hudLoc.innerText = 'STANZA_I';
            if (hudMod) {
              hudMod.innerText = 'INGRESSO';
              hudMod.style.color = '#c5a059'; // gold
            }
            if (hudTel) hudTel.innerText = `COHESIO: ${(Math.min(100, progress * 4.5 * 100)).toFixed(0)}%`;
          } else if (progress < 0.65) {
            if (hudLoc) hudLoc.innerText = 'STANZA_II';
            if (hudMod) {
              hudMod.innerText = 'OFFICINA_VDE';
              hudMod.style.color = '#c5a059';
            }
            if (hudTel) hudTel.innerText = `PERSPECTIVA: ${(Math.min(100, (progress - 0.28) / (0.65 - 0.28) * 100)).toFixed(0)}%`;
          } else {
            if (hudLoc) hudLoc.innerText = 'STANZA_III';
            if (hudMod) {
              hudMod.innerText = 'CAPOLAVORI';
              hudMod.style.color = '#52141a'; // burgundy
            }
            if (hudTel) hudTel.innerText = `SVELATO: EXPONERE`;
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
                `COMPVTANDO: DATAFLOW EST STABILIS`,
                `PROBATOR_Z3: LOGICA PROVATA (SAT)`,
                `COGNITIO: GEMINI_IA OPERATING`,
                `ORBE_CORE: HARMONIA COHESIONIS`,
                `SEC_SHIELD: RLS REGVLA ENFORCED`,
                `VDE_DESKTOP: OFFICINA PROSPETTIVA`,
                `EXPOSITIO: CAPOLAVORI PLACED`,
                `NET_GATEWAY: PORTA COMMVNICATIONIS`,
                `TELEMETRIA: EFFLVSVS GOLDEN DVST`,
                `SISTEMA: ENTROPIA REDVCTA`,
              ];
              const randomLog = logPool[Math.floor(Math.random() * logPool.length)];
              
              const newLine = document.createElement('span');
              newLine.innerText = `> ${randomLog}`;
              newLine.className = 'text-[#52141a]/95 text-[8.5px] font-serif tracking-tight truncate italic';
              
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
        <AtomParticleField />
        <OrbLottieLayer />
      </div>

      <div className="relative z-10">{children}</div>

      {/* Floating HUD: Codex Orbe Scroll diary */}
      <div 
        id="scroll-hud" 
        className="fixed right-8 top-[35%] -translate-y-1/2 z-[40] hidden xl:flex flex-col w-64 bg-[#f1e7d0] border-2 border-[#c5a059] rounded p-4 font-serif text-[10px] text-[#2b1d16] space-y-3 opacity-0 transition-opacity duration-300 pointer-events-none"
        style={{ boxShadow: '2px 10px 30px rgba(0,0,0,0.65)' }}
      >
        <div className="flex items-center justify-between border-b border-[#2b1d16]/20 pb-2">
          <span className="font-cinzel text-xs text-[#52141a] font-bold tracking-wider uppercase">CODEX ORBE</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#52141a] animate-pulse" />
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <span>STANZA:</span>
            <span id="hud-location" className="font-cinzel text-[#1c130d] font-bold">STANZA_I</span>
          </div>
          <div className="flex justify-between">
            <span>DISPOSITIO:</span>
            <span id="hud-module" className="font-serif italic font-bold">INGRESSO</span>
          </div>
          <div className="flex justify-between">
            <span>PROPORTIO:</span>
            <span id="hud-telemetry" className="font-serif">PROPORZIONE AUREA</span>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-[9px] opacity-75">
            <span>SCRITTVRA:</span>
            <span id="hud-progress-pct" className="font-mono">0.0%</span>
          </div>
          {/* Scroll progress bar */}
          <div className="h-1 w-full bg-[#2b1d16]/10 border border-[#2b1d16]/20 rounded-full overflow-hidden">
            <div id="hud-progress-bar" className="h-full bg-[#52141a] transition-all duration-75" style={{ width: '0%' }} />
          </div>
        </div>
        <div 
          id="hud-logs-container" 
          className="border-t border-[#2b1d16]/20 pt-2 text-[8.5px] text-[#2b1d16]/75 flex flex-col gap-0.5 h-20 overflow-hidden font-serif italic"
          style={{ scrollBehavior: 'smooth' }}
        >
          <span className="text-[#52141a]/95">&gt; Incipit Codex Orbe v1.2.0...</span>
          <span className="text-[#52141a]/95">&gt; Stanza prima inizializzata.</span>
        </div>
      </div>

      {/* Espaço extra de scroll — capítulo 2 (projetos) */}
      <div className="h-[30vh] pointer-events-none" aria-hidden="true" />
    </div>
  );
}
