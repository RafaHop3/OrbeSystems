'use client';

import { useEffect, useRef } from 'react';

const TRAIL_LENGTH = 24;
const ATOM_RADIUS = 32;

const ELECTRONS = [
  { angle: 0,                   orbitRadius: ATOM_RADIUS,      speed: 0.05,  color: '#ffd700' },
  { angle: Math.PI * 2 / 3,    orbitRadius: ATOM_RADIUS * 0.8, speed: -0.04,  color: '#d4af37' },
  { angle: Math.PI * 4 / 3,    orbitRadius: ATOM_RADIUS * 1.2, speed: 0.03,  color: '#c5a059' },
] as const;

type TrailPoint = { x: number; y: number; age: number };

export default function MouseAtomTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const trailRef = useRef<TrailPoint[]>([]);
  const rafRef = useRef<number>(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const onMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    const onLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', onLeave);
    window.addEventListener('resize', resize);

    const draw = () => {
      timeRef.current += 1;
      const t = timeRef.current;
      const { x, y } = mouseRef.current;

      // Push new trail point
      trailRef.current.push({ x, y, age: 0 });
      if (trailRef.current.length > TRAIL_LENGTH) {
        trailRef.current.shift();
      }
      // Age all points
      trailRef.current.forEach((p) => { p.age += 1; });

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      // ── Trail ──
      const trail = trailRef.current;
      for (let i = 1; i < trail.length; i++) {
        const progress = i / trail.length;
        const alpha = progress * 0.5;
        const width = progress * 3;
        ctx.beginPath();
        ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
        ctx.lineTo(trail[i].x, trail[i].y);
        ctx.strokeStyle = `rgba(212,175,55,${alpha})`;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      if (x < 0) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      // ── Nucleus ──
      const grad = ctx.createRadialGradient(x, y, 0, x, y, 10);
      grad.addColorStop(0, 'rgba(255,215,0,0.85)');
      grad.addColorStop(0.4, 'rgba(212,175,55,0.4)');
      grad.addColorStop(1, 'rgba(212,175,55,0)');
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Inner nucleus dot
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#d4af37';
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;

      // ── Electron orbits ──
      ELECTRONS.forEach((el, idx) => {
        const angle = el.angle + t * el.speed;
        const tiltX = Math.sin(t * 0.008 + idx) * 0.6;

        // Orbit ring (ellipse)
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(tiltX + (idx * Math.PI) / ELECTRONS.length);
        ctx.beginPath();
        ctx.ellipse(0, 0, el.orbitRadius, el.orbitRadius * 0.4, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `${el.color}33`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.restore();

        // Electron dot
        const ex = x + Math.cos(angle) * el.orbitRadius;
        const ey = y + Math.sin(angle) * el.orbitRadius * 0.4;

        ctx.beginPath();
        ctx.arc(ex, ey, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = el.color;
        ctx.shadowColor = el.color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-[9999]"
      aria-hidden="true"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}
