'use client';

import React, { useEffect, useRef } from 'react';
import styles from './AnimatedHero.module.css';

interface Orb {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  color: string;
}

interface Atom {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
}

export default function AnimatedHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const orbs = useRef<Orb[]>([]);
  const atoms = useRef<Atom[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  // Generate random orbs on mount
  useEffect(() => {
    orbs.current = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 40 + 20,
      duration: Math.random() * 8 + 6,
      delay: Math.random() * 2,
      opacity: Math.random() * 0.4 + 0.2,
      color: ['#00fff5', '#39ff14', '#bd00ff', '#ff00ff'][Math.floor(Math.random() * 4)],
    }));
  }, []);

  // Canvas animation for atoms
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize atoms
    atoms.current = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 1,
      vy: (Math.random() - 0.5) * 1,
      size: Math.random() * 2 + 1,
      color: ['#00fff5', '#39ff14', '#bd00ff'][Math.floor(Math.random() * 3)],
    }));

    // Animation loop
    const animate = () => {
      // Clear canvas with fade effect
      ctx.fillStyle = 'rgba(4, 6, 8, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw atoms
      atoms.current.forEach((atom) => {
        atom.x += atom.vx;
        atom.y += atom.vy;

        // Bounce off edges
        if (atom.x < 0 || atom.x > canvas.width) atom.vx *= -1;
        if (atom.y < 0 || atom.y > canvas.height) atom.vy *= -1;

        // Draw atom
        ctx.fillStyle = atom.color;
        ctx.shadowColor = atom.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(atom.x, atom.y, atom.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw connections between nearby atoms
      ctx.strokeStyle = 'rgba(0, 255, 245, 0.1)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < atoms.current.length; i++) {
        for (let j = i + 1; j < atoms.current.length; j++) {
          const dx = atoms.current[i].x - atoms.current[j].x;
          const dy = atoms.current[i].y - atoms.current[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 150) {
            ctx.beginPath();
            ctx.moveTo(atoms.current[i].x, atoms.current[i].y);
            ctx.lineTo(atoms.current[j].x, atoms.current[j].y);
            ctx.stroke();
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Scroll fade effect
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const scrolled = window.scrollY;
      const maxScroll = window.innerHeight;
      const opacity = Math.max(0, 1 - scrolled / maxScroll);
      containerRef.current.style.opacity = String(opacity);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div ref={containerRef} className={styles.heroContainer}>
      <canvas ref={canvasRef} className={styles.canvas} />

      <div className={styles.orbsContainer}>
        {orbs.current.map((orb) => (
          <div
            key={orb.id}
            className={styles.orb}
            style={{
              left: `${orb.x}%`,
              top: `${orb.y}%`,
              width: `${orb.size}px`,
              height: `${orb.size}px`,
              borderColor: orb.color,
              animation: `float ${orb.duration}s ease-in-out ${orb.delay}s infinite`,
              '--glow-color': orb.color,
              opacity: orb.opacity,
            } as React.CSSProperties}
          />
        ))}
      </div>

      <div className={styles.content}>
        <h1 className={styles.title}>
          <span className={styles.word}>Peace</span>
          <span className={styles.word} style={{ animationDelay: '0.2s' }}>Through</span>
          <span className={styles.word} style={{ animationDelay: '0.4s' }}>
            Technology
          </span>
        </h1>
        <p className={styles.subtitle}>
          Orbe Systems — Where innovation meets harmony
        </p>
        <div className={styles.ctaContainer}>
          <button className={styles.primaryBtn}>Explore</button>
          <button className={styles.secondaryBtn}>Learn More</button>
        </div>
      </div>

      <div className={styles.scrollIndicator}>
        <div className={styles.scrollDot} />
        <span>Scroll to discover</span>
      </div>
    </div>
  );
}
