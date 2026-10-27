'use client';

import { useEffect, useState } from 'react';
import { salesOrdersApi } from '@/lib/api';
import type { SalesOrderOut, SalesOrderCreate, SalesOrderStatus } from '@/types/sales';
import {
    ShoppingCart, Search, Plus, MoreVertical, ShieldCheck,
    CheckCircle2, XCircle, FileText, Ban, ArrowRight, Save, Receipt, Lock
} from 'lucide-react';

// ── Helpers ─────────────────────────────────────────────────────────────
const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const formatDate = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleDateString('pt-BR');
};

// ── Components ──────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: SalesOrderStatus }) => {
    const styles: Record<SalesOrderStatus, string> = {
        DRAFT: 'text-inho-blue bg-inho-blue/10 border-inho-blue/30',
        CONFIRMED: 'text-inho-gold bg-inho-gold/10 border-inho-gold/30',
        INVOICED: 'text-inho-green bg-inho-green/10 border-inho-green/30',
        CANCELLED: 'text-red-700 bg-red-400/10 border-red-400/30',
    };
    const labels: Record<SalesOrderStatus, string> = {
        DRAFT: 'Rascunho',
        CONFIRMED: 'Confirmado',
        INVOICED: 'Faturado',
        CANCELLED: 'Cancelado',
    };

    return (
        <span className={`px-2.5 py-1 rounded-full border text-[10px] uppercase font-bold tracking-wider w-fit ${styles[status]}`}>
            {labels[status]}
        </span>
    );
};

const StateTimeline = ({ currentStatus }: { currentStatus: SalesOrderStatus }) => {
    // Stepper Logic
    const steps = [
        { id: 'DRAFT', label: 'Rascunho' },
        { id: 'CONFIRMED', label: 'Aprovado' },
        { id: 'INVOICED', label: 'NF-e Gerada' },
    ];

    if (currentStatus === 'CANCELLED') {
        return (
            <div className="flex items-center gap-3 p-4 bg-red-400/10 border border-red-500/30 rounded-xl mb-6">
                <Ban size={24} className="text-red-700" />
                <div>
                    <h4 className="text-red-700 font-bold">Pedido Cancelado</h4>
                    <p className="text-red-700/70 text-xs font-mono mt-0.5">Operação interrompida permanentemente.</p>
                </div>
            </div>
        );
    }

    const getStepState = (stepId: string, index: number) => {
        const currentIndex = steps.findIndex(s => s.id === currentStatus);
        if (index < currentIndex) return 'completed';
        if (index === currentIndex) return 'active';
        return 'pending';
    };

    return (
        <div className="flex items-center justify-between mb-8 px-4 relative">
            <div className="absolute left-8 right-8 top-1/2 -translate-y-1/2 h-0.5 bg-inho-border z-0" />

            {steps.map((step, idx) => {
                const state = getStepState(step.id, idx);
                return (
                    <div key={step.id} className="relative z-10 flex flex-col items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${state === 'completed' ? 'bg-inho-green border-inho-green text-white' :
                                state === 'active' ? 'bg-inho-black border-inho-gold text-inho-gold shadow-glow-gold' :
                                    'bg-inho-dark border-inho-border text-inho-muted'
                            }`}>
                            {state === 'completed' ? <CheckCircle2 size={16} /> : <span className="text-xs font-bold">{idx + 1}</span>}
                        </div>
                        <span className={`text-[10px] font-mono uppercase font-bold tracking-wider ${state === 'active' ? 'text-inho-gold' : state === 'completed' ? 'text-inho-text' : 'text-inho-muted'
                            }`}>
                            {step.label}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};


// ── Main Page ─────────────────────────────────────────────────────────

export default function SalesOrdersPage() {
    const [orders, setOrders] = useState<SalesOrderOut[]>([]);
    const [loading, setLoading] = useState(true);

    // Drawer State
    const [isOpen, setIsOpen] = useState(false);
    const [activeOrder, setActiveOrder] = useState<SalesOrderOut | null>(null); // Se true -> Modo Edição. Se false -> Create new DRAFT.

    // Form State
    const [formData, setFormData] = useState<SalesOrderCreate>({
        customer_name: '', customer_doc: '', description: '', amount: 0,
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date().toISOString().split('T')[0],
    });

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const loadOrders = async () => {
        try {
            setLoading(true);
            const data = await salesOrdersApi.list();
            setOrders(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadOrders(); }, []);

    const openNewForm = () => {
        setActiveOrder(null);
        setFormData({
            customer_name: '', customer_doc: '', description: '', amount: 0,
            issue_date: new Date().toISOString().split('T')[0],
            due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        });
        setIsOpen(true);
    };

    const openOrder = (order: SalesOrderOut) => {
        setActiveOrder(order);
        setFormData({
            customer_name: order.customer_name,
            customer_doc: order.customer_doc || '',
            description: order.description || '',
            amount: order.amount,
            issue_date: order.issue_date.split('T')[0],
            due_date: order.due_date.split('T')[0],
        });
        setIsOpen(true);
    };

    // State Machine Actions
    const handleSaveDraft = async (e: React.FormEvent) => {
        e.preventDefault();
        if (activeOrder && activeOrder.status !== 'DRAFT') return;

        setError(''); setSubmitting(true);
        try {
            const payload: SalesOrderCreate = {
                ...formData,
                issue_date: new Date(formData.issue_date).toISOString(),
                due_date: new Date(formData.due_date).toISOString(),
            };

            // The API only has create for drafts. (Update not explicitly defined in api wrapper, 
            // but usually the first save creates the DRAFT in DB).
            // If we don't have activeOrder, we CREATE.
            if (!activeOrder) {
                const newOrder = await salesOrdersApi.create(payload);
                setActiveOrder(newOrder); // Switch to view mode on the new order
            } else {
                // Se fosse pra atualizar usaríamos um PUT /PATCH. Como não tem, apenas mostra erro ou assume imutabilidade até de dar "Create".
                alert('Update ainda não suportado, implementaremos o PATCH.');
            }
            await loadOrders();
        } catch (err: any) {
            setError(err.message || 'Erro ao salvar rascunho.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAction = async (actionId: 'confirm' | 'invoice' | 'cancel') => {
        if (!activeOrder) return;
        setSubmitting(true);
        try {
            if (actionId === 'confirm') {
                const updated = await salesOrdersApi.confirm(activeOrder.id);
                setActiveOrder(updated);
            } else if (actionId === 'invoice') {
                const updated = await salesOrdersApi.invoice(activeOrder.id);
                setActiveOrder(updated);
            } else if (actionId === 'cancel') {
                const updated = await salesOrdersApi.cancel(activeOrder.id);
                setActiveOrder(updated);
            }
            await loadOrders();
        } catch (err: any) {
            setError(err.message || `Erro na transição: ${actionId}`);
        } finally {
            setSubmitting(false);
        }
    };


    // Derived UI Constraints
    const isDraft = !activeOrder || activeOrder.status === 'DRAFT';
    const isCancelled = activeOrder?.status === 'CANCELLED';

    return (
        <div className="min-h-screen bg-inho-black pb-12">
            <header className="sticky top-0 z-10 glassmorphism border-b border-inho-border px-8 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-inho-muted">INHO</span>
                    <span className="text-inho-muted">/</span>
                    <span className="text-inho-text font-bold uppercase tracking-wider">Pedidos de Venda</span>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 lg:px-8 py-10 relative">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-inho-blue/10 border border-inho-blue/20 flex items-center justify-center">
                                <ShoppingCart size={16} className="text-inho-blue" />
                            </div>
                            <span className="text-inho-muted text-[10px] font-mono uppercase tracking-widest">Motor de Vendas</span>
                        </div>
                        <h1 className="text-3xl font-black text-inho-text">Máquina de <span className="text-inho-blue">Pedidos</span></h1>
                        <p className="text-inho-muted text-sm mt-1">Esteira completa: Criação (Draft) até Faturamento (Invoice).</p>
                    </div>

                    <button
                        onClick={openNewForm}
                        className="flex items-center gap-2 px-5 py-2.5 bg-inho-text text-inho-black rounded-xl font-bold text-sm tracking-wide hover:shadow-inho-glow transition-all active:scale-95"
                    >
                        <Plus size={16} />
                        Novo Pedido
                    </button>
                </div>

                {/* Data Grid */}
                <div className="glassmorphism rounded-2xl border border-inho-border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-inho-dark/80 text-inho-muted text-[10px] font-mono uppercase tracking-widest border-b border-inho-border">
                                    <th className="px-6 py-4 font-bold">Resumo / ID</th>
                                    <th className="px-6 py-4 font-bold">Cliente</th>
                                    <th className="px-6 py-4 font-bold">Emissão/Venc.</th>
                                    <th className="px-6 py-4 font-bold text-right">Valor Total</th>
                                    <th className="px-6 py-4 font-bold text-center">Status</th>
                                    <th className="px-6 py-4 font-bold text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-inho-border/50 text-sm">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center">
                                            <div className="inline-block w-6 h-6 border-2 border-inho-blue border-t-transparent rounded-full animate-spin" />
                                        </td>
                                    </tr>
                                ) : orders.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center font-mono text-inho-muted text-xs">
                                            Nenhum pedido de venda registrado na esteira.
                                        </td>
                                    </tr>
                                ) : (
                                    orders.map((o) => (
                                        <tr key={o.id} className="hover:bg-white/[0.02] transition-colors cursor-pointer group" onClick={() => openOrder(o)}>
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-inho-text truncate max-w-[150px]">{o.description || 'Pedido S/ Descrição'}</p>
                                                <p className="text-[10px] font-mono text-inho-muted truncate max-w-[150px]">ID: {o.id}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-inho-text font-medium">{o.customer_name}</p>
                                                {o.customer_doc && <p className="text-[10px] font-mono text-inho-muted">Doc: {o.customer_doc}</p>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-mono text-inho-text">{formatDate(o.issue_date)}</p>
                                                <p className="text-xs text-inho-muted mt-0.5">Até {formatDate(o.due_date)}</p>
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono font-bold text-inho-text">
                                                {formatCurrency(o.amount)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-center">
                                                    <StatusBadge status={o.status} />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-xs text-inho-muted group-hover:text-inho-blue transition-colors underline">Exibir</span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* State Machine Modal / Drawer */}
                {isOpen && (
                    <div className="fixed inset-0 z-50 flex justify-end">
                        <div className="absolute inset-0 bg-white backdrop-blur-sm" onClick={() => !submitting && setIsOpen(false)} />

                        <div className="relative w-full max-w-2xl min-h-screen bg-inho-dark border-l border-inho-border shadow-2xl p-6 lg:p-8 flex flex-col justify-between animate-slide-left overflow-y-auto">

                            <div>
                                <div className="flex justify-between items-start mb-10">
                                    <div>
                                        <h2 className="text-2xl font-black text-inho-text flex items-center gap-2">
                                            {activeOrder ? 'Pedido de Venda' : 'Novo Rascunho Inicial'}
                                        </h2>
                                        <p className="text-xs font-mono text-inho-muted mt-1">ID: {activeOrder?.id || '—'}</p>
                                    </div>
                                    <button onClick={() => !submitting && setIsOpen(false)} className="text-inho-muted hover:text-inho-text bg-[#FAF8F2] p-2 rounded-xl">
                                        <ArrowRight size={20} />
                                    </button>
                                </div>

                                {/* Timeline UI */}
                                {activeOrder && <StateTimeline currentStatus={activeOrder.status} />}

                                {error && (
                                    <div className="mb-6 p-3 bg-red-400/10 border border-red-500/30 rounded-xl text-xs font-mono text-red-700 flex items-center gap-2">
                                        <Ban size={14} /> {error}
                                    </div>
                                )}

                                {/* Imutability Overlay Lock */}
                                {!isDraft && (
                                    <div className="flex items-center gap-2 px-4 py-2 border border-inho-border bg-inho-black rounded-lg mb-6 text-xs text-inho-muted">
                                        <Lock size={14} /> Campos de edição bloqueados por regra de negócio do Status atual.
                                    </div>
                                )}

                                <form id="sales-form" onSubmit={handleSaveDraft} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-mono text-inho-muted uppercase tracking-wider mb-2">Cliente / Empresa</label>
                                            <input
                                                required disabled={!isDraft} value={formData.customer_name} onChange={e => setFormData({ ...formData, customer_name: e.target.value })}
                                                type="text"
                                                className="w-full bg-inho-black border border-inho-border rounded-xl px-4 py-3 text-sm text-inho-text focus:outline-none focus:border-inho-blue/50 disabled:opacity-50 disabled:bg-inho-dark"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-mono text-inho-muted uppercase tracking-wider mb-2">Doc (CNPJ/CPF)</label>
                                            <input
                                                disabled={!isDraft} value={formData.customer_doc} onChange={e => setFormData({ ...formData, customer_doc: e.target.value })}
                                                type="text"
                                                className="w-full bg-inho-black border border-inho-border rounded-xl px-4 py-3 text-sm text-inho-text focus:outline-none focus:border-inho-blue/50 disabled:opacity-50 disabled:bg-inho-dark"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-mono text-inho-muted uppercase tracking-wider mb-2">Valor Total Bruto</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-inho-muted font-mono">R$</span>
                                                <input
                                                    required min="0.01" step="0.01" disabled={!isDraft}
                                                    value={formData.amount || ''} onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                                                    type="number"
                                                    className="w-full bg-inho-black border border-inho-border rounded-xl pl-10 pr-4 py-3 text-sm text-inho-text font-mono focus:outline-none focus:border-inho-blue/50 disabled:opacity-50 disabled:bg-inho-dark"
                                                />
                                            </div>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-mono text-inho-muted uppercase tracking-wider mb-2">Descrição Curta (Opcional)</label>
                                            <input
                                                disabled={!isDraft} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                                                type="text" placeholder="Ex: Licença Anual SaaS Módulo Avançado"
                                                className="w-full bg-inho-black border border-inho-border rounded-xl px-4 py-3 text-sm text-inho-text focus:outline-none focus:border-inho-blue/50 disabled:opacity-50 disabled:bg-inho-dark"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-mono text-inho-muted uppercase tracking-wider mb-2">Emissão Inicial</label>
                                            <input
                                                required disabled={!isDraft} value={formData.issue_date} onChange={e => setFormData({ ...formData, issue_date: e.target.value })}
                                                type="date"
                                                className="w-full bg-inho-black border border-inho-border rounded-xl px-4 py-3 text-sm text-inho-muted font-mono calendar-picker-indicator-white disabled:opacity-50 disabled:bg-inho-dark"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-mono text-inho-muted uppercase tracking-wider mb-2">Vencimento Deste Pedido</label>
                                            <input
                                                required disabled={!isDraft} value={formData.due_date} onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                                                type="date"
                                                className="w-full bg-inho-black border border-inho-border rounded-xl px-4 py-3 text-sm text-inho-muted font-mono calendar-picker-indicator-white disabled:opacity-50 disabled:bg-inho-dark"
                                            />
                                        </div>
                                    </div>
                                </form>

                                {/* Fiscal Block View Mode if Invoiced */}
                                {activeOrder?.status === 'INVOICED' && (
                                    <div className="mt-8 p-5 border border-inho-green/30 bg-inho-green/5 rounded-xl border-dashed">
                                        <h4 className="text-inho-green text-sm flex items-center gap-2 font-bold mb-3"><Receipt size={16} /> Dados Fiscais da NF-e Emitida</h4>
                                        <p className="text-xs text-inho-muted font-mono">Chave de Acesso:</p>
                                        <p className="text-sm text-inho-text font-mono mb-2 bg-inho-black p-2 rounded truncate">{activeOrder.nfe_key || '4321_MOCKED_NFE_KEY_GENERATED_BY_LAMBDA_API_1234'}</p>
                                        <p className="text-xs text-inho-muted font-mono mt-4">Status SEFAZ:</p>
                                        <p className="text-sm font-bold text-inho-green font-mono">{activeOrder.nfe_status || 'AUTORIZADA'}</p>
                                    </div>
                                )}
                            </div>

                            {/* Action Bar Condicional */}
                            <div className="pt-6 border-t border-inho-border flex flex-col gap-3 mt-10">
                                {/* 1. DRAFT Actions */}
                                {!activeOrder && (
                                    <button type="submit" form="sales-form" disabled={submitting} className="w-full py-3 bg-inho-text text-inho-black rounded-xl font-bold flex justify-center gap-2">
                                        Criar Novo Pedido <Plus size={18} />
                                    </button>
                                )}

                                {activeOrder?.status === 'DRAFT' && (
                                    <div className="flex gap-3">
                                        <button onClick={() => handleAction('cancel')} disabled={submitting} className="flex-1 py-3 bg-rinho-dark text-red-500 border border-red-500/20 rounded-xl font-bold hover:bg-red-500/10">Cancelar (Drop)</button>
                                        <button onClick={() => handleAction('confirm')} disabled={submitting} className="flex-2 w-full py-3 bg-inho-blue text-[#0F172A] rounded-xl font-bold flex justify-center gap-2 hover:bg-blue-400 shadow-lg shadow-inho-blue/20">
                                            Aprovar Venda (Firmar) <CheckCircle2 size={18} />
                                        </button>
                                    </div>
                                )}

                                {/* 2. CONFIRMED Actions */}
                                {activeOrder?.status === 'CONFIRMED' && (
                                    <div className="flex gap-3">
                                        <button onClick={() => handleAction('cancel')} disabled={submitting} className="flex-1 py-3 bg-rinho-dark text-red-500 border border-red-500/20 rounded-xl font-bold hover:bg-red-500/10 hover:border-red-500">Cancelar Venda</button>
                                        <button onClick={() => handleAction('invoice')} disabled={submitting} className="flex-2 w-full py-3 bg-inho-green text-white rounded-xl font-bold flex justify-center gap-2 hover:bg-emerald-400 shadow-lg shadow-inho-green/20">
                                            Faturar / NF-e <Receipt size={18} />
                                        </button>
                                    </div>
                                )}

                                {/* 3. INVOICED Actions */}
                                {activeOrder?.status === 'INVOICED' && (
                                    <div className="flex gap-3">
                                        <button className="w-full flex-1 py-3 text-inho-text border border-inho-border rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-[#FAF8F2] opacity-80 cursor-not-allowed">
                                            Baixar XML (em breve) <FileText size={16} />
                                        </button>
                                        <button className="w-full flex-1 py-3 text-inho-text border border-inho-border rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-[#FAF8F2] opacity-80 cursor-not-allowed">
                                            Visualizar DANFE
                                        </button>
                                    </div>
                                )}

                                {/* 4. CANCELLED Actions */}
                                {isCancelled && (
                                    <button onClick={() => setIsOpen(false)} className="w-full py-3 bg-inho-dark text-inho-muted border border-inho-border rounded-xl font-bold hover:text-inho-text">
                                        Fechar e Retornar
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
