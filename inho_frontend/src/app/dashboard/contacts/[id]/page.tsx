'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, FileText, DollarSign, FolderOpen, PenTool } from 'lucide-react';

const TABS = [
    { id: 'DATA', label: 'Dados Cadastrais', icon: User },
    { id: 'FINANCIAL', label: 'Financeiro', icon: DollarSign },
    { id: 'NOTES', label: 'Anotações', icon: PenTool },
    { id: 'FILES', label: 'Arquivos', icon: FolderOpen },
];

export default function ContactProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);

    const [activeTab, setActiveTab] = useState('DATA');
    const [loading, setLoading] = useState(true);

    // Fake state for mockup purposes (normally we fetch from CRM API)
    const contact = {
        id: id,
        name: 'Mockup Corp Ltda',
        category: 'CUSTOMER',
        document: '12.345.678/0001-90',
        email: 'financeiro@mockup.com',
        phone: '(11) 99999-9999',
        created_at: new Date().toISOString()
    };

    useEffect(() => {
        // Simulate fetch logic
        setTimeout(() => setLoading(false), 800);
    }, [id]);

    return (
        <div className="min-h-screen bg-inho-black p-6 lg:p-8">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* Header Ribbon */}
                <div className="flex items-center gap-4 mb-6">
                    <Link href="/dashboard/contacts" className="text-inho-muted hover:text-[#0F172A] transition-colors bg-inho-dark p-2 rounded-xl">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-[#0F172A] flex items-center gap-2">
                            {loading ? 'Carregando Dossiê...' : contact.name}
                        </h1>
                        <p className="font-mono text-[10px] text-neon-cyan uppercase tracking-widest mt-1">
                            CRM ID: {id.slice(0, 8)}...
                        </p>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex items-center gap-2 border-b border-inho-border pb-px overflow-x-auto scrollbar-hide">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs transition-colors whitespace-nowrap ${activeTab === tab.id
                                ? 'border-neon-cyan text-neon-cyan'
                                : 'border-transparent text-inho-muted hover:text-[#0F172A]'
                                }`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content Area */}
                <div className="glassmorphism rounded-2xl border border-inho-border p-6 min-h-[400px]">
                    {loading ? (
                        <div className="h-full flex items-center justify-center min-h-[300px]">
                            <div className="w-8 h-8 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <>
                            {activeTab === 'DATA' && (
                                <div className="space-y-6 animate-fade-in text-inho-text">
                                    <h2 className="text-lg font-bold text-[#0F172A] border-b border-inho-border pb-2">Informações Base</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <p className="text-[10px] uppercase text-inho-muted font-bold tracking-wider">Documento</p>
                                            <p className="font-mono mt-1 text-sm">{contact.document}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase text-inho-muted font-bold tracking-wider">E-mail</p>
                                            <p className="mt-1 text-sm">{contact.email}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase text-inho-muted font-bold tracking-wider">Telefone</p>
                                            <p className="mt-1 text-sm">{contact.phone}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase text-inho-muted font-bold tracking-wider">Última Atualização</p>
                                            <p className="font-mono mt-1 text-sm text-inho-muted">
                                                {new Date(contact.created_at).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'FINANCIAL' && (
                                <div className="animate-fade-in text-center py-12">
                                    <DollarSign className="mx-auto h-12 w-12 text-inho-muted opacity-50 mb-4" />
                                    <h3 className="text-lg font-bold text-[#0F172A] mb-2">Motor Financeiro Inativo</h3>
                                    <p className="text-inho-muted text-sm max-w-sm mx-auto">
                                        Não há transações (boletos ou repasses) processadas para este contato neste período contábil.
                                    </p>
                                </div>
                            )}

                            {activeTab === 'NOTES' && (
                                <div className="animate-fade-in">
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-lg font-bold text-[#0F172A]">Log de Anotações</h2>
                                        <button className="bg-[#FAF8F2] hover:bg-white/20 border border-[#E5DEC9] text-[#0F172A] px-4 py-2 text-xs font-bold rounded-lg transition-colors">
                                            + Adicionar Nota
                                        </button>
                                    </div>
                                    <div className="text-center py-8 border border-dashed border-inho-border rounded-xl">
                                        <p className="text-inho-muted text-sm font-mono">Nenhuma anotação vinculada a este dossiê.</p>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'FILES' && (
                                <div className="animate-fade-in text-center py-12">
                                    <FolderOpen className="mx-auto h-12 w-12 text-inho-muted opacity-50 mb-4" />
                                    <p className="text-inho-muted text-sm font-mono mb-4">Repositório de Documentações Secundárias</p>
                                    <button className="bg-neon-cyan/20 border border-neon-cyan text-neon-cyan px-4 py-2 text-xs font-bold rounded-lg hover:shadow-[0_0_15px_rgba(184,134,11,0.2)] transition-shadow">
                                        Upload S3 de Arquivo
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

            </div>
        </div>
    );
}
