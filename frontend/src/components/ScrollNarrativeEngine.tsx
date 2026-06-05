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
        onUpdate: (self) => updateNarrativeFromScroll(self.progress),
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

      {/* Espaço extra de scroll — capítulo 2 (projetos) */}
      <div className="h-[30vh] pointer-events-none" aria-hidden="true" />
    </div>
  );
}
