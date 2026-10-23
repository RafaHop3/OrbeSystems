import React from 'react';

export interface ProductMetric {
  label: string;
  value: string;
}

/** Faixa de métricas técnicas do card hero (padrão HERO_CARDS do void engine). */
export default function ProductMetrics({ metrics }: { metrics: ProductMetric[] }) {
  return (
    <dl className="grid grid-cols-3 gap-3 w-full max-w-xl p-3.5 rounded-xl bg-black/40 border border-white/10">
      {metrics.map((m) => (
        <div key={m.label}>
          <dt className="text-[11px] text-slate-400">{m.label}</dt>
          <dd className="text-xs sm:text-sm font-mono font-semibold text-white mt-0.5">{m.value}</dd>
        </div>
      ))}
    </dl>
  );
}
