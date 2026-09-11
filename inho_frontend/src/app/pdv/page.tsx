'use client';
import Sidebar from '@/components/Sidebar';
import { Monitor } from 'lucide-react';

export default function PDV() {
    return (
        <div className="flex h-screen bg-[#06080A] text-[#e6edf3] font-mono selection:bg-teal-500/30 overflow-hidden relative">
            <Sidebar />
            <main className="flex-1 flex flex-col p-10 lg:p-16 relative bg-[#030406] shadow-[-10px_0_30px_rgba(0,0,0,0.5)] z-10 w-full">
                <div className="flex items-center gap-3 mb-6">
                    <Monitor className="text-teal-400" size={32} />
                    <h1 className="text-3xl font-bold text-white">Frente de Caixa (PDV)</h1>
                </div>
                <div className="mt-8 flex-1 border border-[#1a1f26] rounded-xl bg-[#0A0D12] flex items-center justify-center flex-col">
                    <span className="text-[#6e7681]">Terminal Frontend Locking...</span>
                    <span className="text-teal-400 text-sm mt-3 animate-pulse">Iniciando sessão do Operador PDV Local</span>
                </div>
            </main>
        </div>
    );
}
