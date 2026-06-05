'use client';

import { useEffect, useRef, ReactNode } from 'react';

type Variant = 'fade-up' | 'fade-left' | 'fade-right' | 'fade-in' | 'zoom-in';

interface ScrollRevealProps {
  children: ReactNode;
  variant?: Variant;
  delay?: number;   // ms
  threshold?: number; // 0–1
  className?: string;
}

const variantStyles: Record<Variant, { hidden: string; visible: string }> = {
  'fade-up':    { hidden: 'opacity-0 translate-y-10', visible: 'opacity-100 translate-y-0' },
  'fade-left':  { hidden: 'opacity-0 -translate-x-10', visible: 'opacity-100 translate-x-0' },
  'fade-right': { hidden: 'opacity-0 translate-x-10', visible: 'opacity-100 translate-x-0' },
  'fade-in':    { hidden: 'opacity-0', visible: 'opacity-100' },
  'zoom-in':    { hidden: 'opacity-0 scale-95', visible: 'opacity-100 scale-100' },
};

export default function ScrollReveal({
  children,
  variant = 'fade-up',
  delay = 0,
  threshold = 0.15,
  className = '',
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const style = variantStyles[variant];

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      el.classList.remove(...style.hidden.split(' '));
      el.classList.add(...style.visible.split(' '));
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            el.classList.remove(...style.hidden.split(' '));
            el.classList.add(...style.visible.split(' '));
          }, delay);
          observer.unobserve(el);
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [style, delay, threshold]);

  return (
    <div
      ref={ref}
      className={`${style.hidden} transition-all duration-700 ease-out will-change-transform ${className}`}
    >
      {children}
    </div>
  );
}
