'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  ShieldCheck,
  Trash2,
  CalendarClock,
  X,
} from 'lucide-react';
import { crmApi, categoriesApi, AccountPayableOut, AccountCategoryItem } from '@/lib/api';

const fmtCurrency = (val: number | string) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val || 0));

export default function PayablePage() {
  const [payables, setPayables] = useState<AccountPayableOut[]>([]);
  const [categories, setCategories] = useState<AccountCategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'OPEN' | 'PAID'>('ALL');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal Nova Despesa
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    supplier_name: '',
    description: '',
    document: '',
    amount: '',
    due_date: new Date().toISOString().split('T')[0],
    payment_method: 'PIX',
    category_id: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [payData, catData] = await Promise.all([
        crmApi.getPayables(),
        categoriesApi.list().catch(() => []),
      ]);
      setPayables(Array.isArray(payData) ? payData : []);
      setCategories(Array.isArray(catData) ? catData : []);
    } catch (err) {
      console.error('Erro ao carregar contas a pagar:', err);
      setPayables([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const isOverdue = (p: AccountPayableOut) => {
    if (p.status === 'PAID' || p.status === 'CANCELLED') return false;
    if (p.status === 'OVERDUE') return true;
    const due = new Date(p.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  };

  const pendingTotal = payables
    .filter((p) => p.status === 'PENDING' && !isOverdue(p))
    .reduce((acc, p) => acc + Number(p.amount || 0), 0);

  const overdueTotal = payables
    .filter((p) => isOverdue(p))
    .reduce((acc, p) => acc + Number(p.amount || 0), 0);

  const paidTotal = payables
    .filter((p) => p.status === 'PAID')
    .reduce((acc, p) => acc + Number(p.amount || 0), 0);

  const filteredPayables = payables.filter((p) => {
    if (activeTab === 'OPEN' && p.status === 'PAID') return false;
    if (activeTab === 'PAID' && p.status !== 'PAID') return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const text = `${p.description || ''} ${p.supplier_name || ''} ${p.notes || ''}`.toLowerCase();
      if (!text.includes(q)) return false;
    }
    return true;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) return;
    setSubmitting(true);
    try {
      await crmApi.createPayable({
        supplier_name: form.supplier_name.trim(),
        description: form.description.trim() || 'Despesa Operacional',
        document: form.document.trim() || undefined,
        amount: Number(form.amount),
        due_date: form.due_date,
        payment_method: form.payment_method,
        category_id: form.category_id || undefined,
      });
      setShowModal(false);
      setForm({
        supplier_name: '',
        description: '',
        document: '',
        amount: '',
        due_date: new Date().toISOString().split('T')[0],
        payment_method: 'PIX',
        category_id: '',
      });
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Erro ao lançar despesa.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await crmApi.approvePayable(id);
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Erro ao aprovar alçada da despesa.');
    }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      await crmApi.updatePayable(id, { status: 'PAID' });
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Erro ao dar baixa na despesa.');
    }
  };

  const handleBatchSettle = async () => {
    if (selectedIds.length === 0) return;
    try {
      await crmApi.batchSettlePayables(selectedIds);
      setSelectedIds([]);
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Erro ao liquidar despesas em lote.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await crmApi.deletePayable(id);
      setSelectedIds((prev) => prev.filter((i) => i !== id));
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Erro ao remover despesa.');
    }
  };

  const getStatusBadge = (p: AccountPayableOut) => {
    if (p.status === 'PAID') {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-500/10 text-emerald-700 border border-green-500/20 flex items-center gap-1 w-max">
          <CheckCircle2 size={12} /> Pago
        </span>
      );
    }
    if (isOverdue(p)) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-700 border border-red-500/20 flex items-center gap-1 w-max">
          <AlertTriangle size={12} /> Atrasado
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-500/10 text-amber-700 border border-yellow-500/20 flex items-center gap-1 w-max">
        <Clock size={12} /> Pendente
      </span>
    );
  };

  const totalSelectedAmount = payables
    .filter((p) => selectedIds.includes(p.id))
    .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  return (
    <div className="min-h-screen bg-inho-black p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-inho-muted hover:text-[#0F172A] transition-colors bg-inho-dark p-2 rounded-xl"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-[#0F172A] flex items-center gap-2">
                Contas a Pagar
                <FileText size={22} className="text-purple-700" />
              </h1>
              <p className="text-xs text-inho-muted mt-1">
                Centralize fornecedores, repasses a sócios, impostos e despesas operacionais em tempo real.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/payable/schedule"
              className="flex items-center gap-2 bg-[#F1F5F9] border border-[#E2E8F0] hover:border-purple-500/40 text-[#0F172A] font-bold px-3.5 py-2 rounded-xl transition-all text-xs"
            >
              <CalendarClock size={15} className="text-purple-700" /> Agendar Recorrência
            </Link>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-purple-500/20 border border-purple-500 hover:bg-purple-500/30 text-purple-300 font-bold px-4 py-2 rounded-xl transition-all shadow-[0_0_15px_rgba(168,85,247,0.2)] text-xs"
            >
              <Plus size={16} /> Nova Despesa
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glassmorphism p-5 rounded-2xl border border-inho-border relative overflow-hidden">
            <div className="flex gap-2 items-center mb-2">
              <Clock size={16} className="text-amber-700" />
              <p className="text-xs uppercase text-inho-muted font-mono tracking-wider">A Vencer (Em Aberto)</p>
            </div>
            <p className="text-2xl font-black font-mono text-amber-700">{fmtCurrency(pendingTotal)}</p>
          </div>

          <div className="glassmorphism p-5 rounded-2xl border border-red-500/20 relative overflow-hidden">
            <div className="flex gap-2 items-center mb-2">
              <AlertTriangle size={16} className="text-red-700" />
              <p className="text-xs uppercase text-inho-muted font-mono tracking-wider">Despesas Atrasadas</p>
            </div>
            <p className="text-2xl font-black font-mono text-red-700">{fmtCurrency(overdueTotal)}</p>
          </div>

          <div className="glassmorphism p-5 rounded-2xl border border-inho-border relative overflow-hidden">
            <div className="flex gap-2 items-center mb-2">
              <CheckCircle2 size={16} className="text-emerald-700" />
              <p className="text-xs uppercase text-inho-muted font-mono tracking-wider">Total Liquidado (Pago)</p>
            </div>
            <p className="text-2xl font-black font-mono text-emerald-700">{fmtCurrency(paidTotal)}</p>
          </div>
        </div>

        {/* Table Controls */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-inho-dark/50 border border-inho-border p-4 rounded-xl">
          <div className="flex gap-2 w-full md:w-auto">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'ALL'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : 'text-inho-muted hover:text-[#0F172A]'
              }`}
            >
              Todas ({payables.length})
            </button>
            <button
              onClick={() => setActiveTab('OPEN')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'OPEN'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : 'text-inho-muted hover:text-[#0F172A]'
              }`}
            >
              Em Aberto ({payables.filter((p) => p.status !== 'PAID').length})
            </button>
            <button
              onClick={() => setActiveTab('PAID')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'PAID'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : 'text-inho-muted hover:text-[#0F172A]'
              }`}
            >
              Concluídos ({payables.filter((p) => p.status === 'PAID').length})
            </button>
          </div>

          <div className="flex w-full md:w-auto gap-4 items-center">
            <div className="relative flex-grow md:w-72">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-inho-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar fornecedor, descrição ou doc..."
                className="bg-[#F1F5F9] border border-inho-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#0F172A] outline-none focus:border-purple-500 w-full"
              />
            </div>
          </div>
        </div>

        {/* Multi-select ActionBar */}
        {selectedIds.length > 0 && (
          <div className="bg-purple-900/30 border border-purple-500/50 p-4 rounded-xl flex items-center justify-between animate-fade-in shadow-xl backdrop-blur-md">
            <p className="text-sm font-bold text-purple-100 flex items-center gap-2">
              <ShieldCheck size={18} className="text-purple-700" />
              {selectedIds.length} item(s) selecionado(s) — Total:{' '}
              <span className="font-mono text-purple-300">{fmtCurrency(totalSelectedAmount)}</span>
            </p>
            <button
              onClick={handleBatchSettle}
              className="bg-purple-500 hover:bg-purple-400 text-purple-950 font-black px-5 py-2 rounded-lg text-xs transition-colors shadow-glow-purple"
            >
              Liquidar em Lote (PIX/Lote)
            </button>
          </div>
        )}

        {/* Table */}
        <div className="glassmorphism rounded-2xl border border-inho-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-inho-text">
              <thead className="bg-inho-dark border-b border-inho-border text-inho-muted font-mono text-[10px] uppercase tracking-widest">
                <tr>
                  <th className="px-4 py-3 w-10"></th>
                  <th className="px-6 py-3">Fornecedor / Descrição</th>
                  <th className="px-6 py-3">Método</th>
                  <th className="px-6 py-3">Vencimento</th>
                  <th className="px-6 py-3">Valor (R$)</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-inho-border/40">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : filteredPayables.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-inho-muted text-xs">
                      Nenhuma conta a pagar encontrada. Clique em <strong>Nova Despesa</strong> para registrar.
                    </td>
                  </tr>
                ) : (
                  filteredPayables.map((p) => (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(p.id)}
                          onChange={() => toggleSelect(p.id)}
                          className="accent-purple-500 w-4 h-4 rounded border-gray-600 bg-gray-700 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-[#0F172A] text-sm">
                          {p.description || p.supplier_name || 'Despesa Operacional'}
                        </p>
                        {p.notes && <p className="text-xs text-inho-muted font-mono mt-0.5">{p.notes}</p>}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#F1F5F9] border border-[#E2E8F0] text-[#0F172A]">
                          {p.payment_method || 'PIX'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-[#0F172A]">
                        {new Date(p.due_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                      </td>
                      <td className="px-6 py-4 font-bold font-mono text-[#0F172A]">{fmtCurrency(p.amount)}</td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {getStatusBadge(p)}
                          {Number(p.amount) >= 5000 && p.status !== 'PAID' && (
                            p.payment_account?.includes('APPROVED') ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-700 border border-blue-500/20">
                                <ShieldCheck size={10} /> Alçada Aprovada
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-800 border border-amber-500/30">
                                <ShieldCheck size={10} /> Exige Alçada
                              </span>
                            )
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {p.status !== 'PAID' && Number(p.amount) >= 5000 && !p.payment_account?.includes('APPROVED') && (
                          <button
                            onClick={() => handleApprove(p.id)}
                            className="text-xs font-bold bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 text-amber-800 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1 shadow-sm"
                            title="Aprovar Alçada (> R$ 5.000,00)"
                          >
                            <ShieldCheck size={13} /> Aprovar
                          </button>
                        )}
                        {p.status !== 'PAID' && (
                          <button
                            onClick={() => handleMarkPaid(p.id)}
                            className="text-xs font-bold bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 text-emerald-800 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1 shadow-sm"
                          >
                            <CheckCircle2 size={13} /> Dar Baixa
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="text-xs text-gray-500 hover:text-red-700 p-1.5 rounded-lg transition-colors inline-flex items-center"
                          title="Excluir despesa"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Nova Despesa */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                  <FileText size={18} className="text-purple-700" />
                  Nova Conta a Pagar
                </h2>
                <button onClick={() => setShowModal(false)} className="text-[#64748B] hover:text-[#0F172A]">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[#64748B] block mb-1">Fornecedor / Favorecido *</label>
                    <input
                      type="text"
                      required
                      value={form.supplier_name}
                      onChange={(e) => setForm({ ...form, supplier_name: e.target.value })}
                      placeholder="Ex: AWS Brasil / Cooperado"
                      className="w-full bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs text-[#0F172A] outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#64748B] block mb-1">CPF / CNPJ / Documento</label>
                    <input
                      type="text"
                      value={form.document}
                      onChange={(e) => setForm({ ...form, document: e.target.value })}
                      placeholder="00.000.000/0001-00"
                      className="w-full bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs text-[#0F172A] outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-[#64748B] block mb-1">Descrição da Despesa *</label>
                  <input
                    type="text"
                    required
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Ex: Servidores Cloud Outubro / Liquidação Cotas"
                    className="w-full bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs text-[#0F172A] outline-none focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-[#64748B] block mb-1">Valor (R$) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      placeholder="450.00"
                      className="w-full bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs text-[#0F172A] outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#64748B] block mb-1">Vencimento *</label>
                    <input
                      type="date"
                      required
                      value={form.due_date}
                      onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                      className="w-full bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs text-[#0F172A] outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#64748B] block mb-1">Meio de Pagamento</label>
                    <select
                      value={form.payment_method}
                      onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                      className="w-full bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs text-[#0F172A] outline-none focus:border-purple-500"
                    >
                      <option value="PIX">PIX</option>
                      <option value="BOLETO">Boleto</option>
                      <option value="TRANSFER">TED / Transferência</option>
                      <option value="CREDIT_CARD">Cartão Corporativo</option>
                    </select>
                  </div>
                </div>

                {categories.length > 0 && (
                  <div>
                    <label className="text-xs text-[#64748B] block mb-1">Categoria (Plano de Contas)</label>
                    <select
                      value={form.category_id}
                      onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                      className="w-full bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs text-[#0F172A] outline-none focus:border-purple-500"
                    >
                      <option value="">Sem categoria específica</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.type})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-xl text-xs text-[#64748B] hover:text-[#0F172A]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-purple-500 hover:bg-purple-400 text-purple-950 font-black px-5 py-2 rounded-xl text-xs transition-all"
                  >
                    {submitting ? 'Salvando...' : 'Registrar Despesa'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
