"use client";

import React from 'react';
import Sidebar from "@/components/Sidebar";
import {
    FileCheck, Plus, TrendingUp, BarChart3, CheckCircle2,
    FileText, MessageCircle, Link as LinkIcon,
    AlertCircle, Eye, Activity, Send
} from 'lucide-react';

export default function ProposalsDashboardPage() {
    // Mock Data for the Table
    const proposals = [
        {
            id: "PROP-0104",
            title: "Implantação ERP - Rede Alfa",
            client: "João da Silva",
            phone: "51 98474-3957",
            value: "R$ 12.500,00",
            condition: "3x de R$ 4.166,66 (Boleto)",
            status: "VISUALIZADA", // RASCUNHO, ENVIADA, VISUALIZADA, APROVADA, RECUSADA
            date: "Hoje, 10:45"
        },
        {
            id: "PROP-0103",
            title: "Licença Anual - Gama S/A",
            client: "Maria Souza",
            phone: "11 99999-8888",
            value: "R$ 8.900,00",
            condition: "Mensalidade R$ 290,00",
            status: "APROVADA",
            date: "Ontem, 16:20"
        },
        {
            id: "PROP-0102",
            title: "Consultoria Financeira",
            client: "Carlos Beta",
            phone: "41 97777-6666",
            value: "R$ 3.000,00",
            condition: "1x Pix (5% desc)",
            status: "ENVIADA",
            date: "11/09, 09:15"
        },
        {
            id: "PROP-0101",
            title: "Auditoria Contábil 2025",
            client: "Empresa Delta",
            phone: "51 95555-4444",
            value: "R$ 18.000,00",
            condition: "12x R$ 1.500,00",
            status: "RASCUNHO",
            date: "10/09, 14:00"
        }
    ];

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'RASCUNHO': return { bg: 'bg-[#8b949e]/10', border: 'border-[#8b949e]/30', text: 'text-[#8b949e]', icon: <FileText size={12} /> };
            case 'ENVIADA': return { bg: 'bg-[#3b82f6]/10', border: 'border-[#3b82f6]/30', text: 'text-[#3b82f6]', icon: <Send size={12} /> };
            case 'VISUALIZADA': return { bg: 'bg-[#bc13fe]/10', border: 'border-[#bc13fe]/30', text: 'text-[#bc13fe]', icon: <Eye size={12} /> };
            case 'APROVADA': return { bg: 'bg-[#39ff14]/10', border: 'border-[#39ff14]/30', text: 'text-[#39ff14]', icon: <CheckCircle2 size={12} /> };
            case 'RECUSADA': return { bg: 'bg-[#ef4444]/10', border: 'border-[#ef4444]/30', text: 'text-[#ef4444]', icon: <AlertCircle size={12} /> };
            default: return { bg: 'bg-gray-500/10', border: 'border-gray-500/30', text: 'text-gray-500', icon: <FileText size={12} /> };
        }
    };

    return (
        <div className="flex h-screen bg-[#06080A] text-[#e6edf3] font-mono selection:bg-[#00fff5]/30 overflow-hidden relative">
            <Sidebar />

            <main className="flex-1 flex flex-col p-6 lg:p-10 relative bg-[#030406] shadow-[-10px_0_30px_rgba(0,0,0,0.5)] z-10 w-full overflow-y-auto custom-scrollbar">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 border-b border-[#1a1f26]/50 pb-6 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#bc13fe]/10 border border-[#bc13fe]/30 rounded-xl flex items-center justify-center">
                            <FileCheck className="text-[#bc13fe]" size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-wide uppercase">Propostas & Orçamentos</h1>
                            <p className="text-[#8b949e] text-sm mt-1 flex items-center gap-2">
                                <Activity size={12} className="text-[#39ff14]" />
                                Motor de Aceleração B2B
                            </p>
                        </div>
                    </div>

                    <button className="flex items-center gap-2 bg-[#bc13fe] hover:bg-[#a00de0] text-white px-5 py-2.5 rounded-lg text-sm font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(188,19,254,0.4)] transition-all shrink-0">
                        <Plus size={16} /> Nova Proposta
                    </button>
                </div>

                {/* Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 relative z-10">
                    <div className="bg-[#0A0D12] border border-[#1a1f26] flex flex-col p-5 rounded-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <TrendingUp size={48} className="text-[#f59e0b]" />
                        </div>
                        <span className="text-[#8b949e] text-xs font-bold uppercase tracking-wider mb-1">Total em Propostas Abertas</span>
                        <div className="flex items-end gap-2 mt-auto pt-4">
                            <span className="text-[#f59e0b] text-sm">R$</span>
                            <span className="text-3xl font-bold text-white">48.900,00</span>
                        </div>
                        <div className="w-full bg-[#1a1f26] h-1 mt-4 rounded-full overflow-hidden">
                            <div className="bg-[#f59e0b] h-full w-[60%]"></div>
                        </div>
                    </div>

                    <div className="bg-[#0A0D12] border border-[#1a1f26] flex flex-col p-5 rounded-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <BarChart3 size={48} className="text-[#00fff5]" />
                        </div>
                        <span className="text-[#8b949e] text-xs font-bold uppercase tracking-wider mb-1">Taxa de Aprovação</span>
                        <div className="flex items-end gap-2 mt-auto pt-4">
                            <span className="text-3xl font-bold text-white">68<span className="text-[#00fff5] text-xl">%</span></span>
                            <span className="text-xs text-[#39ff14] mb-1 flex items-center">▲ +12% vs Mês Ant.</span>
                        </div>
                        <div className="w-full bg-[#1a1f26] h-1 mt-4 rounded-full overflow-hidden">
                            <div className="bg-[#00fff5] h-full w-[68%]"></div>
                        </div>
                    </div>

                    <div className="bg-[#0A0D12] border border-[#1a1f26] flex flex-col p-5 rounded-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <CheckCircle2 size={48} className="text-[#39ff14]" />
                        </div>
                        <span className="text-[#8b949e] text-xs font-bold uppercase tracking-wider mb-1">Aprovadas no Mês (Win)</span>
                        <div className="flex items-end gap-2 mt-auto pt-4">
                            <span className="text-[#39ff14] text-sm">R$</span>
                            <span className="text-3xl font-bold text-white">32.400,00</span>
                        </div>
                        <div className="w-full bg-[#1a1f26] h-1 mt-4 rounded-full overflow-hidden">
                            <div className="bg-[#39ff14] h-full w-[85%] shadow-[0_0_10px_rgba(57,255,20,0.5)]"></div>
                        </div>
                    </div>
                </div>

                {/* Proposals Table */}
                <div className="bg-[#0A0D12] border border-[#1a1f26] rounded-xl overflow-hidden relative z-10 shadow-lg flex-1 flex flex-col min-h-[400px]">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#06080A] border-b border-[#1a1f26]">
                                    <th className="p-4 text-xs font-bold text-[#8b949e] uppercase tracking-wider">Nº / Título</th>
                                    <th className="p-4 text-xs font-bold text-[#8b949e] uppercase tracking-wider">Cliente / Contato</th>
                                    <th className="p-4 text-xs font-bold text-[#8b949e] uppercase tracking-wider">Valor Total</th>
                                    <th className="p-4 text-xs font-bold text-[#8b949e] uppercase tracking-wider">Ciclo / Status</th>
                                    <th className="p-4 text-xs font-bold text-[#8b949e] uppercase tracking-wider text-right">Ações Rápidas</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1a1f26]/50">
                                {proposals.map((prop) => {
                                    const style = getStatusStyle(prop.status);

                                    return (
                                        <tr key={prop.id} className="hover:bg-[#1a1f26]/30 transition-colors group">
                                            <td className="p-4 align-top">
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-[#bc13fe] font-bold mb-0.5">{prop.id}</span>
                                                    <span className="text-sm font-semibold text-white">{prop.title}</span>
                                                    <span className="text-[10px] text-[#6e7681] mt-1">{prop.date}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 align-top">
                                                <div className="flex flex-col">
                                                    <span className="text-sm text-[#e6edf3] font-medium">{prop.client}</span>
                                                    <span className="text-xs text-[#8b949e] mt-1 break-words">{prop.phone}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 align-top">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-[#39ff14]">{prop.value}</span>
                                                    <span className="text-[10px] text-[#8b949e] mt-1 bg-[#1a1f26] inline-block px-1.5 py-0.5 rounded w-max">{prop.condition}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 align-top">
                                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border ${style.bg} ${style.border} ${style.text} text-[10px] font-bold uppercase tracking-wider`}>
                                                    {style.icon}
                                                    {prop.status}
                                                </div>
                                            </td>
                                            <td className="p-4 align-top text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                    <button className="w-8 h-8 flex items-center justify-center bg-[#1a1f26] hover:bg-[#3b82f6]/20 hover:text-[#3b82f6] hover:border-[#3b82f6]/50 border border-transparent rounded transition-all text-[#8b949e]" title="Ver PDF Timbrado">
                                                        <FileText size={14} />
                                                    </button>
                                                    <button className="w-8 h-8 flex items-center justify-center bg-[#1a1f26] hover:bg-[#39ff14]/20 hover:text-[#39ff14] hover:border-[#39ff14]/50 border border-transparent rounded transition-all text-[#8b949e]" title="Disparar no WhatsApp (Baileys)">
                                                        <MessageCircle size={14} />
                                                    </button>
                                                    <button className="w-8 h-8 flex items-center justify-center bg-[#1a1f26] hover:bg-[#bc13fe]/20 hover:text-[#bc13fe] hover:border-[#bc13fe]/50 border border-transparent rounded transition-all text-[#8b949e]" title="Copiar Link Público">
                                                        <LinkIcon size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Sub-Decor */}
                <div className="absolute bottom-0 left-[20%] w-[600px] h-[600px] bg-[#bc13fe]/5 rounded-full blur-[150px] pointer-events-none" />
            </main>
        </div>
    );
}
