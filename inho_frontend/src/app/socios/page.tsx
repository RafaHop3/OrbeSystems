'use client';
import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import ModalNovoSocio from '@/components/ModalNovoSocio';
import { Users, Plus, Search, Filter } from 'lucide-react';

export default function SociosModule() {
    const [showModal, setShowModal] = useState(false);

    return (
        <div className="flex h-screen bg-[#06080A] text-[#e6edf3] font-mono selection:bg-teal-500/30 overflow-hidden relative">
            <Sidebar />
            <main className="flex-1 flex flex-col p-10 lg:p-16 relative bg-[#030406] shadow-[-10px_0_30px_rgba(0,0,0,0.5)] z-10 w-full overflow-y-auto">

                {/* Module Header */}
                <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-[#0A1820] border border-teal-500/40 flex items-center justify-center shadow-[0_0_20px_rgba(20,184,166,0.15)]">
                            <Users className="text-teal-400" size={28} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white tracking-tight">Módulo Cooperativismo</h1>
                            <p className="text-[#8b949e] font-sans text-sm mt-1">Gestão da base associada B2B/B2C, liquidação de cotas e retenção fiscal.</p>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg font-semibold shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] transition-all hover:-translate-y-0.5"
                    >
                        <Plus size={18} /> Novo Sócio / Cooperado
                    </button>
                </div>

                {/* Filters Panel */}
                <div className="flex items-center gap-4 bg-[#0A0D12] border border-[#1a1f26] p-4 rounded-xl mb-6">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-3 text-[#6e7681]" size={18} />
                        <input type="text" placeholder="Buscar sócio por nome, CPF/CNPJ ou NIS..." className="w-full bg-[#12161c] border border-[#1a1f26] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500/50 transition-colors" />
                    </div>
                    <button className="flex items-center gap-2 bg-[#12161c] border border-[#1a1f26] text-[#b3b9c5] px-4 py-2.5 rounded-lg text-sm hover:bg-[#1a1f26] transition-colors">
                        <Filter size={16} /> Filtros
                    </button>
                </div>

                {/* Empty State Table Area */}
                <div className="flex-1 border border-[#1a1f26] rounded-xl bg-[#0A0D12] flex flex-col items-center justify-center">
                    <Users className="text-[#1a1f26] mb-4" size={64} />
                    <span className="text-[#b3b9c5] font-semibold text-lg">Base de Associados Vazia</span>
                    <span className="text-[#6e7681] text-sm mt-2 max-w-sm text-center">Utilize o botão 'Novo Sócio' acima para iniciar a submissão de entidades cooperadas para o Master DB.</span>
                </div>

            </main>

            {/* Dynamic Modal Binding */}
            {showModal && <ModalNovoSocio onClose={() => setShowModal(false)} />}
        </div>
    );
}
