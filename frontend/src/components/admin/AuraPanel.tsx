'use client';

import { BrainCircuit, ScanSearch, CheckCircle2 } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function AuraPanel() {
    const [scanning, setScanning] = useState(false);
    const [progress, setProgress] = useState(0);

    const startScan = () => {
        setScanning(true);
        setProgress(0);
        const interval = setInterval(() => {
            setProgress(p => {
                if (p >= 100) {
                    clearInterval(interval);
                    setScanning(false);
                    return 100;
                }
                return p + 10;
            });
        }, 500);
    };

    return (
        <div className="border border-neon-blue/20 bg-neon-blue/5 p-5 animate-in fade-in zoom-in duration-500">
            <h2 className="text-xs font-bold border-b border-neon-blue/10 pb-3 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2 text-neon-blue uppercase tracking-widest">
                    <BrainCircuit size={14} /> AURA (Automated Risk Auditor)
                </div>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <p className="text-[10px] text-neon-green/70">
                        Escaneamento cognitivo de repositórios. O próximo passo do SAST: transformando dados em formato visual 3D cibernético.
                    </p>

                    <button
                        onClick={startScan}
                        disabled={scanning}
                        className="w-full py-3 border border-neon-blue text-neon-blue uppercase tracking-widest text-xs font-bold hover:bg-neon-blue hover:text-black transition-all disabled:opacity-50"
                    >
                        {scanning ? 'Mapeando Repositórios...' : 'Iniciar Varredura SAST 3D'}
                    </button>

                    {scanning && (
                        <div className="space-y-1">
                            <div className="flex justify-between text-[9px] text-neon-blue/70">
                                <span>Construindo Matriz Neuronal</span>
                                <span>{progress}%</span>
                            </div>
                            <div className="w-full h-0.5 bg-neon-blue/20">
                                <div className="h-full bg-neon-blue transition-all duration-300" style={{ width: `${progress}%` }} />
                            </div>
                        </div>
                    )}
                </div>

                <div className="border border-neon-blue/20 bg-black p-4 flex flex-col items-center justify-center relative overflow-hidden min-h-[150px]">
                    {/* Faux 3D visual */}
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neon-blue/10 to-transparent" />

                    <div className="relative z-10 flex flex-col items-center text-center space-y-2">
                        {progress === 100 ? (
                            <>
                                <CheckCircle2 size={32} className="text-neon-green animate-bounce" />
                                <span className="text-[10px] text-neon-green font-bold tracking-widest">MATRIZ 100% SEGURA</span>
                            </>
                        ) : scanning ? (
                            <>
                                <ScanSearch size={32} className="text-neon-blue animate-pulse" />
                                <span className="text-[10px] text-neon-blue/70 tracking-widest animate-pulse">RENDERIZANDO NÓS ESTRUTURAIS...</span>
                            </>
                        ) : (
                            <span className="text-[10px] text-neon-blue/40 italic">Aguardando inserção de código...</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
