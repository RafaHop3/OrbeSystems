'use client';

import { useEffect, useRef } from 'react';
import { getOrbeShapePoints } from '@/lib/orbe-shape-points';
import { narrativeState } from '@/lib/narrative-state';

const PARTICLE_COUNT = 96;
const GOLD = { r: 212, g: 175, b: 55 };
const AMBER = { r: 197, g: 160, b: 89 };
const LINK_DISTANCE = 90;
const LINK_DISTANCE_COALESCED = 130;

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  homeX: number;
  homeY: number;
  targetX: number;
  targetY: number;
  size: number;
};

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export default function AtomParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const visibleRef = useRef(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const shape = getOrbeShapePoints();
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    const particles: Particle[] = [];

    const initParticles = () => {
      particles.length = 0;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const scatterX = Math.random() * width;
        const scatterY = Math.random() * height;
        particles.push({
          x: scatterX,
          y: scatterY,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          homeX: scatterX,
          homeY: scatterY,
          targetX: scatterX,
          targetY: scatterY,
          size: 1 + Math.random() * 1.2,
        });
      }
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initParticles();
    };

    const draw = () => {
      if (!visibleRef.current) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      const cohesion = prefersReduced ? 0.65 : narrativeState.cohesion;
      const chapter2 = prefersReduced ? 0 : narrativeState.chapter2;
      const centerYOffset = chapter2 * height * 0.12;

      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const shapePt = shape[i % shape.length];
        p.targetX = shapePt.x * width;
        p.targetY = shapePt.y * height + centerYOffset;

        const wander = 1 - cohesion + chapter2 * 0.25;
        const attract = cohesion * cohesion * 0.048;

        if (wander > 0.02) {
          p.vx += (Math.random() - 0.5) * 0.08 * wander;
          p.vy += (Math.random() - 0.5) * 0.08 * wander;
          p.vx += (p.homeX - p.x) * 0.0008 * wander;
          p.vy += (p.homeY - p.y) * 0.0008 * wander;
        }

        p.vx += (p.targetX - p.x) * attract;
        p.vy += (p.targetY - p.y) * attract;
        p.vx *= 0.94;
        p.vy *= 0.94;
        p.x += p.vx;
        p.y += p.vy;

        const alpha = lerp(0.35, 0.95, cohesion) * (1 - chapter2 * 0.2);
        const r = lerp(GOLD.r, AMBER.r, cohesion * 0.5);
        const g = lerp(GOLD.g, AMBER.g, cohesion * 0.5);
        const b = lerp(GOLD.b, AMBER.b, cohesion * 0.5);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${alpha})`;
        ctx.fill();
      }

      const linkDist = lerp(LINK_DISTANCE, LINK_DISTANCE_COALESCED, cohesion);
      const linkAlpha = lerp(0, 0.24, cohesion) * (1 - chapter2 * 0.35);

      if (cohesion > 0.2) {
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.hypot(dx, dy);
            if (dist < linkDist) {
              const a = (1 - dist / linkDist) * linkAlpha;
              ctx.strokeStyle = `rgba(212,175,55,${a})`;
              ctx.lineWidth = 0.6;
              ctx.beginPath();
              ctx.moveTo(particles[i].x, particles[i].y);
              ctx.lineTo(particles[j].x, particles[j].y);
              ctx.stroke();
            }
          }
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);

    const observer = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current = entry.isIntersecting;
      },
      { threshold: 0 }
    );
    observer.observe(canvas);
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    />
  );
}
