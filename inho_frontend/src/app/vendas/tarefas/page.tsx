"use client";
import React from 'react';
import { Pickaxe } from 'lucide-react';
import Sidebar from '@/components/Sidebar';

export default function PlaceholderPage() {
    return (
        <div className="flex h-screen bg-[#06080A] overflow-hidden text-[#e6edf3] font-mono selection:bg-teal-500/30">
            <Sidebar />
            <main className="flex-1 flex flex-col bg-[#030406] w-full h-full p-10 lg:p-16 relative overflow-y-auto custom-scrollbar shadow-[-10px_0_30px_rgba(0,0,0,0.5)] z-10">
                <div className="absolute top-[-20%] left-[20%] w-[500px] h-[500px] bg-teal-900/10 rounded-full blur-[120px] pointer-events-none" />
                
                <div className="max-w-[1100px] w-full z-10 relative mt-4 h-full flex flex-col items-center justify-center border-2 border-dashed border-[#1a1f26] rounded-2xl opacity-60">
                    <Pickaxe className="w-16 h-16 text-teal-500/50 mb-6 animate-pulse" />
                    <h2 className="text-2xl font-bold text-white mb-2 tracking-widest text-center">
                        MÓDULO EM <span className="text-teal-400">DESENVOLVIMENTO</span>
                    </h2>
                    <p className="text-[#6e7681] text-sm text-center max-w-sm leading-relaxed">
                        Estamos preparando o encapsulamento desta ferramenta. Disponível em breve na malha de produção.
                    </p>
                </div>
            </main>
        </div>
    );
}
