'use client';

import { useState } from 'react';
import { ArrowRight, MessageSquare, Cpu, Shield, Zap, Sparkles, Check } from 'lucide-react';

interface PipelineStep {
  number: string;
  title: string;
  icon: React.ReactNode;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  description: string;
  codeSnippet: string;
}

export default function ImortalPipeline() {
  const [activeStep, setActiveStep] = useState(0);

  const steps: PipelineStep[] = [
    {
      number: '01',
      title: 'Intenção do Operador',
      icon: <MessageSquare size={18} />,
      colorClass: 'text-neon-cyan',
      bgClass: 'bg-neon-cyan/5',
      borderClass: 'border-neon-cyan/20',
      description: 'O engenheiro escreve o comportamento desejado em linguagem natural (ex: "pisque o led do pino 13 a cada 500ms").',
      codeSnippet: `// INPUT EM PORTUGUÊS CLARO
"leia a temperatura no pino analógico A0 e 
pisque o led 13 se passar de 35 graus, 
mas nunca use delays superiores a 1 segundo."`
    },
    {
      number: '02',
      title: 'Parser de IA (Gemini)',
      icon: <Sparkles size={18} />,
      colorClass: 'text-neon-purple',
      bgClass: 'bg-neon-purple/5',
      borderClass: 'border-neon-purple/20',
      description: 'A inteligência artificial interpreta o prompt, mapeia periféricos, cria as variáveis e gera a Representação Intermediária (IR) em formato JSON.',
      codeSnippet: `{
  "inputs": [{ "pin": "A0", "type": "analog", "name": "temp" }],
  "outputs": [{ "pin": 13, "type": "digital", "name": "led" }],
  "logic": [
    { "condition": "temp > 35", "action": "blink_led(500)" }
  ]
}`
    },
    {
      number: '03',
      title: 'Microsoft Z3 Prover',
      icon: <Shield size={18} />,
      colorClass: 'text-neon-green',
      bgClass: 'bg-neon-green/5',
      borderClass: 'border-neon-green/20',
      description: 'O solucionador Z3 formaliza a lógica em expressões matemáticas e prova formalmente que é impossível ocorrer divisão por zero, estouro de array ou travamento de watchdog.',
      codeSnippet: `;; PROVA FORMAL DE HARDWARE (Z3)
(declare-const temp Int)
(assert (and (>= temp 0) (<= temp 1023)))
(assert (= led_blink_rate 500))
(assert (> led_blink_rate 1000)) ; UNSAT
(check-sat) ; OK: Safe!`
    },
    {
      number: '04',
      title: 'Sandbox Fuzzing',
      icon: <Cpu size={18} />,
      colorClass: 'text-neon-pink',
      bgClass: 'bg-neon-pink/5',
      borderClass: 'border-neon-pink/20',
      description: 'A sandbox estressa o comportamento com 150 ciclos simulados estocásticos para identificar qualquer desvio lógico ou vulnerabilidade transiente de concorrência.',
      codeSnippet: `[SANDBOX FUZZER ACTIVE]
  - Run #001: inputs={temp: 12} -> OK
  - Run #075: inputs={temp: 1024} -> OutOfBounds Avoided
  - Run #150: inputs={temp: -1} -> Clamp Active
  >> Fuzzing concluído com 0 falhas.`
    },
    {
      number: '05',
      title: 'Compilação AVR',
      icon: <Zap size={18} />,
      colorClass: 'text-yellow-500',
      bgClass: 'bg-yellow-500/5',
      borderClass: 'border-yellow-500/20',
      description: 'Após aprovação matemática e estocástica, o compilador traduz a IR em C++ nativo e gera o Intel HEX assinado pronto para gravação física.',
      codeSnippet: `// C++ GERADO & VERIFICADO
void loop() {
  int temp = analogRead(A0);
  if (temp > 35) {
    digitalWrite(13, HIGH);
    delay(500);
    digitalWrite(13, LOW);
    delay(500);
  }
}`
    }
  ];

  return (
    <section id="imortal-pipeline" className="relative py-24 px-6 border-t border-terminal-border/20 bg-[#040608]">
      {/* Background Grid */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: 'linear-gradient(rgba(0,255,245,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,245,1) 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }}
      />

      <div className="max-w-6xl w-full mx-auto space-y-16 relative z-10">
        
        {/* Section Header */}
        <div className="text-center space-y-3">
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-neon-purple bg-neon-purple/5 border border-neon-purple/20 px-3 py-1 rounded-full">
            Pipeline de Engenharia
          </span>
          <h2 className="font-mono text-2xl md:text-4xl font-bold text-white tracking-tight">
            Como funciona a Tripla Verificação
          </h2>
          <p className="font-mono text-xs text-terminal-muted max-w-xl mx-auto leading-relaxed">
            Navegue pelos estágios do compilador formal e entenda a blindagem matemática aplicada a cada pino e linha lógica.
          </p>
        </div>

        {/* Responsive Pipeline Flow */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Step Selector List (Left) */}
          <div className="lg:col-span-5 space-y-3">
            {steps.map((step, idx) => {
              const isSelected = activeStep === idx;
              return (
                <button
                  key={idx}
                  onClick={() => setActiveStep(idx)}
                  className={`w-full flex items-center justify-between gap-4 p-4 rounded-xl border text-left font-mono transition-all duration-300
                    ${isSelected 
                      ? 'bg-terminal-surface border-neon-cyan/30 shadow-[0_0_20px_rgba(0,255,245,0.05)] translate-x-2' 
                      : 'bg-terminal-surface/40 border-terminal-border/40 hover:bg-terminal-surface/60 hover:border-terminal-border/80'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Icon container */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all duration-300
                      ${isSelected 
                        ? `${step.bgClass} ${step.borderClass} ${step.colorClass}` 
                        : 'bg-black/30 border-terminal-border/80 text-terminal-muted'
                      }`}
                    >
                      {step.icon}
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[9px] text-terminal-muted block tracking-widest">
                        ETAPA {step.number}
                      </span>
                      <span className={`text-xs font-bold transition-colors ${isSelected ? 'text-white' : 'text-terminal-muted group-hover:text-white'}`}>
                        {step.title}
                      </span>
                    </div>
                  </div>

                  {/* Checked indicator */}
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center text-neon-cyan">
                      <Check size={10} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Code & Description Viewer (Right) */}
          <div className="lg:col-span-7 bg-terminal-surface border border-terminal-border/80 rounded-xl overflow-hidden flex flex-col min-h-[350px] shadow-[0_15px_40px_-15px_rgba(0,0,0,0.8)]">
            
            {/* Window bar */}
            <div className="bg-[#12161f] border-b border-terminal-border px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                <span className="font-mono text-[9px] text-terminal-muted uppercase tracking-widest ml-3">
                  STÁGIO_{steps[activeStep].number} // {steps[activeStep].title.toUpperCase().replace(/ /g, '_')}
                </span>
              </div>
              <div className="font-mono text-[9px] text-neon-cyan border border-neon-cyan/20 bg-neon-cyan/5 rounded px-2 py-0.5">
                VERIFICADO
              </div>
            </div>

            {/* Content body */}
            <div className="p-6 flex-1 flex flex-col gap-5 justify-between">
              <div className="space-y-2">
                <h4 className="font-mono text-sm font-bold text-white">
                  {steps[activeStep].title}
                </h4>
                <p className="font-sans text-xs text-terminal-muted leading-relaxed">
                  {steps[activeStep].description}
                </p>
              </div>

              {/* Faux Editor Terminal */}
              <div className="relative bg-[#080b0f] border border-terminal-border/50 rounded-lg p-4 font-mono text-[11px] leading-relaxed overflow-x-auto select-all text-terminal-muted whitespace-pre">
                {steps[activeStep].codeSnippet}
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
