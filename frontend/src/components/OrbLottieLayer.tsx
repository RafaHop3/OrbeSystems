'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef } from 'react';
import type { LottieRefCurrentProps } from 'lottie-react';
import { narrativeState } from '@/lib/narrative-state';
import orbeCoalesce from '@/assets/lottie/orbe-coalesce.json';

const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

const TOTAL_FRAMES = 89;

export default function OrbLottieLayer() {
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const tick = () => {
      const inst = lottieRef.current;
      if (inst) {
        const frame = Math.round(narrativeState.lottieProgress * TOTAL_FRAMES);
        inst.goToAndStop(frame, true);
      }
      const el = containerRef.current;
      if (el) {
        const lp = narrativeState.lottieProgress;
        el.style.opacity =
          lp > 0.08 ? String(Math.min(0.6, lp * 0.75 * (1 - narrativeState.chapter2 * 0.3))) : '0';
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(90vw,520px)] aspect-square pointer-events-none"
      style={{ opacity: 0 }}
      aria-hidden="true"
    >
      <Lottie
        lottieRef={lottieRef}
        animationData={orbeCoalesce}
        autoplay={false}
        loop={false}
        className="w-full h-full"
        style={{ filter: 'drop-shadow(0 0 40px rgba(0,255,245,0.35))' }}
      />
    </div>
  );
}
