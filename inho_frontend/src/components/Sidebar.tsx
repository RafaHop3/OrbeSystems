'use client';
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Users, ShoppingCart, Monitor, Bell, FileText, Shield, User, LogOut, BarChart2, Building, Columns, MessageCircle, FileCheck, ListTodo, LineChart } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import OrbeLogo from './OrbeLogo';

export default function Sidebar() {
    const [isOrgOpen, setIsOrgOpen] = useState(true);
    const [isCrmOpen, setIsCrmOpen] = useState(true);
    const [isRecOpen, setIsRecOpen] = useState(true);
    const pathname = usePathname();

    return (
        <aside className="w-[280px] min-h-screen bg-[#020406] border-r border-[#1a1f26] text-[#b3b9c5] font-sans select-none flex flex-col relative z-20 overflow-y-auto">

            {/* Brand Logo & Status */}
            <div className="px-6 py-6 flex items-center justify-between pointer-events-none sticky top-0 bg-[#020406]/90 backdrop-blur-sm z-30">
                <div className="flex items-center gap-3">
                    <OrbeLogo className="w-8 h-8 shrink-0" />
                    <span className="text-white font-bold text-[18px] tracking-[0.2em] font-mono">ORBE</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-[#39ff14] rounded-full shadow-[0_0_8px_rgba(57,255,20,0.8)] animate-pulse" />
                    <span className="text-[10px] font-mono text-[#00fff5] uppercase">Online</span>
                </div>
            </div>

            <nav className="flex-1 px-4 space-y-6 overflow-y-auto custom-scrollbar mt-4 pb-10">

                {/* Top Buttons */}
                <div className="space-y-3">
                    <Link href="/" className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border ${pathname === '/' ? 'border-teal-500/50 bg-[#0A1820] text-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.15)]' : 'border-transparent text-[#6e7681] hover:bg-[#1a1f26]'}`}>
                        <BarChart2 size={18} />
                        <span className="text-sm font-semibold tracking-wide">HUB DE NEGÓCIOS</span>
                    </Link>

                    <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-transparent text-[#6e7681] hover:bg-[#1a1f26] transition-colors cursor-not-allowed opacity-70">
                        <BarChart2 size={18} />
                        <span className="text-sm font-semibold tracking-wide">PAINEL COMERCIAL</span>
                    </button>
                </div>

                {/* VENDAS & CRM */}
                <div>
                    <div
                        onClick={() => setIsCrmOpen(!isCrmOpen)}
                        className="flex items-center justify-between px-2 cursor-pointer mb-3 group"
                    >
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full border border-[#00fff5] shadow-[0_0_8px_rgba(0,255,245,0.8)]" />
                            <span className="text-[11px] font-mono tracking-widest uppercase text-[#b3b9c5] group-hover:text-[#00fff5] transition-colors">VENDAS & CRM</span>
                        </div>
                        {isCrmOpen ? <ChevronUp size={14} className="text-[#00fff5]" /> : <ChevronDown size={14} className="text-gray-500" />}
                    </div>

                    <div className={`space-y-1 transition-all duration-300 ease-in-out pl-4 ${isCrmOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                        {[
                            { label: 'Funil de Negócios (Kanban)', icon: Columns, href: '/vendas/funil' },
                            { label: 'Central WhatsApp (Inbox)', icon: MessageCircle, href: '/vendas/whatsapp' },
                            { label: 'Propostas & Orçamentos', icon: FileCheck, href: '/vendas/propostas' },
                            { label: 'Minhas Tarefas (Follow-ups)', icon: ListTodo, href: '/vendas/tarefas' },
                        ].map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${isActive
                                        ? 'bg-[#1a1f26] text-white border-l-2 border-[#00fff5]'
                                        : 'text-[#8b949e] hover:bg-[#12161c] hover:text-[#c9d1d9]'
                                        }`}
                                >
                                    <Icon size={16} className={isActive ? 'text-[#00fff5]' : 'text-[#6e7681]'} />
                                    <span className="text-[13px] font-medium leading-tight">{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* ORGANIZAÇÃO Accordion */}
                <div className="pt-3 border-t border-[#1a1f26]/50 mt-4">
                    <div
                        onClick={() => setIsOrgOpen(!isOrgOpen)}
                        className="flex items-center justify-between px-2 cursor-pointer mb-3 group"
                    >
                        <div className="flex items-center gap-2">
                            <div className="w-1 h-3 bg-[#bc13fe] rounded-full shadow-[0_0_8px_rgba(188,19,254,0.6)]" />
                            <span className="text-[11px] font-mono font-bold text-[#bc13fe] uppercase tracking-widest">ORGANIZAÇÃO</span>
                        </div>
                        {isOrgOpen ? <ChevronUp size={14} className="text-[#bc13fe]" /> : <ChevronDown size={14} className="text-gray-500" />}
                    </div>

                    <div className={`space-y-1 transition-all duration-300 ease-in-out pl-4 ${isOrgOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                        {[
                            { label: 'Contatos', icon: Users, href: '/contatos' },
                            { label: 'Pedidos & Frente de Caixa', icon: ShoppingCart, href: '/pdv' },
                            { label: 'Cobranças & Régua Automática', icon: Bell, href: '/cobrancas' },
                            { label: 'Contas a Pagar', icon: FileText, href: '/pagar' },
                            { label: 'Contratos Recorrentes', icon: Shield, href: '/contratos' },
                        ].map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${isActive
                                        ? 'bg-[#1a1f26] text-white border-l-2 border-[#bc13fe]'
                                        : 'text-[#8b949e] hover:bg-[#12161c] hover:text-[#c9d1d9]'
                                        }`}
                                >
                                    <Icon size={16} className={isActive ? 'text-[#bc13fe]' : 'text-[#6e7681]'} />
                                    <span className="text-[13px] font-medium leading-tight">{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* INTELIGÊNCIA & CONFIGURAÇÕES */}
                <div className="pt-3 border-t border-[#1a1f26]/50 mt-4">
                    <div
                        onClick={() => setIsRecOpen(!isRecOpen)}
                        className="flex items-center justify-between px-2 cursor-pointer mb-3 group"
                    >
                        <div className="flex items-center gap-2">
                            <div className="w-1 h-3 bg-[#0066ff] rounded-full shadow-[0_0_8px_rgba(0,102,255,0.6)]" />
                            <span className="text-[11px] font-mono font-bold text-[#0066ff] uppercase tracking-widest">INTELIGÊNCIA & CONFIG.</span>
                        </div>
                        {isRecOpen ? <ChevronUp size={14} className="text-[#0066ff]" /> : <ChevronDown size={14} className="text-gray-500" />}
                    </div>

                    <div className={`space-y-1 transition-all duration-300 ease-in-out pl-4 ${isRecOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                        <Link href="/inteligencia/dre" className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${pathname === '/inteligencia/dre' ? 'bg-[#1a1f26] text-white border-l-2 border-[#0066ff]' : 'text-[#8b949e] hover:bg-[#12161c] hover:text-[#c9d1d9]'}`}>
                            <LineChart size={16} className={pathname === '/inteligencia/dre' ? 'text-[#0066ff]' : 'text-[#6e7681]'} />
                            <span className="text-[13px] font-medium leading-tight">DRE & Balanço</span>
                        </Link>
                        <Link href="/configuracoes/negocio" className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${pathname === '/configuracoes/negocio' ? 'bg-[#1a1f26] text-white border-l-2 border-[#0066ff]' : 'text-[#8b949e] hover:bg-[#12161c] hover:text-[#c9d1d9]'}`}>
                            <Building size={16} className={pathname === '/configuracoes/negocio' ? 'text-[#0066ff]' : 'text-[#6e7681]'} />
                            <span className="text-[13px] font-medium leading-tight">Minha Empresa / Negócio</span>
                        </Link>
                        <Link href="/configuracoes/equipe" className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${pathname === '/configuracoes/equipe' ? 'bg-[#1a1f26] text-white border-l-2 border-[#0066ff]' : 'text-[#8b949e] hover:bg-[#12161c] hover:text-[#c9d1d9]'}`}>
                            <Users size={16} className={pathname === '/configuracoes/equipe' ? 'text-[#0066ff]' : 'text-[#6e7681]'} />
                            <span className="text-[13px] font-medium leading-tight">Configurações de Equipe</span>
                        </Link>
                    </div>
                </div>

            </nav>

            {/* Footer Profile */}
            <div className="p-4 mt-auto border-t border-[#1a1f26] bg-[#06080A]">
                <div className="flex items-center gap-3 px-2 py-2">
                    <div className="w-10 h-10 rounded-md bg-[#0A1820] border border-teal-500/30 flex items-center justify-center">
                        <User size={18} className="text-teal-400" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold text-white">Administrador INHO</span>
                        <span className="text-[9px] font-bold text-green-500 uppercase border border-green-500/30 bg-green-500/10 rounded px-1.5 py-0.5 w-max mt-1">Operador</span>
                    </div>
                </div>
                <button className="mt-3 w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-[#6e7681] hover:text-red-400 hover:bg-[#1a1f26] rounded-md transition-colors">
                    <LogOut size={12} />
                    [→ SAIR DA CONTA]
                </button>
            </div>
        </aside>
    );
}
