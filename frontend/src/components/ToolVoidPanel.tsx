'use client';

import dynamic from 'next/dynamic';
import type { VoidToolShape } from '@/components/ToolVoidCanvas';

// Three.js só carrega no navegador (compatível com Server Components).
const ToolVoidCanvas = dynamic(() => import('@/components/ToolVoidCanvas'), { ssr: false });

interface ToolVoidPanelProps {
  shape: VoidToolShape;
  accentColor: string;
  secondaryColor: string;
  label: string;
  className?: string;
}

/** Moldura padrão do void de cada projeto (rótulo + canvas WebGL). */
export default function ToolVoidPanel({
  shape,
  accentColor,
  secondaryColor,
  label,
  className = '',
}: ToolVoidPanelProps) {
  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl bg-black/50 border border-white/10 ${className}`}
    >
      <div
        aria-hidden="true"
        className="absolute top-3 left-4 z-10 flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-slate-300 bg-black/60 px-2.5 py-1 rounded border border-white/10"
      >
        <span
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ backgroundColor: accentColor }}
        />
        {label}
      </div>
      <ToolVoidCanvas
        activeShape={shape}
        accentColor={accentColor}
        secondaryColor={secondaryColor}
      />
    </div>
  );
}
