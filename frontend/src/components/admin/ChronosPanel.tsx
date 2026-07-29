'use client';

import { Clock, Lock, Network } from 'lucide-react';

export default function ChronosPanel() {
    const blocks = [
        { hash: '0x9fa...23b', event: 'Deploy Contrato Imobverse', time: '14:22:01', sign: 'Verificado' },
        { hash: '0x12c...89f', event: 'Pagamento Criptografado', time: '14:20:45', sign: 'Verificado' },
        { hash: '0xab4...001', event: 'Assinatura Zero-Trust', time: '14:15:33', sign: 'Verificado' },
    ];

    return (
        <div className="border border-yellow-500/20 bg-yellow-500/5 p-5 animate-in fade-in zoom-in duration-500">
            <h2 className="text-xs font-bold border-b border-yellow-500/10 pb-3 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2 text-yellow-500 uppercase tracking-widest">
                    <Clock size={14} /> CHRONOS (Guardião do Tempo)
                </div>
                <div className="flex items-center gap-2 text-[9px] text-yellow-500/60">
                    <Network size={12} /> Sync: CHAIN_LOCKED
                </div>
            </h2>

            <div className="space-y-4">
                <p className="text-[10px] text-neon-green/70 max-w-2xl">
                    Sistema de log imutável. Cada transação selada do Imobverse recebe a estampa de tempo criptográfica à prova de manipulação (Tamper-Proof).
                </p>

                <div className="w-full border border-yellow-500/20 bg-black/60 overflow-hidden">
                    <div className="grid grid-cols-4 border-b border-yellow-500/20 p-3 bg-yellow-500/10 text-[9px] text-yellow-500 font-bold uppercase tracking-widest">
                        <span>Timestamp</span>
                        <span className="col-span-2">Evento Vitalício</span>
                        <span className="text-right">Hash Crypt</span>
                    </div>

                    <div className="space-y-0 text-[10px] font-mono">
                        {blocks.map((b, i) => (
                            <div key={i} className="grid grid-cols-4 p-3 border-b border-yellow-500/10 hover:bg-yellow-500/5 transition-colors items-center text-yellow-500/80">
                                <div className="flex items-center gap-2">
                                    <Clock size={10} className="text-yellow-500/50" />
                                    {b.time}
                                </div>
                                <div className="col-span-2">{b.event}</div>
                                <div className="text-right flex justify-end items-center gap-2">
                                    <Lock size={10} className="text-green-500" />
                                    {b.hash}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <button className="text-[9px] border border-yellow-500/50 text-yellow-500 px-4 py-2 uppercase hover:bg-yellow-500 hover:text-black">
                        Exportar Cadeia Imutável
                    </button>
                </div>
            </div>
        </div>
    );
}
