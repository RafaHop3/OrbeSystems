'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, User, DollarSign, FolderOpen, PenTool,
    Phone, Mail, Landmark, Calendar, HeartHandshake, Plus, Trash2, Save, Loader2, CheckCircle2
} from 'lucide-react';
import {
    crmApi,
    CRMContactOut,
    ContactPhoneEntry,
    ContactEmailEntry,
    ContactBankAccountEntry,
    BRAZILIAN_BANKS_CATALOG,
    resolveBankNameByCode,
} from '@/lib/api';

const TABS = [
    { id: 'DATA', label: 'Ficha Cadastral Completa', icon: User },
    { id: 'FINANCIAL', label: 'Financeiro', icon: DollarSign },
    { id: 'NOTES', label: 'Anotações', icon: PenTool },
    { id: 'FILES', label: 'Arquivos', icon: FolderOpen },
];

const PHONE_TYPES = [
    { value: 'PROPRIO', label: 'Telefone Próprio' },
    { value: 'MAE', label: 'Telefone da Mãe' },
    { value: 'PAI', label: 'Telefone do Pai' },
    { value: 'RECADO', label: 'Telefone para Recado' },
    { value: 'WHATSAPP', label: 'WhatsApp Principal' },
    { value: 'COMERCIAL', label: 'Comercial / Trabalho' },
    { value: 'RESIDENCIAL', label: 'Residencial / Fixo' },
    { value: 'OUTRO', label: 'Outro Contato' },
];

const EMAIL_TYPES = [
    { value: 'PRINCIPAL', label: 'E-mail Principal' },
    { value: 'PESSOAL', label: 'Pessoal' },
    { value: 'FINANCEIRO', label: 'Financeiro / Cobrança' },
    { value: 'CORPORATIVO', label: 'Corporativo' },
    { value: 'SECUNDARIO', label: 'Secundário / Familiar' },
];

const BANK_ACCOUNT_TYPES = [
    { value: 'CONTA_CORRENTE', label: 'Conta Corrente' },
    { value: 'CONTA_POUPANCA', label: 'Conta Poupança' },
    { value: 'CONTA_CAPITAL_COOP', label: 'Conta Capital Cooperativa' },
    { value: 'CONTA_SALARIO', label: 'Conta Salário' },
    { value: 'CONTA_PAGAMENTO', label: 'Conta Pagamento / Digital' },
];

export default function ContactProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);

    const [activeTab, setActiveTab] = useState('DATA');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);
    const [contact, setContact] = useState<CRMContactOut | null>(null);
    const [timeline, setTimeline] = useState<{
        upcoming_receivables: { id: string; amount: number; due_date: string; status: string; description?: string }[];
        last_received: { id: string; amount: number; due_date: string; status: string; description?: string }[];
        open_balance: number;
    } | null>(null);

    // Editable state
    const [name, setName] = useState('');
    const [category, setCategory] = useState<CRMContactOut['category']>('CUSTOMER');
    const [document, setDocument] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [filiation, setFiliation] = useState('');
    const [motherName, setMotherName] = useState('');
    const [fatherName, setFatherName] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [stateUf, setStateUf] = useState('');
    const [zipCode, setZipCode] = useState('');
    const [notes, setNotes] = useState('');
    const [phones, setPhones] = useState<ContactPhoneEntry[]>([]);
    const [emails, setEmails] = useState<ContactEmailEntry[]>([]);
    const [bankAccounts, setBankAccounts] = useState<ContactBankAccountEntry[]>([]);

    const loadDossie = async () => {
        setLoading(true);
        try {
            const [c, tl] = await Promise.all([
                crmApi.getContact(id),
                crmApi.getContactTimeline(id).catch(() => null),
            ]);
            setContact(c);
            setTimeline(tl);
            setName(c.name || '');
            setCategory(c.category || 'CUSTOMER');
            setDocument(c.document || '');
            setBirthDate(c.birth_date || '');
            setFiliation(c.filiation || '');
            setMotherName(c.mother_name || '');
            setFatherName(c.father_name || '');
            setAddress(c.address || '');
            setCity(c.city || '');
            setStateUf(c.state || '');
            setZipCode(c.zip_code || '');
            setNotes(c.notes || '');
            setPhones(
                c.phones && c.phones.length > 0
                    ? c.phones
                    : [{ number: c.phone || '', type: 'PROPRIO', label: 'Telefone Próprio', is_whatsapp: true, is_primary: true }]
            );
            setEmails(
                c.emails && c.emails.length > 0
                    ? c.emails
                    : [{ email: c.email || '', type: 'PRINCIPAL', label: 'E-mail Principal', is_primary: true }]
            );
            setBankAccounts(
                c.bank_accounts && c.bank_accounts.length > 0
                    ? c.bank_accounts
                    : [
                          {
                              bank_code: c.bank_code || '',
                              bank_name: c.bank_name || resolveBankNameByCode(c.bank_code),
                              agency: c.bank_agency || '',
                              account: c.bank_account || '',
                              account_type: c.bank_account_type || 'CONTA_CORRENTE',
                              pix_key: c.pix_key || '',
                              is_primary: true,
                          },
                      ]
            );
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDossie();
    }, [id]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setSaveMessage(null);
        try {
            const validPhones = phones.filter((p) => (p.number || '').trim().length > 0);
            const validEmails = emails.filter((em) => (em.email || '').trim().length > 0);
            const validBanks = bankAccounts.filter((b) =>
                Boolean(
                    (b.bank_code || '').trim() ||
                        (b.bank_name || '').trim() ||
                        (b.agency || '').trim() ||
                        (b.account || '').trim() ||
                        (b.pix_key || '').trim()
                )
            );
            const primaryBank = validBanks[0];
            const combinedFiliation =
                filiation.trim() ||
                [motherName ? `Mãe: ${motherName.trim()}` : '', fatherName ? `Pai: ${fatherName.trim()}` : '']
                    .filter(Boolean)
                    .join(' | ') ||
                undefined;

            const updated = await crmApi.updateContact(id, {
                name,
                category,
                document: document || undefined,
                birth_date: birthDate || undefined,
                filiation: combinedFiliation,
                mother_name: motherName || undefined,
                father_name: fatherName || undefined,
                phone: validPhones[0]?.number || undefined,
                email: validEmails[0]?.email || undefined,
                bank_code: primaryBank?.bank_code || undefined,
                bank_name: primaryBank?.bank_name || undefined,
                bank_agency: primaryBank?.agency || undefined,
                bank_account: primaryBank?.account || undefined,
                bank_account_type: primaryBank?.account_type || undefined,
                pix_key: primaryBank?.pix_key || undefined,
                address: address || undefined,
                city: city || undefined,
                state: stateUf || undefined,
                zip_code: zipCode || undefined,
                notes: notes || undefined,
                phones: validPhones,
                emails: validEmails,
                bank_accounts: validBanks,
            });
            setContact(updated);
            setSaveMessage('Ficha cadastral atualizada com sucesso!');
            setTimeout(() => setSaveMessage(null), 4000);
        } catch (err: any) {
            alert(err?.message || 'Erro ao atualizar ficha cadastral.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-inho-black p-6 lg:p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header Ribbon */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard/contacts" className="text-inho-muted hover:text-[#0F172A] transition-colors bg-inho-dark p-2 rounded-xl border border-inho-border">
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-[#0F172A] flex items-center gap-2">
                                {loading ? 'Carregando Ficha Cadastral...' : contact?.name || 'Ficha não encontrada'}
                            </h1>
                            <p className="font-mono text-[10px] text-neon-cyan uppercase tracking-widest mt-1">
                                CRM ID: {id} • Categoria: {contact?.category || '-'}
                            </p>
                        </div>
                    </div>

                    {saveMessage && (
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                            <CheckCircle2 size={15} />
                            {saveMessage}
                        </div>
                    )}
                </div>

                {/* Navigation Tabs */}
                <div className="flex items-center gap-2 border-b border-inho-border pb-px overflow-x-auto scrollbar-hide">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs transition-colors whitespace-nowrap ${
                                activeTab === tab.id
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
                    ) : !contact ? (
                        <div className="text-center py-12 text-inho-muted text-sm">
                            Ficha cadastral não localizada para este ID.
                        </div>
                    ) : (
                        <>
                            {activeTab === 'DATA' && (
                                <form onSubmit={handleSave} className="space-y-6 animate-fade-in text-xs">
                                    {/* 1. Dados Pessoais */}
                                    <div className="p-4 rounded-xl bg-[#F8FAFC] border border-inho-border space-y-4">
                                        <h2 className="text-sm font-extrabold text-[#0F172A] uppercase tracking-wider flex items-center gap-2 border-b border-inho-border pb-2">
                                            <User size={16} className="text-neon-cyan" />
                                            1. Dados Pessoais (Data de Nascimento & Filiação)
                                        </h2>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="md:col-span-2">
                                                <label className="block text-[10px] uppercase text-inho-muted font-bold tracking-wider mb-1">
                                                    Nome Completo / Razão Social
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={name}
                                                    onChange={(e) => setName(e.target.value)}
                                                    className="w-full bg-white border border-inho-border rounded-xl px-3.5 py-2.5 text-sm text-[#0F172A]"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] uppercase text-inho-muted font-bold tracking-wider mb-1">
                                                    CPF / CNPJ
                                                </label>
                                                <input
                                                    type="text"
                                                    value={document}
                                                    onChange={(e) => setDocument(e.target.value)}
                                                    className="w-full bg-white border border-inho-border rounded-xl px-3.5 py-2.5 text-sm text-[#0F172A] font-mono"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-[10px] uppercase text-inho-muted font-bold tracking-wider mb-1 flex items-center gap-1">
                                                    <Calendar size={12} className="text-neon-cyan" />
                                                    Data de Nascimento
                                                </label>
                                                <input
                                                    type="date"
                                                    value={birthDate}
                                                    onChange={(e) => setBirthDate(e.target.value)}
                                                    className="w-full bg-white border border-inho-border rounded-xl px-3.5 py-2.5 text-sm text-[#0F172A]"
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-[10px] uppercase text-inho-muted font-bold tracking-wider mb-1 flex items-center gap-1">
                                                    <HeartHandshake size={12} className="text-neon-cyan" />
                                                    Filiação (Registro Completo)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={filiation}
                                                    onChange={(e) => setFiliation(e.target.value)}
                                                    placeholder="Filiação materna e paterna"
                                                    className="w-full bg-white border border-inho-border rounded-xl px-3.5 py-2.5 text-sm text-[#0F172A]"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] uppercase text-inho-muted font-bold tracking-wider mb-1">
                                                    Filiação Materna (Nome da Mãe)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={motherName}
                                                    onChange={(e) => setMotherName(e.target.value)}
                                                    placeholder="Nome completo da mãe"
                                                    className="w-full bg-white border border-inho-border rounded-xl px-3.5 py-2 text-xs text-[#0F172A]"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] uppercase text-inho-muted font-bold tracking-wider mb-1">
                                                    Filiação Paterna (Nome do Pai)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={fatherName}
                                                    onChange={(e) => setFatherName(e.target.value)}
                                                    placeholder="Nome completo do pai"
                                                    className="w-full bg-white border border-inho-border rounded-xl px-3.5 py-2 text-xs text-[#0F172A]"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 2. Múltiplos Telefones */}
                                    <div className="p-4 rounded-xl bg-[#F8FAFC] border border-inho-border space-y-3">
                                        <div className="flex items-center justify-between border-b border-inho-border pb-2">
                                            <h2 className="text-sm font-extrabold text-[#0F172A] uppercase tracking-wider flex items-center gap-2">
                                                <Phone size={16} className="text-neon-cyan" />
                                                2. Múltiplos Telefones por Pessoa
                                            </h2>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setPhones([...phones, { number: '', type: 'RECADO', label: '', is_whatsapp: false }])
                                                }
                                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30 font-bold text-[11px]"
                                            >
                                                <Plus size={13} /> Adicionar Telefone
                                            </button>
                                        </div>

                                        <div className="space-y-2">
                                            {phones.map((ph, idx) => (
                                                <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center bg-white p-2.5 rounded-xl border border-inho-border">
                                                    <div className="md:col-span-4">
                                                        <input
                                                            type="text"
                                                            value={ph.number}
                                                            onChange={(e) => {
                                                                const next = [...phones];
                                                                next[idx] = { ...next[idx], number: e.target.value };
                                                                setPhones(next);
                                                            }}
                                                            placeholder="(51) 99999-9999"
                                                            className="w-full bg-[#F8FAFC] border border-inho-border rounded-lg px-3 py-2 text-xs text-[#0F172A]"
                                                        />
                                                    </div>
                                                    <div className="md:col-span-4">
                                                        <select
                                                            value={ph.type || 'PROPRIO'}
                                                            onChange={(e) => {
                                                                const next = [...phones];
                                                                next[idx] = { ...next[idx], type: e.target.value };
                                                                setPhones(next);
                                                            }}
                                                            className="w-full bg-[#F8FAFC] border border-inho-border rounded-lg px-3 py-2 text-xs text-[#0F172A]"
                                                        >
                                                            {PHONE_TYPES.map((pt) => (
                                                                <option key={pt.value} value={pt.value}>
                                                                    {pt.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="md:col-span-3">
                                                        <input
                                                            type="text"
                                                            value={ph.label || ''}
                                                            onChange={(e) => {
                                                                const next = [...phones];
                                                                next[idx] = { ...next[idx], label: e.target.value };
                                                                setPhones(next);
                                                            }}
                                                            placeholder="Observação / Nome do contato"
                                                            className="w-full bg-[#F8FAFC] border border-inho-border rounded-lg px-3 py-2 text-xs text-[#0F172A]"
                                                        />
                                                    </div>
                                                    <div className="md:col-span-1 flex justify-end">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const next = phones.filter((_, i) => i !== idx);
                                                                setPhones(next.length ? next : [{ number: '', type: 'PROPRIO' }]);
                                                            }}
                                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 3. Múltiplos E-mails */}
                                    <div className="p-4 rounded-xl bg-[#F8FAFC] border border-inho-border space-y-3">
                                        <div className="flex items-center justify-between border-b border-inho-border pb-2">
                                            <h2 className="text-sm font-extrabold text-[#0F172A] uppercase tracking-wider flex items-center gap-2">
                                                <Mail size={16} className="text-neon-cyan" />
                                                3. Múltiplos E-mails Vinculados
                                            </h2>
                                            <button
                                                type="button"
                                                onClick={() => setEmails([...emails, { email: '', type: 'SECUNDARIO', label: '' }])}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30 font-bold text-[11px]"
                                            >
                                                <Plus size={13} /> Adicionar E-mail
                                            </button>
                                        </div>

                                        <div className="space-y-2">
                                            {emails.map((em, idx) => (
                                                <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center bg-white p-2.5 rounded-xl border border-inho-border">
                                                    <div className="md:col-span-5">
                                                        <input
                                                            type="email"
                                                            value={em.email}
                                                            onChange={(e) => {
                                                                const next = [...emails];
                                                                next[idx] = { ...next[idx], email: e.target.value };
                                                                setEmails(next);
                                                            }}
                                                            placeholder="email@exemplo.com"
                                                            className="w-full bg-[#F8FAFC] border border-inho-border rounded-lg px-3 py-2 text-xs text-[#0F172A]"
                                                        />
                                                    </div>
                                                    <div className="md:col-span-3">
                                                        <select
                                                            value={em.type || 'PRINCIPAL'}
                                                            onChange={(e) => {
                                                                const next = [...emails];
                                                                next[idx] = { ...next[idx], type: e.target.value };
                                                                setEmails(next);
                                                            }}
                                                            className="w-full bg-[#F8FAFC] border border-inho-border rounded-lg px-3 py-2 text-xs text-[#0F172A]"
                                                        >
                                                            {EMAIL_TYPES.map((et) => (
                                                                <option key={et.value} value={et.value}>
                                                                    {et.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="md:col-span-3">
                                                        <input
                                                            type="text"
                                                            value={em.label || ''}
                                                            onChange={(e) => {
                                                                const next = [...emails];
                                                                next[idx] = { ...next[idx], label: e.target.value };
                                                                setEmails(next);
                                                            }}
                                                            placeholder="Identificação do e-mail"
                                                            className="w-full bg-[#F8FAFC] border border-inho-border rounded-lg px-3 py-2 text-xs text-[#0F172A]"
                                                        />
                                                    </div>
                                                    <div className="md:col-span-1 flex justify-end">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const next = emails.filter((_, i) => i !== idx);
                                                                setEmails(next.length ? next : [{ email: '', type: 'PRINCIPAL' }]);
                                                            }}
                                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 4. Dados Bancários & Múltiplas Contas Bancárias */}
                                    <div className="p-4 rounded-xl bg-[#F8FAFC] border border-inho-border space-y-3">
                                        <div className="flex items-center justify-between border-b border-inho-border pb-2">
                                            <div>
                                                <h2 className="text-sm font-extrabold text-[#0F172A] uppercase tracking-wider flex items-center gap-2">
                                                    <Landmark size={16} className="text-neon-cyan" />
                                                    4. Múltiplas Contas Bancárias (Banco Nº + Nome, Agência e Conta)
                                                </h2>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setBankAccounts([
                                                        ...bankAccounts,
                                                        {
                                                            bank_code: '',
                                                            bank_name: '',
                                                            agency: '',
                                                            account: '',
                                                            account_type: 'CONTA_CORRENTE',
                                                            pix_key: '',
                                                        },
                                                    ])
                                                }
                                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30 font-bold text-[11px]"
                                            >
                                                <Plus size={13} /> Adicionar Conta Bancária
                                            </button>
                                        </div>

                                        <datalist id="profile-compe-banks">
                                            {BRAZILIAN_BANKS_CATALOG.map((b) => (
                                                <option key={b.code} value={b.code}>
                                                    {b.code} - {b.name}
                                                </option>
                                            ))}
                                        </datalist>

                                        <div className="space-y-3">
                                            {bankAccounts.map((ba, idx) => (
                                                <div key={idx} className="p-3 rounded-xl bg-white border border-inho-border space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] font-extrabold uppercase text-neon-cyan">
                                                            Conta Bancária #{idx + 1} {idx === 0 ? '(Principal)' : ''}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const next = bankAccounts.filter((_, i) => i !== idx);
                                                                setBankAccounts(
                                                                    next.length
                                                                        ? next
                                                                        : [{ bank_code: '', bank_name: '', agency: '', account: '', account_type: 'CONTA_CORRENTE' }]
                                                                );
                                                            }}
                                                            className="text-red-600 hover:bg-red-50 px-2 py-1 rounded text-[10px] font-bold inline-flex items-center gap-1"
                                                        >
                                                            <Trash2 size={12} /> Remover
                                                        </button>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                                                        <div className="md:col-span-2">
                                                            <label className="block text-[10px] text-inho-muted uppercase font-bold mb-0.5">
                                                                Nº do Banco
                                                            </label>
                                                            <input
                                                                type="text"
                                                                list="profile-compe-banks"
                                                                value={ba.bank_code || ''}
                                                                onChange={(e) => {
                                                                    const code = e.target.value;
                                                                    const autoName = resolveBankNameByCode(code);
                                                                    const next = [...bankAccounts];
                                                                    next[idx] = {
                                                                        ...next[idx],
                                                                        bank_code: code,
                                                                        bank_name: autoName || next[idx].bank_name,
                                                                    };
                                                                    setBankAccounts(next);
                                                                }}
                                                                placeholder="Ex: 756, 001"
                                                                className="w-full bg-[#F8FAFC] border border-inho-border rounded-lg px-2.5 py-2 text-xs text-[#0F172A] font-mono"
                                                            />
                                                        </div>
                                                        <div className="md:col-span-3">
                                                            <label className="block text-[10px] text-inho-muted uppercase font-bold mb-0.5">
                                                                Nome do Banco
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={ba.bank_name || ''}
                                                                onChange={(e) => {
                                                                    const next = [...bankAccounts];
                                                                    next[idx] = { ...next[idx], bank_name: e.target.value };
                                                                    setBankAccounts(next);
                                                                }}
                                                                placeholder="Nome da instituição"
                                                                className="w-full bg-[#F8FAFC] border border-inho-border rounded-lg px-2.5 py-2 text-xs text-[#0F172A]"
                                                            />
                                                        </div>
                                                        <div className="md:col-span-2">
                                                            <label className="block text-[10px] text-inho-muted uppercase font-bold mb-0.5">
                                                                Agência
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={ba.agency || ''}
                                                                onChange={(e) => {
                                                                    const next = [...bankAccounts];
                                                                    next[idx] = { ...next[idx], agency: e.target.value };
                                                                    setBankAccounts(next);
                                                                }}
                                                                placeholder="0001"
                                                                className="w-full bg-[#F8FAFC] border border-inho-border rounded-lg px-2.5 py-2 text-xs text-[#0F172A] font-mono"
                                                            />
                                                        </div>
                                                        <div className="md:col-span-2">
                                                            <label className="block text-[10px] text-inho-muted uppercase font-bold mb-0.5">
                                                                Conta
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={ba.account || ''}
                                                                onChange={(e) => {
                                                                    const next = [...bankAccounts];
                                                                    next[idx] = { ...next[idx], account: e.target.value };
                                                                    setBankAccounts(next);
                                                                }}
                                                                placeholder="12345-6"
                                                                className="w-full bg-[#F8FAFC] border border-inho-border rounded-lg px-2.5 py-2 text-xs text-[#0F172A] font-mono"
                                                            />
                                                        </div>
                                                        <div className="md:col-span-3">
                                                            <label className="block text-[10px] text-inho-muted uppercase font-bold mb-0.5">
                                                                Tipo / Chave PIX
                                                            </label>
                                                            <div className="grid grid-cols-2 gap-1.5">
                                                                <select
                                                                    value={ba.account_type || 'CONTA_CORRENTE'}
                                                                    onChange={(e) => {
                                                                        const next = [...bankAccounts];
                                                                        next[idx] = { ...next[idx], account_type: e.target.value };
                                                                        setBankAccounts(next);
                                                                    }}
                                                                    className="bg-[#F8FAFC] border border-inho-border rounded-lg px-2 py-2 text-[11px] text-[#0F172A]"
                                                                >
                                                                    {BANK_ACCOUNT_TYPES.map((bt) => (
                                                                        <option key={bt.value} value={bt.value}>
                                                                            {bt.label}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                                <input
                                                                    type="text"
                                                                    value={ba.pix_key || ''}
                                                                    onChange={(e) => {
                                                                        const next = [...bankAccounts];
                                                                        next[idx] = { ...next[idx], pix_key: e.target.value };
                                                                        setBankAccounts(next);
                                                                    }}
                                                                    placeholder="Chave PIX"
                                                                    className="bg-[#F8FAFC] border border-inho-border rounded-lg px-2 py-2 text-[11px] text-[#0F172A]"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={saving}
                                            className="inline-flex items-center gap-2 bg-neon-cyan text-white font-extrabold px-6 py-3 rounded-xl shadow-lg hover:bg-neon-cyan/90 transition-all uppercase tracking-wider text-xs"
                                        >
                                            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                            {saving ? 'Salvando...' : 'Salvar Alterações da Ficha'}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {activeTab === 'FINANCIAL' && (
                                <div className="animate-fade-in space-y-4">
                                    {timeline && (timeline.upcoming_receivables.length > 0 || timeline.last_received.length > 0) ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-inho-border">
                                                <h3 className="font-extrabold text-[#0F172A] uppercase mb-3">
                                                    Próximos Recebimentos (Saldo Aberto: R$ {timeline.open_balance.toFixed(2)})
                                                </h3>
                                                {timeline.upcoming_receivables.map((item) => (
                                                    <div key={item.id} className="flex justify-between py-2 border-b border-inho-border">
                                                        <span>{item.description || 'Fatura'}</span>
                                                        <span className="font-bold">R$ {item.amount.toFixed(2)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-inho-border">
                                                <h3 className="font-extrabold text-[#0F172A] uppercase mb-3">Últimos Pagamentos Recebidos</h3>
                                                {timeline.last_received.map((item) => (
                                                    <div key={item.id} className="flex justify-between py-2 border-b border-inho-border">
                                                        <span>{item.description || 'Fatura Liquidada'}</span>
                                                        <span className="font-bold text-emerald-700">R$ {item.amount.toFixed(2)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            <DollarSign className="mx-auto h-12 w-12 text-inho-muted opacity-50 mb-4" />
                                            <h3 className="text-lg font-bold text-[#0F172A] mb-2">Sem Lançamentos Financeiros no Período</h3>
                                            <p className="text-inho-muted text-sm max-w-sm mx-auto">
                                                Não há faturas ou repasses vinculados a esta ficha neste período contábil.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'NOTES' && (
                                <div className="animate-fade-in">
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-lg font-bold text-[#0F172A]">Observações e Anotações da Ficha</h2>
                                    </div>
                                    <div className="p-4 rounded-xl bg-[#F8FAFC] border border-inho-border text-sm text-[#0F172A]">
                                        {notes || 'Nenhuma anotação vinculada a este dossiê.'}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'FILES' && (
                                <div className="animate-fade-in text-center py-12">
                                    <FolderOpen className="mx-auto h-12 w-12 text-inho-muted opacity-50 mb-4" />
                                    <p className="text-inho-muted text-sm font-mono mb-4">Repositório de Documentações da Ficha</p>
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
