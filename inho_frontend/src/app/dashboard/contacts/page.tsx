'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Users, Plus, FileSpreadsheet, Search, X, Loader2 } from 'lucide-react';
import { crmApi, CRMContactOut, CRMContactCreate } from '@/lib/api';

const TABS = [
    { id: 'ALL', label: 'Todos' },
    { id: 'CUSTOMER', label: 'Clientes' },
    { id: 'SUPPLIER', label: 'Fornecedores' },
    { id: 'EMPLOYEE', label: 'Funcionários' },
    { id: 'COOPERADO', label: 'Cooperados' },
    { id: 'PARTNER', label: 'Sócios' },
];

function ContactsContent() {
    const searchParams = useSearchParams();
    const urlCategory = searchParams.get('category');

    const [contacts, setContacts] = useState<CRMContactOut[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(urlCategory || 'ALL');
    const [searchQuery, setSearchQuery] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState<CRMContactCreate>({
        name: '',
        category: 'CUSTOMER',
        document: '',
        email: '',
        phone: '',
    });

    useEffect(() => {
        if (urlCategory && TABS.some((t) => t.id === urlCategory)) {
            setActiveTab(urlCategory);
            if (urlCategory !== 'ALL' && urlCategory !== 'PARTNER') {
                setFormData((prev) => ({ ...prev, category: urlCategory as any }));
            }
        } else if (!urlCategory) {
            setActiveTab('ALL');
        }
    }, [urlCategory]);

    useEffect(() => {
        loadContacts();
    }, [activeTab]);

    const loadContacts = async () => {
        setLoading(true);
        try {
            const data = await crmApi.getContacts(activeTab === 'ALL' ? undefined : activeTab);
            setContacts(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateContact = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await crmApi.createContact(formData);
            setIsModalOpen(false);
            setFormData({ name: '', category: 'CUSTOMER', document: '', email: '', phone: '' });
            await loadContacts();
            alert("Contato criado com sucesso!");
        } catch (error) {
            console.error(error);
            alert("Erro 500: Falha ao salvar contato no banco de dados.");
        } finally {
            setSubmitting(false);
        }
    };

    const filteredContacts = contacts.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.document && c.document.includes(searchQuery))
    );

    return (
        <div className="min-h-screen bg-inho-black p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-inho-text flex items-center gap-2">
                            Gestão de Contatos (CRM 360º)
                            <Users size={22} className="text-neon-cyan" />
                        </h1>
                        <p className="text-xs text-inho-muted mt-1">
                            Centralize clientes, fornecedores e equipe em uma visão integrada.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 bg-inho-dark border border-inho-border hover:bg-inho-dark/80 text-[#0F172A] px-4 py-2 rounded-xl transition-all font-bold text-xs">
                            <FileSpreadsheet size={16} />
                            Importar CSV
                        </button>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 bg-neon-cyan/20 border border-neon-cyan/50 hover:bg-neon-cyan/30 text-neon-cyan px-4 py-2 rounded-xl transition-all font-bold text-xs shadow-[0_0_15px_rgba(184,134,11,0.2)]">
                            <Plus size={16} />
                            Novo Cadastro
                        </button>
                    </div>
                </div>

                {/* Filters & Tabs */}
                <div className="glassmorphism rounded-2xl border border-inho-border p-4 flex flex-col md:flex-row justify-between items-center gap-4">

                    <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-hide">
                        {TABS.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === tab.id
                                    ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30'
                                    : 'text-inho-muted hover:text-[#0F172A] hover:bg-[#F1F5F9] border border-transparent'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-inho-muted" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou documento..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#F1F5F9] border border-inho-border rounded-xl py-2.5 pl-10 pr-4 text-xs text-[#0F172A] focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/50 transition-all placeholder:text-inho-muted"
                        />
                    </div>
                </div>

                {/* Table View */}
                <div className="glassmorphism rounded-2xl border border-inho-border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-inho-text">
                            <thead className="bg-inho-dark/80 border-b border-inho-border text-inho-muted font-mono text-[10px] uppercase tracking-widest">
                                <tr>
                                    <th className="px-6 py-4">Nome / Entidade</th>
                                    <th className="px-6 py-4">Documento</th>
                                    <th className="px-6 py-4">Contato</th>
                                    <th className="px-6 py-4">Categoria</th>
                                    <th className="px-6 py-4 text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-inho-border/40">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center">
                                            <div className="w-6 h-6 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin mx-auto" />
                                        </td>
                                    </tr>
                                ) : filteredContacts.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-inho-muted font-mono text-xs">
                                            Nenhum contato encontrado nesta visão.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredContacts.map((c) => (
                                        <tr key={c.id} className="hover:bg-inho-dark/40 transition-colors group">
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-[#0F172A] text-sm">{c.name}</p>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-xs text-inho-muted">
                                                {c.document || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-xs">
                                                <p className="text-[#0F172A]">{c.email || '-'}</p>
                                                <p className="text-inho-muted">{c.phone || '-'}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-block text-[9px] font-mono text-neon-cyan bg-neon-cyan/10 px-2 py-1 rounded border border-neon-cyan/20">
                                                    {c.category}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Link
                                                    href={`/dashboard/contacts/${c.id}`}
                                                    className="px-3 py-1.5 opacity-0 group-hover:opacity-100 bg-[#F1F5F9] border border-[#E2E8F0] hover:border-neon-cyan/50 hover:text-neon-cyan rounded-lg text-xs font-bold transition-all inline-block"
                                                >
                                                    Dossiê Completo
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            {/* Create Contact Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-white backdrop-blur-sm p-4">
                    <div className="bg-inho-black border border-inho-border rounded-2xl w-full max-w-lg shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden">
                        <div className="p-6 border-b border-inho-border flex items-center justify-between bg-inho-dark/50">
                            <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                                <Users size={20} className="text-neon-cyan" />
                                Cadastrar Contato
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-inho-muted hover:text-[#0F172A] transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateContact} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-inho-muted uppercase tracking-wider mb-2">Nome Completo</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-inho-dark border border-inho-border rounded-xl px-4 py-3 text-sm text-[#0F172A] focus:outline-none focus:border-neon-cyan/50 transition-colors"
                                    placeholder="Ex: Minha Empresa LTDA"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-inho-muted uppercase tracking-wider mb-2">Categoria</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                                        className="w-full bg-inho-dark border border-inho-border rounded-xl px-4 py-3 text-sm text-[#0F172A] focus:outline-none focus:border-neon-cyan/50 transition-colors appearance-none"
                                    >
                                        <option value="CUSTOMER">Cliente</option>
                                        <option value="SUPPLIER">Fornecedor</option>
                                        <option value="EMPLOYEE">Funcionário</option>
                                        <option value="COOPERADO">Cooperado</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-inho-muted uppercase tracking-wider mb-2">CNPJ / CPF</label>
                                    <input
                                        type="text"
                                        value={formData.document}
                                        onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                                        className="w-full bg-inho-dark border border-inho-border rounded-xl px-4 py-3 text-sm text-[#0F172A] focus:outline-none focus:border-neon-cyan/50 transition-colors"
                                        placeholder="Opcional"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-inho-muted uppercase tracking-wider mb-2">E-mail</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full bg-inho-dark border border-inho-border rounded-xl px-4 py-3 text-sm text-[#0F172A] focus:outline-none focus:border-neon-cyan/50 transition-colors"
                                        placeholder="contato@..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-inho-muted uppercase tracking-wider mb-2">Telefone</label>
                                    <input
                                        type="text"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full bg-inho-dark border border-inho-border rounded-xl px-4 py-3 text-sm text-[#0F172A] focus:outline-none focus:border-neon-cyan/50 transition-colors"
                                        placeholder="(11) 9..."
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex items-center gap-2 bg-neon-cyan text-white hover:bg-neon-cyan/90 font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-neon-cyan/20 disabled:opacity-50"
                                >
                                    {submitting ? <Loader2 className="animate-spin" size={18} /> : 'Cadastrar e Salvar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ContactsPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-inho-black p-8 text-inho-muted font-sans text-xs">Carregando contatos...</div>}>
            <ContactsContent />
        </Suspense>
    );
}
