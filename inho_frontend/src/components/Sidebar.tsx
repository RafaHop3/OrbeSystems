'use client';
import React, { useState } from 'react';
import {
    ChevronDown, ChevronUp, User, Users, Briefcase, Shield,
    ArrowDownLeft, CalendarCheck, Barcode, FileText,
    ArrowUpRight, CalendarClock, Inbox, Wallet, LineChart,
    PieChart, TrendingUp, Clock, TrendingDown,
    Building, Layers, FolderOpen, CreditCard, Settings,
    Lock, Sliders, Archive, Gavel, Columns, MessageCircle,
    FileCheck, ListTodo, BarChart2, LogOut, LayoutDashboard
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import OrbeLogo from './OrbeLogo';

export default function Sidebar() {
    const [isCrmOpen, setIsCrmOpen] = useState(true);
    const [isEntOpen, setIsEntOpen] = useState(true);
    const [isRecOpen, setIsRecOpen] = useState(true);
    const [isPagOpen, setIsPagOpen] = useState(true);
    const [isCxOpen, setIsCxOpen] = useState(true);
    const [isRelOpen, setIsRelOpen] = useState(true);
    const [isConfOpen, setIsConfOpen] = useState(false);
    const [isAudOpen, setIsAudOpen] = useState(false);

    const pathname = usePathname();

    const renderAccordion = (
        title: string, color: string,
        isOpen: boolean, toggle: () => void,
        items: { label: string, icon: any, href: string }[]
    ) => (
        <div className="pt-2 border-t border-[#1a1f26]/50 mt-3">
            <div onClick={toggle} className="flex items-center justify-between px-2 cursor-pointer mb-2 group">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-3 rounded-full opacity-80" style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }} />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest transition-colors group-hover:brightness-150" style={{ color }}>{title}</span>
                </div>
                {isOpen ? <ChevronUp size={14} style={{ color }} /> : <ChevronDown size={14} className="text-gray-500" />}
            </div>
            <div className={`space-y-0.5 transition-all duration-300 ease-in-out pl-4 ${isOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                        <Link key={item.href} href={item.href}
                            style={isActive ? { borderLeft: `2px solid ${color}` } : {}}
                            className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${isActive
                                ? 'bg-[#1a1f26] text-white'
                                : 'text-[#8b949e] hover:bg-[#12161c] hover:text-[#c9d1d9]'
                                }`}>
                            <Icon size={14} style={isActive ? { color } : { color: '#6e7681' }} />
                            <span className="text-[12px] font-medium leading-tight">{item.label}</span>
                        </Link>
                    )
                })}
            </div>
        </div>
    );

    return (
        <aside className="w-[280px] min-h-screen bg-[#020406] border-r border-[#1a1f26] text-[#b3b9c5] font-sans select-none flex flex-col relative z-20">
            {/* Brand Logo & Status */}
            <div className="px-6 py-6 flex items-center justify-between pointer-events-none sticky top-0 bg-[#020406]/90 backdrop-blur-sm z-30 border-b border-[#1a1f26]/50">
                <div className="flex items-center gap-3">
                    <OrbeLogo className="w-8 h-8 shrink-0" />
                    <span className="text-white font-bold text-[18px] tracking-[0.2em] font-mono">ORBE</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-[#39ff14] rounded-full shadow-[0_0_8px_rgba(57,255,20,0.8)] animate-pulse" />
                    <span className="text-[10px] font-mono text-[#00fff5] uppercase">Online</span>
                </div>
            </div>

            <nav className="flex-1 px-4 space-y-3 overflow-y-auto custom-scrollbar mt-4 pb-10">
                {/* Top Buttons (Gestão de Caixa / Dashboard) */}
                <div className="space-y-2">
                    <Link href="/" className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border ${pathname === '/' ? 'border-teal-500/50 bg-[#0A1820] text-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.15)]' : 'border-transparent text-[#6e7681] hover:bg-[#1a1f26]'}`}>
                        <LayoutDashboard size={16} />
                        <span className="text-[13px] font-semibold tracking-wide">HUB DE NEGÓCIOS</span>
                    </Link>
                    <Link href="/caixa/inbox" className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border ${pathname === '/caixa/inbox' ? 'border-[#bc13fe]/50 bg-[#160a20] text-[#bc13fe] shadow-[0_0_15px_rgba(188,19,254,0.15)]' : 'border-transparent text-[#6e7681] hover:bg-[#1a1f26]'}`}>
                        <Inbox size={16} />
                        <span className="text-[13px] font-semibold tracking-wide">CAIXA DE ENTRADA</span>
                    </Link>
                    <Link href="/caixa/gestao" className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border ${pathname === '/caixa/gestao' ? 'border-amber-500/50 bg-[#20180a] text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]' : 'border-transparent text-[#6e7681] hover:bg-[#1a1f26]'}`}>
                        <Wallet size={16} />
                        <span className="text-[13px] font-semibold tracking-wide">GESTÃO DE CAIXA</span>
                    </Link>
                </div>

                {renderAccordion('Vendas & CRM', '#00fff5', isCrmOpen, () => setIsCrmOpen(!isCrmOpen), [
                    { label: 'Funil de Negócios', icon: Columns, href: '/vendas/funil' },
                    { label: 'Central WhatsApp', icon: MessageCircle, href: '/vendas/whatsapp' },
                    { label: 'Propostas (PDF)', icon: FileCheck, href: '/vendas/propostas' },
                    { label: 'Minhas Tarefas', icon: ListTodo, href: '/vendas/tarefas' },
                ])}

                {renderAccordion('CRM & Entidades', '#bc13fe', isEntOpen, () => setIsEntOpen(!isEntOpen), [
                    { label: 'Clientes', icon: User, href: '/clientes' },
                    { label: 'Fornecedores', icon: Users, href: '/fornecedores' },
                    { label: 'Funcionários (RH)', icon: Briefcase, href: '/funcionarios' },
                    { label: 'Sócios e Cooperados', icon: Shield, href: '/socios' },
                ])}

                {renderAccordion('Recebimentos', '#10b981', isRecOpen, () => setIsRecOpen(!isRecOpen), [
                    { label: 'Contas a Receber', icon: ArrowDownLeft, href: '/recebimentos/receber' },
                    { label: 'Agendar', icon: CalendarCheck, href: '/recebimentos/agendar' },
                    { label: 'Boletos', icon: Barcode, href: '/recebimentos/boletos' },
                    { label: 'NFS-e Emitidas', icon: FileText, href: '/recebimentos/nfse' },
                ])}

                {renderAccordion('Pagamentos', '#ef4444', isPagOpen, () => setIsPagOpen(!isPagOpen), [
                    { label: 'Contas a Pagar', icon: ArrowUpRight, href: '/pagamentos/pagar' },
                    { label: 'Agendar e Reembolso', icon: CalendarClock, href: '/pagamentos/agendar' },
                ])}

                {renderAccordion('Relatórios e BI', '#f59e0b', isRelOpen, () => setIsRelOpen(!isRelOpen), [
                    { label: 'Painel Gerencial (DRE)', icon: LineChart, href: '/relatorios/dre' },
                    { label: 'A Receber (Analítico)', icon: PieChart, href: '/relatorios/receber' },
                    { label: 'Contas Liquidadas', icon: TrendingUp, href: '/relatorios/recebidas' },
                    { label: 'Aging List (Atrasos)', icon: Clock, href: '/relatorios/aging' },
                    { label: 'Perdas (Irrecuperável)', icon: TrendingDown, href: '/relatorios/perdidos' },
                ])}

                {renderAccordion('Configurações Globais', '#3b82f6', isConfOpen, () => setIsConfOpen(!isConfOpen), [
                    { label: 'Empresa Institucional', icon: Building, href: '/configuracoes/empresa' },
                    { label: 'Plano de Contas', icon: Layers, href: '/configuracoes/categorias' },
                    { label: 'Centros de Custo', icon: FolderOpen, href: '/configuracoes/cc' },
                    { label: 'Gateways de Cobrança', icon: CreditCard, href: '/configuracoes/cobranca' },
                    { label: 'Certificado NFS-e', icon: Settings, href: '/configuracoes/nfse' },
                    { label: 'Tokens de API', icon: Lock, href: '/configuracoes/api' },
                    { label: 'Usuários e Permissões', icon: Users, href: '/configuracoes/usuarios' },
                    { label: 'Parâmetros Avançados', icon: Sliders, href: '/configuracoes/avancado' },
                ])}

                {renderAccordion('Auditoria Contábil', '#a855f7', isAudOpen, () => setIsAudOpen(!isAudOpen), [
                    { label: 'Fechamento de Mês', icon: Archive, href: '/auditoria/fechamento' },
                    { label: 'Portal do Contador', icon: Gavel, href: '/auditoria/contador' },
                ])}
            </nav>

            {/* Footer Profile */}
            <div className="p-4 mt-auto border-t border-[#1a1f26] bg-[#06080A]">
                <div className="flex items-center gap-3 px-2 py-2">
                    <div className="w-9 h-9 rounded-md bg-[#0A1820] border border-teal-500/30 flex items-center justify-center">
                        <User size={16} className="text-teal-400" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[13px] font-semibold text-white">Admnistrador INHO</span>
                        <span className="text-[9px] font-bold text-green-500 uppercase border border-green-500/30 bg-green-500/10 rounded px-1.5 py-[1px] w-max mt-1">Super Admin</span>
                    </div>
                </div>
                <button className="mt-2 w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-[#6e7681] hover:text-red-400 hover:bg-[#1a1f26] rounded-md transition-colors">
                    <LogOut size={12} />
                    [→ SAIR DA CONTA]
                </button>
            </div>
        </aside>
    );
}
