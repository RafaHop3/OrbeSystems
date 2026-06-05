'use client';

import { useState } from 'react';
import { Bot, HelpCircle, MessageSquare } from 'lucide-react';

const STEPS = [
  {
    title: 'Iniciando o ambiente Orbe VDE',
    body: 'Ambiente virtual no navegador: terminal, WebIDE e auditoria sem instalar IDEs pesadas na sua máquina. Soberania técnica direto no browser.',
  },
  {
    title: 'Terminal-first & cyber safety',
    body: 'Use a aba Terminal para comandos e logs. A aba WebIDE simula o fluxo de engenharia cirúrgica — consultoria e automação no ambiente do cliente.',
  },
  {
    title: 'Infraestrutura blindada',
    body: 'Explore IMORTAL e Imobverse nas ferramentas premium. RLS, auditoria e hardening fazem parte do ecossistema Orbe Systems.',
  },
];

export default function VdeAssistant() {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <aside
      className="w-full lg:w-[340px] shrink-0 m-3 lg:m-4 rounded-xl border border-neon-cyan/20 overflow-hidden flex flex-col max-h-[calc(100vh-120px)]"
      style={{
        background: 'rgba(13, 17, 23, 0.82)',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 24px 48px rgba(0,0,0,0.45)',
      }}
    >
      <div className="h-1 bg-terminal-border">
        <div
          className="h-full bg-gradient-to-r from-neon-blue to-neon-cyan transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="p-4 border-b border-white/5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center">
          <Bot size={18} className="text-neon-cyan" />
        </div>
        <div>
          <p className="font-mono text-xs font-bold text-white">Orbe Assistant</p>
          <p className="font-mono text-[10px] text-terminal-muted">guia do ambiente virtual</p>
        </div>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        <h3 className="font-sans text-lg font-bold text-white mb-3 leading-snug">
          {current.title}
        </h3>
        <p className="font-sans text-sm text-terminal-muted leading-relaxed">{current.body}</p>
        <div className="flex gap-2 mt-4">
          {STEPS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStep(i)}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i === step ? 'bg-neon-cyan' : 'bg-white/10 hover:bg-white/20'
              }`}
              aria-label={`Passo ${i + 1}`}
            />
          ))}
        </div>
      </div>

      <div className="p-3 border-t border-white/5 flex gap-2">
        <button
          type="button"
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-white/10 bg-white/5 font-mono text-xs text-terminal-muted hover:text-white hover:border-neon-cyan/30 transition-colors"
        >
          <HelpCircle size={14} className="text-red-400" />
          perguntar
        </button>
        <button
          type="button"
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-white/10 bg-white/5 font-mono text-xs text-terminal-muted hover:text-white hover:border-neon-cyan/30 transition-colors"
        >
          <MessageSquare size={14} />
          feedback
        </button>
      </div>
    </aside>
  );
}
