"use client";

import React, { useState } from 'react';
import Sidebar from "@/components/Sidebar";
import {
    Search, MessageSquare, Phone, Send, Zap,
    FileText, Clock, UserCheck, CheckCircle2,
    MoreVertical, Wallet, AlertCircle, Plus
} from 'lucide-react';

export default function WhatsAppCentralPage() {
    const [messageInput, setMessageInput] = useState("");

    return (
        <div className="flex h-screen bg-[#06080A] text-[#e6edf3] font-mono selection:bg-[#00fff5]/30 overflow-hidden relative">
            <Sidebar />

            <main className="flex-1 flex flex-col p-6 relative bg-[#030406] shadow-[-10px_0_30px_rgba(0,0,0,0.5)] z-10 w-full overflow-hidden">
                <div className="flex items-center justify-between mb-4 border-b border-[#1a1f26]/50 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#00fff5]/10 border border-[#00fff5]/30 rounded-lg flex items-center justify-center">
                            <MessageSquare className="text-[#00fff5]" size={20} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white tracking-wide uppercase">Central WhatsApp</h1>
                            <p className="text-[#8b949e] text-xs mt-0.5 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-[#39ff14] rounded-full animate-pulse"></span>
                                Conectado via Orbe Bot (Baileys)
                            </p>
                        </div>
                    </div>
                </div>

                {/* 3-Column Layout */}
                <div className="flex-1 flex gap-4 h-[calc(100vh-140px)]">

                    {/* COLUMN 1: CONVERSATIONS */}
                    <div className="w-80 flex flex-col bg-[#0A0D12] border border-[#1a1f26] rounded-xl overflow-hidden shadow-lg shrink-0">
                        <div className="p-4 border-b border-[#1a1f26]">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b949e]" />
                                <input
                                    type="text"
                                    placeholder="Buscar contato..."
                                    className="w-full bg-[#030406] border border-[#1a1f26] rounded-md py-2 pl-9 pr-3 text-xs text-white focus:border-[#00fff5] outline-none transition-colors"
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {/* Active Chat Item */}
                            <div className="flex items-center gap-3 p-4 border-l-2 border-[#00fff5] bg-[#1a1f26]/40 cursor-pointer hover:bg-[#1a1f26]/60 transition-colors">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#00fff5]/20 to-[#bc13fe]/20 border border-[#00fff5]/30 flex items-center justify-center shrink-0 object-cover overflow-hidden">
                                    <span className="text-xs font-bold text-[#00fff5]">OJ</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <h3 className="text-sm font-bold text-white truncate">Oficina do João</h3>
                                        <span className="text-[10px] text-[#00fff5]">14:11</span>
                                    </div>
                                    <p className="text-xs text-[#8b949e] truncate mt-1">Você: Fica R$ 290 fixos! Segue...</p>
                                </div>
                            </div>

                            {/* Inactive Chat Items */}
                            <div className="flex items-center gap-3 p-4 border-l-2 border-transparent cursor-pointer hover:bg-[#1a1f26]/40 transition-colors">
                                <div className="w-10 h-10 rounded-full bg-[#1a1f26] flex items-center justify-center shrink-0 text-[#8b949e]">MS</div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <h3 className="text-sm font-semibold text-[#8b949e] truncate">Maria Souza</h3>
                                        <span className="text-[10px] text-[#6e7681]">12:45</span>
                                    </div>
                                    <p className="text-xs text-[#6e7681] truncate mt-1">Recebido, obrigada!</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-4 border-l-2 border-transparent cursor-pointer hover:bg-[#1a1f26]/40 transition-colors">
                                <div className="w-10 h-10 rounded-full bg-[#1a1f26] flex items-center justify-center shrink-0 text-[#8b949e]">CB</div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <h3 className="text-sm font-semibold text-[#8b949e] truncate">Carlos Beta</h3>
                                        <span className="text-[10px] text-[#6e7681]">Ontem</span>
                                    </div>
                                    <p className="text-xs text-[#6e7681] truncate mt-1">Combinado para segunda.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* COLUMN 2: ACTIVE CHAT */}
                    <div className="flex-1 flex flex-col bg-[#0A0D12] border border-[#1a1f26] rounded-xl overflow-hidden shadow-lg">
                        {/* Chat Topbar */}
                        <div className="p-4 border-b border-[#1a1f26] flex items-center justify-between bg-[#06080A]">
                            <div className="flex items-center gap-4">
                                <div>
                                    <h2 className="text-base font-bold text-white">Oficina do João</h2>
                                    <span className="text-xs text-[#00fff5]">Online via Orbe Bot</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="p-2 text-[#8b949e] hover:bg-[#1a1f26] hover:text-white rounded-md transition-colors">
                                    <Phone size={16} />
                                </button>
                                <button className="p-2 text-[#8b949e] hover:bg-[#1a1f26] hover:text-white rounded-md transition-colors">
                                    <MoreVertical size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Chat Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-chat-pattern relative">
                            {/* Convert to Lead Banner (Example interaction) */}
                            <div className="flex justify-center mb-6">
                                <button className="flex items-center gap-2 bg-[#bc13fe]/10 border border-[#bc13fe]/30 hover:bg-[#bc13fe]/20 text-[#bc13fe] px-4 py-1.5 rounded-full text-xs font-bold transition-colors">
                                    <Plus size={14} /> Criar Lead no Funil
                                </button>
                            </div>

                            {/* Incoming Message */}
                            <div className="flex flex-col items-start gap-1">
                                <span className="text-[10px] text-[#6e7681] ml-1">João - 14:10</span>
                                <div className="bg-[#1a1f26] text-[#e6edf3] p-3 rounded-2xl rounded-tl-sm max-w-[70%] border border-[#1a1f26]/50 shadow-sm">
                                    <p className="text-sm leading-relaxed">Qual o valor da mensalidade?</p>
                                </div>
                            </div>

                            {/* Outgoing Message */}
                            <div className="flex flex-col items-end gap-1">
                                <span className="text-[10px] text-[#6e7681] mr-1">Atendente Lucas - 14:11</span>
                                <div className="bg-[#00fff5]/10 text-white p-3 rounded-2xl rounded-tr-sm max-w-[70%] border border-[#00fff5]/20 shadow-sm border-r-2 border-r-[#00fff5]">
                                    <p className="text-sm leading-relaxed">Fica R$ 290 fixos! Segue a nossa proposta e a chave Pix para garantir o setup inicial hoje.</p>
                                </div>
                            </div>
                        </div>

                        {/* Chat Input & Fast Actions */}
                        <div className="bg-[#06080A] border-t border-[#1a1f26] p-4 flex flex-col gap-3">
                            <div className="flex items-center gap-2">
                                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#39ff14]/10 hover:bg-[#39ff14]/20 text-[#39ff14] text-[10px] font-bold uppercase rounded-md border border-[#39ff14]/30 transition-colors">
                                    <Zap size={12} /> Chave Pix
                                </button>
                                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#bc13fe]/10 hover:bg-[#bc13fe]/20 text-[#bc13fe] text-[10px] font-bold uppercase rounded-md border border-[#bc13fe]/30 transition-colors">
                                    <FileText size={12} /> Link Proposta
                                </button>
                                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f59e0b]/10 hover:bg-[#f59e0b]/20 text-[#f59e0b] text-[10px] font-bold uppercase rounded-md border border-[#f59e0b]/30 transition-colors">
                                    <Clock size={12} /> Lembrete Régua
                                </button>
                            </div>
                            <div className="flex items-end gap-3">
                                <div className="flex-1 bg-[#030406] border border-[#1a1f26] rounded-xl overflow-hidden focus-within:border-[#00fff5]/50 transition-colors flex">
                                    <textarea
                                        value={messageInput}
                                        onChange={(e) => setMessageInput(e.target.value)}
                                        placeholder="Digite a mensagem..."
                                        className="w-full bg-transparent p-3 text-sm text-white resize-none outline-none overflow-hidden h-12 custom-scrollbar"
                                    />
                                </div>
                                <button className="h-12 w-12 flex items-center justify-center bg-[#00fff5] hover:bg-[#00e5dd] text-[#020406] rounded-xl transition-colors shadow-[0_0_15px_rgba(0,255,245,0.4)] shrink-0">
                                    <Send size={18} className="translate-x-0.5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* COLUMN 3: CRM PANEL */}
                    <div className="w-[300px] flex flex-col bg-[#0A0D12] border border-[#1a1f26] rounded-xl overflow-hidden shadow-lg shrink-0">
                        <div className="p-4 border-b border-[#1a1f26] bg-[#06080A]">
                            <h2 className="text-sm font-bold text-[#8b949e] uppercase tracking-widest flex items-center gap-2">
                                <UserCheck size={14} /> Ficha do Lead
                            </h2>
                        </div>
                        <div className="p-5 overflow-y-auto custom-scrollbar flex flex-col gap-6">
                            {/* Profile Details */}
                            <div className="flex flex-col items-center text-center">
                                <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-tr from-[#00fff5]/20 to-[#bc13fe]/20 border-2 border-[#1a1f26] flex items-center justify-center mb-3">
                                    <span className="text-xl font-bold text-white">OJ</span>
                                </div>
                                <h3 className="text-lg font-bold text-white">João da Silva</h3>
                                <p className="text-xs text-[#00fff5] mt-1 relative inline-flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-[#00fff5] rounded-full blur-[2px] absolute -left-3"></span>
                                    <span className="w-1.5 h-1.5 bg-[#00fff5] rounded-full"></span>
                                    Auto Peças Silva
                                </p>
                            </div>

                            <div className="w-full h-px bg-[#1a1f26]/50"></div>

                            {/* Funnel Info */}
                            <div className="flex flex-col gap-4">
                                <div>
                                    <span className="text-[10px] text-[#6e7681] uppercase block mb-1">Negócio no Funil</span>
                                    <div className="flex items-center gap-2 bg-[#1a1f26]/30 px-3 py-2 rounded-md border border-[#1a1f26]">
                                        <div className="w-2 h-2 rounded-full bg-[#f59e0b]"></div>
                                        <span className="text-xs font-semibold text-white">Em Negociação</span>
                                    </div>
                                </div>
                                <div>
                                    <span className="text-[10px] text-[#6e7681] uppercase block mb-1">Valor do Ticket</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-[#39ff14]">R$</span>
                                        <span className="text-lg font-bold text-white">3.500,00</span>
                                    </div>
                                </div>
                            </div>

                            <div className="w-full h-px bg-[#1a1f26]/50"></div>

                            {/* Financial Alerts */}
                            <div className="flex flex-col gap-3">
                                <div className="bg-emerald-900/10 border border-emerald-500/20 p-3 rounded-lg flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Wallet size={14} className="text-emerald-500" />
                                        <span className="text-xs font-medium text-emerald-400">Faturas Abertas</span>
                                    </div>
                                    <span className="text-xs font-bold text-white">0</span>
                                </div>

                                <div className="bg-amber-900/10 border border-amber-500/20 p-3 rounded-lg flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle size={14} className="text-amber-500" />
                                        <span className="text-xs font-medium text-amber-400">Data Limite</span>
                                    </div>
                                    <span className="text-xs font-bold text-white">15/Out</span>
                                </div>
                            </div>

                            {/* Core Action Buttons */}
                            <div className="flex flex-col gap-2 mt-2">
                                <button className="w-full bg-[#10b981]/10 hover:bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30 py-2.5 rounded-lg text-xs font-bold uppercase transition-colors flex items-center justify-center gap-2">
                                    <CheckCircle2 size={14} /> Mover para Fechado
                                </button>
                                <button className="w-full bg-[#bc13fe]/10 hover:bg-[#bc13fe]/20 text-[#bc13fe] border border-[#bc13fe]/30 py-2.5 rounded-lg text-xs font-bold uppercase transition-colors flex items-center justify-center gap-2">
                                    <FileText size={14} /> Enviar Proposta
                                </button>
                            </div>

                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}
