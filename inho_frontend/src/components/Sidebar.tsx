"use client";
import React, { useState } from 'react';
import {
    User, Users, Briefcase, Shield,
    ArrowDownLeft, CalendarCheck, Barcode, FileText,
    ArrowUpRight, CalendarClock, Inbox, Wallet, LineChart,
    Clock, Archive, Gavel, Columns, MessageCircle,
    FileCheck, ListTodo, LogOut, LayoutDashboard, Settings,
    ChevronDown, ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import OrbeLogo from './OrbeLogo';
import NavigationControls from './NavigationControls';

export default function Sidebar() {
    const pathname = usePathname();

    // State to handle collapsible sections
    const [expanded, setExpanded] = useState<Record<string, boolean>>({
        comercial: true,
        entidades: true,
        financeiro: true,
        inteligencia: true
    });

    const toggleSection = (section: string) => {
        setExpanded(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const renderHeader = (id: string, title: string, color: string, subtitle: string = "") => {
        const isExp = expanded[id];
        return (
            <button
                onClick={() => toggleSection(id)}
                className="w-full text-left pt-4 border-t border-[#1a1f26]/50 mt-4 px-2 mb-2 flex items-center justify-between group hover:bg-[#12161c] rounded-md transition-colors"
                style={{ cursor: "pointer" }}
            >
                <div className="flex flex-col gap-1 w-full p-1">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-widest transition-colors" style={{ color }}>{title}</span>
                    {subtitle && <span className="text-[9px] text-[#6e7681] uppercase tracking-wider">{subtitle}</span>}
                </div>
                <div className="pr-2 opacity-50 group-hover:opacity-100 transition-opacity">
                    {isExp ? <ChevronDown size={14} color={color} /> : <ChevronRight size={14} color={color} />}
                </div>
            </button>
        );
    };

    const renderLink = (label: string, href: string, Icon: React.ElementType, color: string, indent: boolean = false) => {
        const isActive = pathname === href;
        return (
            <Link key={href} href={href}
                style={isActive ? { borderLeft: `2px solid ${color}` } : {}}
                className={`flex items-center gap-3 py-2 rounded-md transition-colors ${indent ? 'pl-7 pr-3' : 'px-3'} ${isActive
                    ? 'bg-[#1a1f26] text-white'
                    : 'text-[#8b949e] hover:bg-[#12161c] hover:text-[#c9d1d9]'
                    }`}>
                <Icon size={14} style={isActive ? { color } : { color: '#6e7681' }} />
                <span className="text-[12px] font-medium leading-tight">{label}</span>
            </Link>
        );
    };

    return (
        <aside className="w-[280px] min-h-screen bg-[#020406] border-r border-[#1a1f26] text-[#b3b9c5] font-sans select-none flex flex-col relative z-20">
            {/* Brand Logo & Status */}
            <div className="px-6 py-4 flex items-center justify-between sticky top-0 bg-[#020406]/90 backdrop-blur-sm z-30 pt-6">
                <div className="flex items-center gap-3 pointer-events-none">
                    <OrbeLogo className="w-8 h-8 shrink-0" />
                    <span className="text-white font-bold text-[18px] tracking-[0.2em] font-mono">ORBE</span>
                </div>
                <div className="flex items-center gap-1.5 pointer-events-none">
                    <div className="w-1.5 h-1.5 bg-[#39ff14] rounded-full shadow-[0_0_8px_rgba(57,255,20,0.8)] animate-pulse" />
                    <span className="text-[10px] font-mono text-[#00fff5] uppercase">Online</span>
                </div>
            </div>

            <NavigationControls />

            <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar mt-4 pb-10">

                {/* HUB DE NEGÓCIOS */}
                <div className="px-2 mb-2">
                    <Link href="/" className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border ${pathname === '/' ? 'border-teal-500/50 bg-[#0A1820] text-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.15)]' : 'border-transparent text-[#6e7681] hover:bg-[#1a1f26]'}`}>
                        <LayoutDashboard size={15} />
                        <span className="text-[12px] font-semibold tracking-wide">HUB DE NEGÓCIOS</span>
                    </Link>
                </div>

                {/* 1. COMERCIAL E VENDAS */}
                {renderHeader('comercial', '1. COMERCIAL & VENDAS', '#00fff5', 'A Máquina de Atração')}
                {expanded.comercial && (
                    <div className="space-y-0.5 animate-in fade-in slide-in-from-top-2 duration-300">
                        {renderLink('Funil de Negócios', '/vendas/funil', Columns, '#00fff5')}
                        {renderLink('Central WhatsApp', '/vendas/whatsapp', MessageCircle, '#00fff5')}
                        {renderLink('Propostas & Orçamentos', '/vendas/propostas', FileCheck, '#00fff5')}
                        {renderLink('Minhas Tarefas', '/vendas/tarefas', ListTodo, '#00fff5')}
                    </div>
                )}

                {/* 2. ENTIDADES & CRM */}
                {renderHeader('entidades', '2. ENTIDADES & CRM', '#bc13fe', 'A Base de Pessoas')}
                {expanded.entidades && (
                    <div className="space-y-0.5 animate-in fade-in slide-in-from-top-2 duration-300">
                        {renderLink('Clientes', '/clientes', User, '#bc13fe')}
                        {renderLink('Fornecedores', '/fornecedores', Users, '#bc13fe')}
                        {renderLink('Funcionários (RH)', '/funcionarios', Briefcase, '#bc13fe')}
                        {renderLink('Sócios & Cooperados', '/socios', Shield, '#bc13fe')}
                    </div>
                )}

                {/* 3. OPERAÇÃO FINANCEIRA */}
                {renderHeader('financeiro', '3. OPERAÇÃO FINANCEIRA', '#10b981', 'Entradas e Saídas')}
                {expanded.financeiro && (
                    <div className="space-y-0.5 animate-in fade-in slide-in-from-top-2 duration-300">
                        {renderLink('Caixa de Entrada', '/caixa/inbox', Inbox, '#10b981')}
                        {renderLink('Gestão de Caixa & PDV', '/caixa/gestao', Wallet, '#10b981')}

                        <div className="py-1 px-3">
                            <span className="text-[10px] font-bold text-[#6e7681] uppercase tracking-wide">▼ Recebimentos</span>
                        </div>
                        {renderLink('Receber', '/recebimentos/receber', ArrowDownLeft, '#10b981', true)}
                        {renderLink('Agendar', '/recebimentos/agendar', CalendarCheck, '#10b981', true)}
                        {renderLink('Boletos', '/recebimentos/boletos', Barcode, '#10b981', true)}
                        {renderLink('NFS-e Emitidas', '/recebimentos/nfse', FileText, '#10b981', true)}

                        <div className="py-1 px-3 mt-1">
                            <span className="text-[10px] font-bold text-[#6e7681] uppercase tracking-wide">▼ Pagamentos</span>
                        </div>
                        {renderLink('Pagar', '/pagamentos/pagar', ArrowUpRight, '#ef4444', true)}
                        {renderLink('Agendar / Reembolsos', '/pagamentos/agendar', CalendarClock, '#ef4444', true)}

                        <div className="mt-2" />
                        {renderLink('Contratos Recorrentes', '/contratos', FileCheck, '#10b981')}
                    </div>
                )}

                {/* 4. INTELIGÊNCIA & GOVERNANÇA */}
                {renderHeader('inteligencia', '4. INTELIGÊNCIA & GOVERNANÇA', '#f59e0b', 'A Camada de Decisão')}
                {expanded.inteligencia && (
                    <div className="space-y-0.5 animate-in fade-in slide-in-from-top-2 duration-300">
                        {renderLink('Painel DRE (Caixa vs Realizado)', '/relatorios/dre', LineChart, '#f59e0b')}
                        {renderLink('Envelhecimento (Aging List)', '/relatorios/aging', Clock, '#f59e0b')}
                        {renderLink('Fechamento de Mês', '/auditoria/fechamento', Archive, '#a855f7')}
                        {renderLink('Portal do Contador', '/auditoria/contador', Gavel, '#a855f7')}
                        {renderLink('Configurações Globais / Equipe', '/configuracoes/equipe', Settings, '#3b82f6')}
                    </div>
                )}
            </nav>

            {/* Footer Profile */}
            <div className="p-4 mt-auto border-t border-[#1a1f26] bg-[#06080A]">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-[12px] font-semibold text-[#8b949e]">admin@orbesystems.com.br</span>
                    </div>
                    <button className="flex items-center justify-center gap-1 py-1 px-2 text-[10px] font-bold text-[#ef4444] border border-[#ef4444]/30 bg-[#ef4444]/10 hover:bg-[#ef4444]/20 rounded transition-colors">
                        <LogOut size={10} />
                        [Encerrar]
                    </button>
                </div>
            </div>
        </aside>
    );
}
