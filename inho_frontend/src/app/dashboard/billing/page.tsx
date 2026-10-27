'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, BellRing, Plus, CheckCircle2, Clock, AlertTriangle,
    QrCode, Copy, Send, Mail, DollarSign, Search, ShieldCheck, X, Check,
    Smartphone, Filter
} from 'lucide-react';
import { billingApi, type BillingInvoice, type BillingStats } from '@/lib/api';

const fmtCurrency = (val: number | string) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val));

const fmtDate = (iso: string) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('pt-BR');
};

export default function BillingPage() {
    const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
    const [stats, setStats] = useState<BillingStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<string>('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    // Modals & Drawers
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [activePixInvoice, setActivePixInvoice] = useState<BillingInvoice | null>(null);
    const [copiedPix, setCopiedPix] = useState(false);
    const [notifyingId, setNotifyingId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [batchSettling, setBatchSettling] = useState(false);

    // New Invoice Form
    const [form, setForm] = useState({
        customer_name: '',
        customer_phone: '',
        customer_email: '',
        customer_doc: '',
        amount: '',
        due_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
        payment_method: 'PIX',
        description: '',
    });

    const loadData = async () => {
        setLoading(true);
        try {
            const [invList, statData] = await Promise.all([
                billingApi.list(),
                billingApi.getStats(),
            ]);
            setInvoices(invList);
            setStats(statData);
        } catch (e) {
            console.error('Erro ao carregar dados de cobranças', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setFormError('');
        try {
            await billingApi.create({
                ...form,
                amount: parseFloat(form.amount),
                due_date: new Date(form.due_date).toISOString(),
            });
            setShowCreateModal(false);
            setForm({
                customer_name: '',
                customer_phone: '',
                customer_email: '',
                customer_doc: '',
                amount: '',
                due_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
                payment_method: 'PIX',
                description: '',
            });
            await loadData();
        } catch (err: any) {
            setFormError(err.message || 'Erro ao criar cobrança');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSendWhatsApp = async (inv: BillingInvoice) => {
        setNotifyingId(inv.id);
        try {
            const result = await billingApi.notifyWhatsApp(inv.id);
            if (result.whatsapp_url) {
                window.open(result.whatsapp_url, '_blank');
            }
            await loadData();
        } catch (e) {
            alert('Erro ao gerar aviso via WhatsApp');
        } finally {
            setNotifyingId(null);
        }
    };

    const handleSendEmail = async (inv: BillingInvoice) => {
        setNotifyingId(inv.id);
        try {
            await billingApi.notifyEmail(inv.id);
            alert(`Aviso por E-mail enviado com sucesso para ${inv.customer_email || inv.customer_name}!`);
            await loadData();
        } catch (e) {
            alert('Erro ao enviar e-mail de cobrança');
        } finally {
            setNotifyingId(null);
        }
    };

    const handleMarkAsPaid = async (invId: string) => {
        try {
            await billingApi.updateStatus(invId, 'PAID');
            await loadData();
        } catch (e) {
            alert('Erro ao atualizar status');
        }
    };

    const handleWebhookSettle = async (inv: BillingInvoice) => {
        setNotifyingId(inv.id);
        try {
            const idemKey = `wh-ui-${inv.id}`;
            const res = await billingApi.simulateBankWebhook(
                'CORA',
                { invoice_id: inv.id, status: 'PAID', payment_method: inv.payment_method || 'PIX', amount: Number(inv.amount) },
                idemKey
            );
            alert(`Webhook Bancário (${res.provider}) processado! Fatura liquidada e comprovante OrBrick WhatsApp disparado.`);
            await loadData();
        } catch (e: any) {
            alert(e?.message || 'Erro ao processar webhook bancário');
        } finally {
            setNotifyingId(null);
        }
    };

    const handleBatchSettle = async () => {
        if (selectedIds.length === 0) return;
        setBatchSettling(true);
        try {
            const sortedKey = [...selectedIds].sort().join('-').slice(0, 80);
            const res = await billingApi.batchSettle(selectedIds, `batch-recv-${sortedKey}`);
            alert(`Baixa em lote concluída: ${res.settled_count} recebíveis liquidados (R$ ${Number(res.total_amount_settled || 0).toFixed(2)}).`);
            setSelectedIds([]);
            await loadData();
        } catch (e: any) {
            alert(e?.message || 'Erro na baixa em lote');
        } finally {
            setBatchSettling(false);
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const copyPixCode = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedPix(true);
        setTimeout(() => setCopiedPix(false), 3000);
    };

    const filteredInvoices = invoices.filter((inv) => {
        const matchesTab =
            activeTab === 'ALL' || inv.status === activeTab;
        const matchesSearch =
            inv.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (inv.customer_email && inv.customer_email.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (inv.description && inv.description.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesTab && matchesSearch;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PAID':
                return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-500/10 text-emerald-700 border border-green-500/20 flex items-center gap-1"><CheckCircle2 size={12} /> Pago</span>;
            case 'OVERDUE':
                return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-700 border border-red-500/20 flex items-center gap-1"><AlertTriangle size={12} /> Atrasado</span>;
            case 'PENDING':
                return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-500/10 text-amber-700 border border-yellow-500/20 flex items-center gap-1"><Clock size={12} /> Pendente</span>;
            default:
                return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-500/10 text-[#64748B] border border-gray-500/20">{status}</span>;
        }
    };

    return (
        <div className="min-h-screen bg-inho-black p-6 lg:p-8 text-inho-text">
            <div className="max-w-full mx-auto">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="text-inho-muted hover:text-inho-text transition-colors p-2 rounded-lg hover:bg-inho-dark">
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold text-[#0F172A] flex items-center gap-3">
                                <BellRing className="text-inho-gold w-8 h-8" />
                                Gestão de Cobranças & Avisos
                            </h1>
                            <p className="text-inho-muted text-sm mt-1">
                                Envie avisos automáticos via WhatsApp e E-mail com QR Code PIX instantâneo.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {selectedIds.length > 0 && (
                            <button
                                onClick={handleBatchSettle}
                                disabled={batchSettling}
                                className="flex items-center gap-2 bg-green-500 text-white font-bold px-4 py-3 rounded-xl hover:bg-emerald-400 transition-colors text-xs"
                            >
                                <CheckCircle2 size={16} />
                                {batchSettling ? 'Liquidando Lote...' : `Baixar Lote (${selectedIds.length})`}
                            </button>
                        )}
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-2 bg-inho-gold text-white font-bold px-5 py-3 rounded-xl hover:-translate-y-0.5 transition-transform text-sm shadow-glow-gold"
                        >
                            <Plus size={18} /> Nova Cobrança
                        </button>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="glassmorphism rounded-2xl p-5 border border-inho-border relative overflow-hidden">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-inho-muted text-xs font-mono uppercase">A Receber (Pendente)</p>
                            <Clock size={18} className="text-amber-700" />
                        </div>
                        <p className="text-2xl font-black font-mono text-amber-700">
                            {fmtCurrency(stats?.pending_amount || 0)}
                        </p>
                    </div>

                    <div className="glassmorphism rounded-2xl p-5 border border-inho-border relative overflow-hidden">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-inho-muted text-xs font-mono uppercase">Em Atraso (Urgente)</p>
                            <AlertTriangle size={18} className="text-red-700" />
                        </div>
                        <p className="text-2xl font-black font-mono text-red-700">
                            {fmtCurrency(stats?.overdue_amount || 0)}
                        </p>
                    </div>

                    <div className="glassmorphism rounded-2xl p-5 border border-inho-border relative overflow-hidden">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-inho-muted text-xs font-mono uppercase">Total Cobrado (Pago)</p>
                            <CheckCircle2 size={18} className="text-emerald-700" />
                        </div>
                        <p className="text-2xl font-black font-mono text-emerald-700">
                            {fmtCurrency(stats?.paid_amount || 0)}
                        </p>
                    </div>

                    <div className="glassmorphism rounded-2xl p-5 border border-inho-border relative overflow-hidden">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-inho-muted text-xs font-mono uppercase">Avisos Disparados</p>
                            <Smartphone size={18} className="text-inho-gold" />
                        </div>
                        <p className="text-2xl font-black font-mono text-inho-gold">
                            {stats?.notifications_sent || 0}
                        </p>
                    </div>
                </div>

                {/* Controls / Filter Bar */}
                <div className="glassmorphism rounded-2xl p-4 border border-inho-border mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    {/* Tabs */}
                    <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
                        {[
                            { id: 'ALL', label: 'Todas' },
                            { id: 'PENDING', label: 'Pendentes' },
                            { id: 'OVERDUE', label: 'Em Atraso' },
                            { id: 'PAID', label: 'Pagas' },
                        ].map((t) => (
                            <button
                                key={t.id}
                                onClick={() => setActiveTab(t.id)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${activeTab === t.id
                                    ? 'bg-inho-gold text-white'
                                    : 'bg-inho-dark text-inho-muted hover:text-[#0F172A] border border-inho-border'
                                    }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Search */}
                    <div className="flex items-center gap-2 bg-inho-dark border border-inho-border rounded-xl px-4 py-2 w-full md:w-72">
                        <Search size={16} className="text-inho-muted" />
                        <input
                            type="text"
                            placeholder="Buscar por cliente ou descrição..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-transparent text-sm text-[#0F172A] outline-none w-full placeholder-inho-muted"
                        />
                    </div>
                </div>

                {/* Table / List */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-8 h-8 border-2 border-inho-gold border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filteredInvoices.length === 0 ? (
                    <div className="glassmorphism rounded-2xl border border-inho-border p-12 text-center text-inho-muted font-mono text-sm">
                        Nenhuma cobrança encontrada para os filtros selecionados.
                    </div>
                ) : (
                    <div className="glassmorphism rounded-2xl border border-inho-border overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-inho-dark text-inho-muted text-[10px] font-mono uppercase tracking-widest border-b border-inho-border">
                                        <th className="px-4 py-4 w-10 text-center">Lote</th>
                                        <th className="px-6 py-4">Cliente</th>
                                        <th className="px-6 py-4">Contatos</th>
                                        <th className="px-6 py-4">Valor</th>
                                        <th className="px-6 py-4">Vencimento</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-center">Avisos</th>
                                        <th className="px-6 py-4 text-right">Ações de Cobrança</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-inho-border/50 text-sm">
                                    {filteredInvoices.map((inv) => (
                                        <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="px-4 py-4 text-center">
                                                {inv.status !== 'PAID' && (
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.includes(inv.id)}
                                                        onChange={() => toggleSelect(inv.id)}
                                                        className="w-4 h-4 accent-amber-400 cursor-pointer"
                                                    />
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-[#0F172A]">{inv.customer_name}</p>
                                                <p className="text-xs text-inho-muted truncate max-w-[200px]">
                                                    {inv.description || 'Cobrança Avulsa'}
                                                </p>
                                                {inv.created_by_name && (
                                                    <span className="inline-block mt-1 text-[10px] font-mono text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                                                        Criado por: {inv.created_by_name}
                                                    </span>
                                                )}
                                            </td>

                                            <td className="px-6 py-4 text-xs font-mono">
                                                <p className="text-inho-muted">{inv.customer_phone || 'S/ Whats'}</p>
                                                <p className="text-gray-500">{inv.customer_email || 'S/ E-mail'}</p>
                                            </td>

                                            <td className="px-6 py-4 font-mono font-bold text-inho-gold">
                                                {fmtCurrency(inv.amount)}
                                            </td>

                                            <td className="px-6 py-4 font-mono text-xs text-[#0F172A]">
                                                {fmtDate(inv.due_date)}
                                            </td>

                                            <td className="px-6 py-4">
                                                {getStatusBadge(inv.status)}
                                            </td>

                                            <td className="px-6 py-4 text-center font-mono text-xs">
                                                <span className="bg-inho-dark border border-inho-border px-2.5 py-1 rounded-full text-inho-gold">
                                                    {inv.notification_count} enviados
                                                </span>
                                            </td>

                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {/* WhatsApp Action */}
                                                    <button
                                                        onClick={() => handleSendWhatsApp(inv)}
                                                        disabled={notifyingId === inv.id}
                                                        className="p-2 rounded-xl bg-green-500/10 text-emerald-700 border border-green-500/20 hover:bg-green-500/20 transition-colors"
                                                        title="Disparar Lembrete por WhatsApp"
                                                    >
                                                        <Send size={16} />
                                                    </button>

                                                    {/* Email Action */}
                                                    <button
                                                        onClick={() => handleSendEmail(inv)}
                                                        disabled={notifyingId === inv.id}
                                                        className="p-2 rounded-xl bg-blue-500/10 text-blue-700 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                                                        title="Disparar Aviso por E-mail"
                                                    >
                                                        <Mail size={16} />
                                                    </button>

                                                    {/* PIX QR Modal Trigger */}
                                                    <button
                                                        onClick={() => setActivePixInvoice(inv)}
                                                        className="p-2 rounded-xl bg-inho-gold/10 text-inho-gold border border-inho-gold/20 hover:bg-inho-gold/20 transition-colors"
                                                        title="Exibir QR Code PIX"
                                                    >
                                                        <QrCode size={16} />
                                                    </button>

                                                    {/* Mark as Paid / Webhook */}
                                                    {inv.status !== 'PAID' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleWebhookSettle(inv)}
                                                                disabled={notifyingId === inv.id}
                                                                className="px-2.5 py-1.5 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/30 font-bold text-xs hover:bg-purple-500/25 transition-colors flex items-center gap-1"
                                                                title="Liquidar via Webhook Bancário (HMAC/Idempotente + Comprovante OrBrick)"
                                                            >
                                                                <ShieldCheck size={14} /> Webhook PIX
                                                            </button>
                                                            <button
                                                                onClick={() => handleMarkAsPaid(inv.id)}
                                                                className="px-3 py-1.5 rounded-xl bg-green-500 text-white font-bold text-xs hover:bg-emerald-400 transition-colors flex items-center gap-1"
                                                            >
                                                                <Check size={14} /> Dar Baixa
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

            </div>

            {/* Modal: Nova Cobrança */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-white backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glassmorphism rounded-2xl p-6 border border-inho-border w-full max-w-lg animate-slide-up">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-[#0F172A] flex items-center gap-2">
                                <Plus className="text-inho-gold" size={20} /> Criar Nova Cobrança
                            </h2>
                            <button onClick={() => setShowCreateModal(false)} className="text-inho-muted hover:text-[#0F172A]">
                                <X size={20} />
                            </button>
                        </div>

                        {formError && (
                            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-700 text-xs rounded-xl">
                                {formError}
                            </div>
                        )}

                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="text-xs text-inho-muted font-mono mb-1 block">Nome do Cliente *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ex: João da Silva / Acme Corp"
                                    value={form.customer_name}
                                    onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                                    className="w-full bg-inho-dark border border-inho-border rounded-xl px-4 py-2.5 text-sm text-[#0F172A] outline-none focus:border-inho-gold"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-inho-muted font-mono mb-1 block">WhatsApp (com DDD)</label>
                                    <input
                                        type="text"
                                        placeholder="5511999999999"
                                        value={form.customer_phone}
                                        onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                                        className="w-full bg-inho-dark border border-inho-border rounded-xl px-4 py-2.5 text-sm text-[#0F172A] outline-none focus:border-inho-gold"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs text-inho-muted font-mono mb-1 block">E-mail</label>
                                    <input
                                        type="email"
                                        placeholder="cliente@email.com"
                                        value={form.customer_email}
                                        onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
                                        className="w-full bg-inho-dark border border-inho-border rounded-xl px-4 py-2.5 text-sm text-[#0F172A] outline-none focus:border-inho-gold"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-inho-muted font-mono mb-1 block">Valor (R$) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        placeholder="150,00"
                                        value={form.amount}
                                        onChange={(e) => setForm({ ...form, amount: e.target.value })}
                                        className="w-full bg-inho-dark border border-inho-border rounded-xl px-4 py-2.5 text-sm text-[#0F172A] outline-none focus:border-inho-gold font-mono"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs text-inho-muted font-mono mb-1 block">Data de Vencimento *</label>
                                    <input
                                        type="date"
                                        required
                                        value={form.due_date}
                                        onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                                        className="w-full bg-inho-dark border border-inho-border rounded-xl px-4 py-2.5 text-sm text-[#0F172A] outline-none focus:border-inho-gold font-mono [color-scheme:dark]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-inho-muted font-mono mb-1 block">Descrição / Serviço</label>
                                <input
                                    type="text"
                                    placeholder="Ex: Mensalidade Consultoria TI"
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    className="w-full bg-inho-dark border border-inho-border rounded-xl px-4 py-2.5 text-sm text-[#0F172A] outline-none focus:border-inho-gold"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 py-3 rounded-xl border border-inho-border text-inho-muted font-semibold hover:text-[#0F172A]"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 py-3 rounded-xl bg-inho-gold text-white font-bold hover:shadow-glow-gold transition-all disabled:opacity-50"
                                >
                                    {submitting ? 'Gerando...' : 'Gerar Cobrança & PIX'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Drawer Modal: PIX QR Code & Copia e Cola */}
            {activePixInvoice && (
                <div className="fixed inset-0 bg-white backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glassmorphism rounded-2xl p-6 border border-inho-gold/30 w-full max-w-md animate-slide-up text-center">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                                <QrCode className="text-inho-gold" size={20} /> Dados do Pagamento PIX
                            </h3>
                            <button onClick={() => setActivePixInvoice(null)} className="text-inho-muted hover:text-[#0F172A]">
                                <X size={20} />
                            </button>
                        </div>

                        <p className="text-xs text-inho-muted mb-2">Cliente: <span className="text-[#0F172A] font-bold">{activePixInvoice.customer_name}</span></p>
                        <p className="text-2xl font-black font-mono text-inho-gold mb-6">{fmtCurrency(activePixInvoice.amount)}</p>

                        {/* QR Code Image */}
                        {activePixInvoice.pix_qr_url && (
                            <div className="bg-white p-4 rounded-2xl inline-block mb-6 shadow-xl">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={activePixInvoice.pix_qr_url} alt="QR Code PIX" className="w-48 h-48 mx-auto" />
                            </div>
                        )}

                        {/* PIX Copy Code */}
                        <div className="bg-inho-dark border border-inho-border rounded-xl p-3 text-left mb-6">
                            <p className="text-[10px] text-inho-muted font-mono uppercase mb-1">Chave PIX Copia e Cola</p>
                            <p className="text-xs font-mono text-[#0F172A] break-all bg-[#F1F5F9] p-2 rounded border border-inho-border">
                                {activePixInvoice.pix_code}
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => copyPixCode(activePixInvoice.pix_code || '')}
                                className="flex-1 py-3 rounded-xl bg-inho-gold text-white font-bold flex items-center justify-center gap-2 hover:shadow-glow-gold"
                            >
                                <Copy size={16} /> {copiedPix ? 'Copiado!' : 'Copiar Chave PIX'}
                            </button>

                            <button
                                onClick={() => {
                                    handleMarkAsPaid(activePixInvoice.id);
                                    setActivePixInvoice(null);
                                }}
                                className="py-3 px-4 rounded-xl bg-green-500/20 text-emerald-700 border border-green-500/30 font-bold hover:bg-green-500/30"
                            >
                                Confirmar Baixa
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
