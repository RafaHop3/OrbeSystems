'use client';

import { useEffect, useRef } from 'react';
import { NAVY } from '@/lib/navy-palette';
import { narrativeState } from '@/lib/narrative-state';
import { getOrbeShapePoints } from '@/lib/orbe-shape-points';

type Props = {
  /** mini = header logo (~40px), hero = seção principal, full = viewport fixo */
  variant?: 'full' | 'hero' | 'mini';
  className?: string;
};

const PARTICLE_COUNT = 72;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export default function MetallicNavyCanvas({ variant = 'full', className = '' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = canvas.getContext('2d', { alpha: variant !== 'full' });
    if (!ctx) return;

    const shape = getOrbeShapePoints();
    let w = 0;
    let h = 0;
    let dpr = 1;

    type P = { x: number; y: number; vx: number; vy: number; hx: number; hy: number; s: number };
    const particles: P[] = [];

    const init = () => {
      particles.length = 0;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25,
          hx: Math.random() * w,
          hy: Math.random() * h,
          s: 0.6 + Math.random() * 1.2,
        });
      }
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      init();
    };

    const drawBackground = (t: number) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, NAVY.black);
      g.addColorStop(0.45, NAVY.deep);
      g.addColorStop(1, NAVY.void);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // Faixas metálicas suaves
      for (let i = 0; i < 3; i++) {
        const y = h * (0.25 + i * 0.22) + Math.sin(t * 0.0004 + i) * 30;
        const band = ctx.createLinearGradient(0, y - 80, 0, y + 80);
        band.addColorStop(0, 'rgba(0,0,0,0)');
        band.addColorStop(0.5, `rgba(61, 106, 140, ${0.04 + i * 0.015})`);
        band.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = band;
        ctx.fillRect(0, y - 80, w, 160);
      }

      // Brilho central difuso
      const cx = w / 2;
      const cy = h / 2;
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.55);
      glow.addColorStop(0, 'rgba(90, 143, 181, 0.12)');
      glow.addColorStop(0.35, 'rgba(26, 58, 92, 0.08)');
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
    };

    const drawOrbLogo = (t: number, cohesion: number) => {
      const cx = w / 2;
      const cy = h / 2;
      const base = Math.min(w, h) * (variant === 'mini' ? 0.38 : variant === 'hero' ? 0.22 : 0.18);
      const pulse = 1 + Math.sin(t * 0.0015) * 0.04;

      ctx.save();
      ctx.translate(cx, cy);

      // Anéis orbitais metálicos
      const rings = [
        { rx: base * 1.15 * pulse, ry: base * 0.32, rot: t * 0.00035, w: variant === 'mini' ? 1.2 : 1.8, a: 0.55 },
        { rx: base * 0.32, ry: base * 1.15 * pulse, rot: -t * 0.00028, w: variant === 'mini' ? 1.2 : 1.8, a: 0.5 },
        { rx: base * 0.88, ry: base * 0.88, rot: t * 0.00015, w: variant === 'mini' ? 1 : 1.4, a: 0.35, dash: true },
      ];

      for (const ring of rings) {
        ctx.save();
        ctx.rotate(ring.rot + cohesion * 0.4);
        ctx.beginPath();
        ctx.ellipse(0, 0, ring.rx, ring.ry, 0, 0, Math.PI * 2);
        const stroke = ctx.createLinearGradient(-ring.rx, 0, ring.rx, 0);
        stroke.addColorStop(0, `rgba(61, 106, 140, ${ring.a * 0.4})`);
        stroke.addColorStop(0.5, `rgba(126, 184, 224, ${ring.a})`);
        stroke.addColorStop(1, `rgba(61, 106, 140, ${ring.a * 0.4})`);
        ctx.strokeStyle = stroke;
        ctx.lineWidth = ring.w;
        if (ring.dash) ctx.setLineDash([6, 10]);
        ctx.stroke();
        ctx.restore();
      }

      // Núcleo metálico
      const coreR = base * 0.12 * (1 + cohesion * 0.15);
      const core = ctx.createRadialGradient(-coreR * 0.3, -coreR * 0.3, 0, 0, 0, coreR);
      core.addColorStop(0, 'rgba(148, 184, 212, 0.95)');
      core.addColorStop(0.5, 'rgba(90, 143, 181, 0.75)');
      core.addColorStop(1, 'rgba(26, 58, 92, 0.2)');
      ctx.beginPath();
      ctx.arc(0, 0, coreR, 0, Math.PI * 2);
      ctx.fillStyle = core;
      ctx.shadowBlur = 20 + cohesion * 25;
      ctx.shadowColor = 'rgba(126, 184, 224, 0.45)';
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.restore();
    };

    const drawParticles = (cohesion: number) => {
      const linkDist = lerp(70, 110, cohesion);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const pt = shape[i % shape.length];
        const tx = pt.x * w;
        const ty = pt.y * h;
        const wander = 1 - cohesion;

        if (wander > 0.05) {
          p.vx += (Math.random() - 0.5) * 0.04 * wander;
          p.vy += (Math.random() - 0.5) * 0.04 * wander;
        }
        p.vx += (tx - p.x) * 0.018 * cohesion;
        p.vy += (ty - p.y) * 0.018 * cohesion;
        p.vx *= 0.96;
        p.vy *= 0.96;
        p.x += p.vx;
        p.y += p.vy;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(126, 184, 224, ${lerp(0.15, 0.55, cohesion)})`;
        ctx.fill();
      }

      if (cohesion > 0.15 && variant !== 'mini') {
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.hypot(dx, dy);
            if (dist < linkDist) {
              ctx.strokeStyle = `rgba(90, 143, 181, ${(1 - dist / linkDist) * 0.12 * cohesion})`;
              ctx.lineWidth = 0.5;
              ctx.beginPath();
              ctx.moveTo(particles[i].x, particles[i].y);
              ctx.lineTo(particles[j].x, particles[j].y);
              ctx.stroke();
            }
          }
        }
      }
    };

    const tick = () => {
      if (!prefersReduced) timeRef.current += 16;
      const t = timeRef.current;
      const cohesion = prefersReduced ? 0.5 : narrativeState.cohesion;

      if (variant === 'full' || variant === 'hero') drawBackground(t);
      else {
        ctx.clearRect(0, 0, w, h);
      }

      if (variant !== 'mini') drawParticles(cohesion);
      drawOrbLogo(t, variant === 'mini' ? 0.85 : cohesion);

      rafRef.current = requestAnimationFrame(tick);
    };

    resize();
    window.addEventListener('resize', resize);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [variant]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden="true"
    />
  );
}
