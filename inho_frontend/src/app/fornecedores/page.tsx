'use client';
import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import ModalNovoSocio from '@/components/ModalNovoSocio';
import { Plus, Search, Truck } from 'lucide-react';

export default function FornecedoresPage() {
    const [showModal, setShowModal] = useState(false);

    return (
        <div className="flex h-screen bg-[#06080A] text-[#e6edf3] font-mono selection:bg-teal-500/30 overflow-hidden relative">
            <Sidebar />
            <main className="flex-1 flex flex-col h-full bg-[#030406] shadow-[-10px_0_30px_rgba(0,0,0,0.5)] z-10 relative overflow-hidden p-10 lg:p-16">

                <div className="absolute top-[-20%] left-[20%] w-[500px] h-[500px] bg-teal-900/10 rounded-full blur-[120px] pointer-events-none" />

                <div className="max-w-[1200px] w-full mx-auto z-10 relative flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                                <Truck className="text-teal-400" /> Homologação de Fornecedores
                            </h1>
                            <p className="text-[#8b949e] font-mono text-sm max-w-2xl leading-relaxed">
                                Gestão da cadeia de suprimentos e registro fiscal de parceiros PJ/PF para aprovação de contas a pagar.
                            </p>
                        </div>
                        <button
                            onClick={() => setShowModal(true)}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 px-5 rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.3)] transition-all flex items-center gap-2"
                        >
                            <Plus size={18} />
                            Novo Fornecedor
                        </button>
                    </div>

                    <div className="bg-[#0A1820]/50 border border-teal-500/20 rounded-xl flex-1 flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-teal-500/20 flex gap-4">
                            <div className="flex-1 relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                <input type="text" placeholder="Buscar por Razão Social, CNPJ ou Nome Fantasia..." className="w-full bg-[#12222A] border border-teal-500/30 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-teal-400 text-white" />
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-60">
                            <Truck size={48} className="text-[#1a2f3a] mb-4" />
                            <p className="text-lg font-semibold text-white mb-1">Nenhum fornecedor registrado</p>
                            <p className="text-[#8b949e] text-sm">As entidades fornecedoras são necessárias para cadastrar Contas a Pagar (AP).</p>
                        </div>
                    </div>
                </div>
            </main>

            {showModal && <ModalNovoSocio onClose={() => setShowModal(false)} category="SUPPLIER" />}
        </div>
    );
}
