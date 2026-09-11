'use client';
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Users, ShoppingCart, Monitor, Bell, FileText, Shield, User, LogOut, BarChart2 } from 'lucide-react';
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

                {/* CRM & ENTIDADES Accordion (Legacy Combined) */}
                <div>
                    <div
                        onClick={() => setIsCrmOpen(!isCrmOpen)}
                        className="flex items-center justify-between px-2 cursor-pointer mb-3 group"
                    >
                        <div className="flex items-center gap-2">
                            <Users size={14} className="text-[#00fff5]" />
                            <span className="text-[11px] font-mono tracking-widest uppercase text-[#b3b9c5] group-hover:text-[#00fff5] transition-colors">CRM & ENTIDADES</span>
                        </div>
                        {isCrmOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-500" />}
                    </div>

                    <div className={`space-y-1 transition-all duration-300 ease-in-out pl-6 ${isCrmOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                        {[
                            { label: 'CLIENTES', href: '/clientes' },
                            { label: 'FORNECEDORES', href: '/fornecedores' },
                            { label: 'FUNCIONÁRIOS', href: '/funcionarios' },
                            { label: 'SÓCIOS', href: '/socios' },
                        ].map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link key={item.href} href={item.href} className={`block px-4 py-2 text-[13px] rounded transition-colors ${isActive ? 'bg-[#1a1f26] text-white font-medium' : 'text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#12161c]'}`}>
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* RECEBIMENTOS Accordion (Legacy Combined) */}
                <div>
                    <div
                        onClick={() => setIsRecOpen(!isRecOpen)}
                        className="flex items-center justify-between px-2 cursor-pointer mb-3 group"
                    >
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full border-2 border-[#39ff14] flex items-center justify-center shadow-[0_0_8px_rgba(57,255,20,0.4)]">
                                <div className="w-1 h-1 bg-[#39ff14] rounded-full" />
                            </div>
                            <span className="text-[11px] font-mono tracking-widest uppercase text-[#b3b9c5] group-hover:text-[#39ff14] transition-colors">RECEBIMENTOS</span>
                        </div>
                        {isRecOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-500" />}
                    </div>

                    <div className={`space-y-1 transition-all duration-300 ease-in-out pl-6 ${isRecOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                        {[
                            { label: 'Receber', href: '/receber' },
                            { label: 'Agendar', href: '/agendamentos' },
                            { label: 'Boletos', href: '/boletos' },
                            { label: 'NFS-e', href: '/nfse' },
                        ].map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link key={item.href} href={item.href} className={`block px-4 py-2 text-[13px] rounded transition-colors ${isActive ? 'bg-[#1a1f26] text-white font-medium' : 'text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#12161c]'}`}>
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* ORGANIZAÇÃO Accordion (New Hub Layout) */}
                <div className="pt-2 border-t border-[#1a1f26]/50">
                    <div
                        onClick={() => setIsOrgOpen(!isOrgOpen)}
                        className="flex items-center justify-between px-2 cursor-pointer mb-3 group mt-4"
                    >
                        <div className="flex items-center gap-2">
                            <div className="w-1 h-3 bg-[#bc13fe] rounded-full shadow-[0_0_8px_rgba(188,19,254,0.6)]" />
                            <span className="text-[11px] font-mono font-bold text-[#bc13fe] uppercase tracking-widest">ORGANIZAÇÃO</span>
                        </div>
                        {isOrgOpen ? <ChevronUp size={14} className="text-purple-400" /> : <ChevronDown size={14} className="text-gray-500" />}
                    </div>

                    <div className={`space-y-1 transition-all duration-300 ease-in-out pl-2 ${isOrgOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                        {[
                            { label: 'GESTÃO DE CONTATOS', icon: Users, href: '/contatos' },
                            { label: 'PEDIDOS DE VENDA', icon: ShoppingCart, href: '/pedidos' },
                            { label: 'FRENTE DE CAIXA (PDV)', icon: Monitor, href: '/pdv' },
                            { label: 'COBRANÇAS E AVISOS', icon: Bell, href: '/cobrancas' },
                            { label: 'CONTAS A PAGAR', icon: FileText, href: '/pagar' },
                            { label: 'ASSIST. E CONTRATOS', icon: Shield, href: '/contratos' },
                        ].map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-4 px-4 py-2.5 rounded-md transition-colors ${isActive
                                        ? 'bg-[#1a1f26] text-white border-l-2 border-teal-500'
                                        : 'text-[#8b949e] hover:bg-[#12161c] hover:text-[#c9d1d9]'
                                        }`}
                                >
                                    <Icon size={16} className={isActive ? 'text-teal-400' : 'text-[#6e7681]'} />
                                    <span className="text-[13px] font-medium leading-tight max-w-[150px]">{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* SISTEMA Accordion */}
                <div className="pt-2 border-t border-[#1a1f26]/50">
                    <div
                        className="flex items-center justify-between px-2 cursor-pointer mb-3 group mt-4"
                    >
                        <div className="flex items-center gap-2">
                            <div className="w-1 h-3 bg-[#0066ff] rounded-full shadow-[0_0_8px_rgba(0,102,255,0.6)]" />
                            <span className="text-[11px] font-mono font-bold text-[#0066ff] uppercase tracking-widest">SISTEMA</span>
                        </div>
                    </div>

                    <div className="space-y-1 pl-2">
                        <Link href="/configuracoes/equipe" className={`flex items-center gap-4 px-4 py-2.5 rounded-md transition-colors ${pathname === '/configuracoes/equipe' ? 'bg-[#1a1f26] text-white border-l-2 border-[#00fff5]' : 'text-[#8b949e] hover:bg-[#12161c] hover:text-[#c9d1d9]'}`}>
                            <Users size={16} className={pathname === '/configuracoes/equipe' ? 'text-[#00fff5]' : 'text-[#6e7681]'} />
                            <span className="text-[12px] uppercase tracking-wide font-medium leading-tight">CONFIG. GLOBAIS (EQUIPE)</span>
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
