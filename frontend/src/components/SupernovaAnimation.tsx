'use client';

import { useEffect, useRef } from 'react';

interface SupernovaAnimationProps {
  className?: string;
  thumbnail?: boolean;
}

export default function SupernovaAnimation({ className = '', thumbnail = false }: SupernovaAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const size = thumbnail ? 200 : 800;
    canvas.width = size;
    canvas.height = size;

    // Supernova particles
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      alpha: number;
      decay: number;
      color: string;
    }> = [];

    // Create initial explosion
    const centerX = size / 2;
    const centerY = size / 2;
    const particleCount = thumbnail ? 100 : 500;

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = Math.random() * (thumbnail ? 3 : 8) + 1;
      particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        radius: Math.random() * (thumbnail ? 3 : 6) + 1,
        alpha: 1,
        decay: Math.random() * 0.01 + 0.005,
        color: `hsl(${200 + Math.random() * 40}, ${70 + Math.random() * 30}%, ${60 + Math.random() * 20}%)`,
      });
    }

    // Animation loop
    let animationFrame: number;
    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, size, size);

      // Update and draw particles
      particles.forEach((particle, index) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.alpha -= particle.decay;
        particle.radius *= 0.995;

        if (particle.alpha <= 0) {
          // Respawn particle
          const angle = Math.random() * Math.PI * 2;
          const velocity = Math.random() * (thumbnail ? 3 : 8) + 1;
          particles[index] = {
            x: centerX,
            y: centerY,
            vx: Math.cos(angle) * velocity,
            vy: Math.sin(angle) * velocity,
            radius: Math.random() * (thumbnail ? 3 : 6) + 1,
            alpha: 1,
            decay: Math.random() * 0.01 + 0.005,
            color: `hsl(${200 + Math.random() * 40}, ${70 + Math.random() * 30}%, ${60 + Math.random() * 20}%)`,
          };
        }

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fillStyle = particle.color.replace(')', `, ${particle.alpha})`);
        ctx.fill();

        // Add metallic glow
        ctx.shadowBlur = 15;
        ctx.shadowColor = particle.color;
      });

      // Draw core glow
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, thumbnail ? 50 : 150);
      gradient.addColorStop(0, 'rgba(100, 180, 255, 0.8)');
      gradient.addColorStop(0.5, 'rgba(50, 100, 200, 0.3)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);

      ctx.shadowBlur = 0;
      animationFrame = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [thumbnail]);

  return (
    <canvas
      ref={canvasRef}
      className={`rounded-full bg-gradient-radial from-[#0a1628] to-black ${className}`}
    />
  );
}
