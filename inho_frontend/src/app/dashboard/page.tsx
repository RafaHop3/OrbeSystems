'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import {
    Users2, Building, Store, Utensils,
    PlusCircle, Lock, ArrowRight, LayoutTemplate, Crown, ShieldCheck, Landmark
} from 'lucide-react';

export default function DashboardHub() {
    const { user } = useAuth();

    const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

    const segments = [
        {
            id: 'cooperativa',
            title: 'Cooperativismo & Capital Social',
            icon: Users2,
            description: 'Gestão executiva completa para Cooperativas com quadro societário, cota-parte, rateio AGO, Open Finance BACEN e módulos B2B/B2C integrados.',
            status: 'active',
            href: '/dashboard/cooperativa',
        },
        {
            id: 'hotelaria',
            title: 'Redes de Hotelaria',
            icon: Building,
            description: 'Módulo unificado para controle de hospedagem, consumo e gestão tarifária multi-unidade.',
            status: 'locked',
            href: '#',
        },
        {
            id: 'sindicato',
            title: 'Sindicatos e Associações',
            icon: LayoutTemplate,
            description: 'Arrecadação institucional e gestão completa de sindicalizados e benefícios associativos.',
            status: 'locked',
            href: '#',
        },
        {
            id: 'supermercado',
            title: 'Supermercados & Atacarejo',
            icon: Store,
            description: 'Integração massiva B2C, controle logístico de reposição e frente de caixa rápida.',
            status: 'locked',
            href: '#',
        },
        {
            id: 'restaurante',
            title: 'Gastronomia & Eventos',
            icon: Utensils,
            description: 'Gestão de mesas, pedidos em tempo real e controle executivo de CMV e desperdício.',
            status: 'locked',
            href: '#',
        }
    ];

    return (
        <div className="flex-1 overflow-y-auto min-h-full bg-[#F8FAFC]">
            <main className="max-w-[1600px] mx-auto p-6 lg:p-10 fade-in space-y-8">

                {/* Executive Gold Banner Header */}
                <div className="bg-white rounded-3xl p-8 border border-[#E2E8F0] shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#9A6F0B] via-[#D4AF37] to-[#059669]" />
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F1F5F9] border border-slate-200 text-[#8B6508] text-[11px] font-extrabold uppercase tracking-widest mb-3">
                                <Crown size={13} className="text-[#B8860B]" />
                                Arquitetura Executiva • Orbe Enterprise Edition
                            </div>
                            <h1 className="text-3xl lg:text-4xl font-black text-[#0F172A] mb-2 tracking-tight">
                                Hub de <span className="text-shimmer">Modelos de Negócios</span>
                            </h1>
                            <p className="text-[#64748B] text-sm max-w-2xl leading-relaxed">
                                Bem-vindo ao ambiente executivo de alta precisão do <strong className="text-[#0F172A]">ORBE INHO</strong>. Selecione o módulo institucional ativo para operar o quadro societário, tesouraria Open Finance, faturamento e governança.
                            </p>
                        </div>

                        {/* ADD OPERATOR BUTTON - Only Admins */}
                        {isAdmin && (
                            <Link
                                href="/dashboard/users"
                                className="flex items-center gap-3.5 px-6 py-4 bg-gradient-to-r from-[#9A6F0B] via-[#C59B27] to-[#9A6F0B] rounded-2xl text-white hover:brightness-105 transition-all shadow-inho-gold shrink-0"
                            >
                                <PlusCircle size={24} className="text-white" />
                                <div className="flex flex-col items-start pr-2">
                                    <span className="font-extrabold text-sm tracking-wider uppercase">Novo Operador</span>
                                    <span className="text-[10px] text-amber-100 font-semibold uppercase tracking-widest">Credenciar Equipe</span>
                                </div>
                            </Link>
                        )}
                    </div>

                    {/* Executive Pillars Strip */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-[#E2E8F0]">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#F1F5F9] border border-slate-200 flex items-center justify-center text-[#8B6508]">
                                <Landmark size={18} />
                            </div>
                            <div>
                                <p className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider">Open Finance BACEN</p>
                                <p className="text-[11px] text-[#64748B]">Conciliação automática de cotas e PIX</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                                <ShieldCheck size={18} />
                            </div>
                            <div>
                                <p className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider">Isolamento Multi-Tenant</p>
                                <p className="text-[11px] text-[#64748B]">Segregação criptográfica e trilha de auditoria</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#F1F5F9] border border-slate-200 flex items-center justify-center text-[#8B6508]">
                                <Crown size={18} />
                            </div>
                            <div>
                                <p className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider">OrBrick Omnichannel</p>
                                <p className="text-[11px] text-[#64748B]">Régua automática D-3, D0 e D+3 no WhatsApp</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Segments Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {segments.map((segment) => {
                        const isActive = segment.status === 'active';
                        const Icon = segment.icon;

                        return (
                            <Link
                                key={segment.id}
                                href={isActive ? segment.href : '#'}
                                className={`relative flex flex-col p-8 rounded-3xl border transition-all duration-300 overflow-hidden group ${
                                    isActive
                                        ? 'bg-white border-[#D4AF37]/70 hover:-translate-y-1.5 shadow-sm hover:shadow-md'
                                        : 'bg-white/75 border-[#E2E8F0] opacity-80 cursor-not-allowed'
                                }`}
                            >
                                {isActive && (
                                    <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#9A6F0B] via-[#D4AF37] to-[#059669]" />
                                )}

                                {/* Background Watermark Icon */}
                                <div className="absolute top-2 right-2 p-6 opacity-[0.04] text-[#8B6508] pointer-events-none">
                                    <Icon size={160} />
                                </div>

                                <div className="flex justify-between items-start mb-12 relative z-10">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-sm ${
                                        isActive
                                            ? 'bg-gradient-to-br from-[#F1F5F9] to-[#F5E6B8] border-slate-300 text-[#8B6508]'
                                            : 'bg-[#F1F5F9] border-[#E2E8F0] text-[#64748B]'
                                    }`}>
                                        <Icon size={28} />
                                    </div>

                                    {!isActive ? (
                                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F1F5F9] border border-[#E2E8F0] rounded-full text-[11px] font-bold text-[#64748B]">
                                            <Lock size={12} />
                                            EM BREVE
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-[11px] font-extrabold text-emerald-800">
                                            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                                            DISPONÍVEL • PADRÃO OURO
                                        </span>
                                    )}
                                </div>

                                <div className="relative z-10 mt-auto">
                                    <h3 className={`text-2xl font-black mb-2 ${isActive ? 'text-[#0F172A]' : 'text-[#475569]'}`}>
                                        {segment.title}
                                    </h3>
                                    <p className="text-sm text-[#64748B] leading-relaxed max-w-sm mb-6">
                                        {segment.description}
                                    </p>

                                    <div className={`flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider ${
                                        isActive ? 'text-[#8B6508] group-hover:translate-x-2 transition-transform duration-300' : 'text-[#94A3B8]'
                                    }`}>
                                        {isActive ? 'Acessar Módulo Executivo' : 'Módulo Bloqueado'}
                                        {isActive && <ArrowRight size={16} className="text-[#B8860B]" />}
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>

            </main>
        </div>
    );
}
