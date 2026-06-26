'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

export default function MouseAtomTrail() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || typeof window === 'undefined') return;

    const container = containerRef.current;
    if (!container) return;

    // Create dot elements for the trail
    const dotsCount = 8;
    const dots: HTMLDivElement[] = [];

    for (let i = 0; i < dotsCount; i++) {
      const dot = document.createElement('div');
      dot.className = 'absolute top-0 left-0 rounded-full pointer-events-none mix-blend-screen';
      
      // The leading dot is the main cursor dot
      if (i === 0) {
        dot.className += ' w-2 h-2 bg-navy-glow z-[10000]';
        dot.style.boxShadow = '0 0 10px rgba(126, 184, 224, 0.5)';
      } else if (i === 1) {
        dot.className += ' w-7 h-7 border border-navy-shine/50 z-[9999]';
        dot.style.boxShadow = '0 0 10px rgba(90, 143, 181, 0.25)';
      } else {
        const size = 5 - i * 0.4;
        dot.className += ' z-[9998]';
        dot.style.width = `${size}px`;
        dot.style.height = `${size}px`;
        dot.style.backgroundColor = '#5a8fb5';
        dot.style.opacity = String(0.9 - i / dotsCount);
        dot.style.boxShadow = '0 0 6px rgba(126, 184, 224, 0.3)';
      }

      container.appendChild(dot);
      dots.push(dot);
    }

    // Set initial positions off-screen
    dots.forEach((dot) => {
      gsap.set(dot, { xPercent: -50, yPercent: -50, x: -100, y: -100 });
    });

    // We use quickTo for maximum 120Hz monitor efficiency and zero performance lag
    const quickX = dots.map((dot, index) => 
      gsap.quickTo(dot, 'x', { 
        duration: index === 0 ? 0.08 : 0.08 + index * 0.045, 
        ease: 'power2.out' 
      })
    );
    const quickY = dots.map((dot, index) => 
      gsap.quickTo(dot, 'y', { 
        duration: index === 0 ? 0.08 : 0.08 + index * 0.045, 
        ease: 'power2.out' 
      })
    );

    const onMouseMove = (e: MouseEvent) => {
      quickX.forEach((qX) => qX(e.clientX));
      quickY.forEach((qY) => qY(e.clientY));
    };

    const onMouseDown = () => {
      // Scale down inner dot, expand and rotate second dot
      gsap.to(dots[0], { scale: 1.8, duration: 0.1 });
      gsap.to(dots[1], { scale: 0.7, borderColor: '#00fff5', duration: 0.15 });
    };

    const onMouseUp = () => {
      gsap.to(dots[0], { scale: 1, duration: 0.1 });
      gsap.to(dots[1], { scale: 1, borderColor: '#c5a059', duration: 0.15 });
    };

    // Global listener for hovering interactive elements
    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      const isClickable = 
        target.tagName === 'A' || 
        target.tagName === 'BUTTON' || 
        target.closest('a') || 
        target.closest('button') || 
        target.classList.contains('cursor-pointer') ||
        target.getAttribute('role') === 'button';

      if (isClickable) {
        // Expand ring, make it cyan/gold hybrid
        gsap.to(dots[1], {
          scale: 1.6,
          borderColor: '#00fff5',
          backgroundColor: 'rgba(0, 255, 245, 0.05)',
          borderWidth: '2px',
          duration: 0.25,
        });
        // Fade out inner dot slightly for cleaner pointer focus
        gsap.to(dots[0], {
          scale: 0.5,
          opacity: 0.8,
          duration: 0.2,
        });
        // Make trailing particles dynamic
        dots.slice(2).forEach((dot, idx) => {
          gsap.to(dot, {
            scale: 1.4,
            backgroundColor: '#00fff5',
            duration: 0.25,
          });
        });
      }
    };

    const onMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      const isClickable = 
        target.tagName === 'A' || 
        target.tagName === 'BUTTON' || 
        target.closest('a') || 
        target.closest('button') || 
        target.classList.contains('cursor-pointer') ||
        target.getAttribute('role') === 'button';

      if (isClickable) {
        // Reset styles
        gsap.to(dots[1], {
          scale: 1,
          borderColor: '#c5a059',
          backgroundColor: 'transparent',
          borderWidth: '1px',
          duration: 0.25,
        });
        gsap.to(dots[0], {
          scale: 1,
          opacity: 1,
          duration: 0.2,
        });
        dots.slice(2).forEach((dot, idx) => {
          gsap.to(dot, {
            scale: 1,
            backgroundColor: idx % 2 === 0 ? '#c5a059' : '#00fff5',
            duration: 0.25,
          });
        });
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mouseover', onMouseOver);
    window.addEventListener('mouseout', onMouseOut);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mouseover', onMouseOver);
      window.removeEventListener('mouseout', onMouseOut);
      if (container) {
        container.innerHTML = '';
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-[99999] hidden md:block"
    />
  );
}
