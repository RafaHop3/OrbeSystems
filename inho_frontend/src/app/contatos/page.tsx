'use client';
import Sidebar from '@/components/Sidebar';
import { Users } from 'lucide-react';

export default function Contatos() {
    return (
        <div className="flex h-screen bg-[#06080A] text-[#e6edf3] font-mono selection:bg-teal-500/30 overflow-hidden relative">
            <Sidebar />
            <main className="flex-1 flex flex-col p-10 lg:p-16 relative bg-[#030406] shadow-[-10px_0_30px_rgba(0,0,0,0.5)] z-10 w-full">
                <div className="flex items-center gap-3 mb-6">
                    <Users className="text-teal-400" size={32} />
                    <h1 className="text-3xl font-bold text-white">Gestão de Contatos</h1>
                </div>
                <p className="text-[#8b949e]">Listagem unificada de Clientes, Fornecedores, Funcionários e Sócios corporativos.</p>
                <div className="mt-8 flex-1 border border-[#1a1f26] rounded-xl bg-[#0A0D12] flex items-center justify-center">
                    <span className="text-[#6e7681]">Estrutura CRM & Entidades vazia. Cadastre o primeiro sócio pelo Hub.</span>
                </div>
            </main>
        </div>
    );
}
