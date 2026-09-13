"use client";
import Sidebar from "@/components/Sidebar";

export default function PlaceholderPage() {
    return (
        <div className="flex h-screen bg-[#06080A] text-[#e6edf3] font-mono selection:bg-teal-500/30 overflow-hidden relative">
            <Sidebar />
            <main className="flex-1 flex flex-col p-10 lg:p-16 relative bg-[#030406] shadow-[-10px_0_30px_rgba(0,0,0,0.5)] z-10 w-full">
                <div className="flex items-center gap-3 mb-6">
                    <h1 className="text-3xl font-bold text-white tracking-wide uppercase">MÓDULO ERP</h1>
                </div>
                <p className="text-[#8b949e]">Parte do Mega-Layout Funcional do INHO está sendo orquestrada.</p>
                <div className="mt-8 flex-1 border border-[#1a1f26]/50 rounded-xl bg-[#0A0D12] flex flex-col items-center justify-center border-dashed">
                    <div className="w-12 h-12 rounded-full border-b-2 border-teal-500 animate-spin mb-4"></div>
                    <span className="text-[#6e7681] text-sm uppercase tracking-widest font-bold">Integrando Arquitetura...</span>
                </div>
            </main>
        </div>
    );
}
