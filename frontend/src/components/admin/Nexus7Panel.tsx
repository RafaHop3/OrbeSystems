'use client';

import { Activity, ServerCrash, Cpu } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Nexus7Panel() {
    const [prediction, setPrediction] = useState(99.99);

    useEffect(() => {
        const interval = setInterval(() => {
            setPrediction(prev => prev > 95 ? prev - (Math.random() * 0.1) : 99.99);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="border border-neon-cyan/20 bg-neon-cyan/5 p-5 animate-in fade-in zoom-in duration-500">
            <h2 className="text-xs font-bold border-b border-neon-cyan/10 pb-3 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2 text-neon-cyan uppercase tracking-widest">
                    <Activity size={14} /> NEXUS-7 (Telemetria Preditiva)
                </div>
                <span className="text-[10px] bg-neon-cyan/20 text-neon-cyan px-2 py-1 rounded border border-neon-cyan/30 animate-pulse">
                    ONLINE
                </span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <p className="text-[10px] text-neon-green/70">
                        Monitorando anomalias no coração das máquinas. O oráculo digital prevê falhas antes que ocorram.
                    </p>

                    <div className="p-4 border border-neon-cyan/20 bg-black">
                        <h3 className="text-[10px] text-neon-cyan/70 mb-2 uppercase">Probabilidade de Sobrevivência (Próximas 24h)</h3>
                        <div className="text-3xl font-bold text-neon-cyan flex items-end gap-2">
                            {prediction.toFixed(2)}%
                        </div>
                        <div className="w-full h-1 bg-neon-cyan/20 mt-2">
                            <div className="h-full bg-neon-cyan" style={{ width: `${prediction}%` }} />
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <h3 className="text-[10px] text-neon-cyan/70 uppercase">Últimas Previsões</h3>
                    {[
                        { id: 1, event: 'Pico de tráfego esperado', time: '+2h 15m', risk: 'Baixo', icon: Cpu },
                        { id: 2, event: 'Falha de disco secundário mitigada', time: '+5h 40m', risk: 'Médio', icon: ServerCrash },
                    ].map(p => (
                        <div key={p.id} className="flex items-center justify-between p-3 border border-neon-cyan/20 bg-black/40 text-[10px]">
                            <div className="flex items-center gap-3">
                                <p.icon size={12} className="text-neon-cyan" />
                                <span className="text-neon-cyan/80">{p.event}</span>
                            </div>
                            <div className="flex gap-4">
                                <span className="text-yellow-500">{p.time}</span>
                                <span className="text-neon-green">{p.risk}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
