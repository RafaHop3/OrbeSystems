'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, ShoppingCart, Plus, X, CheckCircle2, FileText,
  XCircle, Clock, TrendingUp, BadgeCheck
} from 'lucide-react';
import { salesOrdersApi, accountsApi } from '@/lib/api';

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const COLUMNS = [
  { key: 'DRAFT',     label: 'Rascunho',   border: 'border-inho-border',     dot: 'bg-inho-muted' },
  { key: 'CONFIRMED', label: 'Confirmado', border: 'border-inho-blue/30',    dot: 'bg-inho-blue'  },
  { key: 'INVOICED',  label: 'Faturado',   border: 'border-inho-green/30',   dot: 'bg-inho-green' },
  { key: 'CANCELLED', label: 'Cancelado',  border: 'border-red-400/30',      dot: 'bg-red-400'    },
];

export default function SalesOrdersPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actioning, setActioning] = useState<string | null>(null);
  const [invoicedOrders, setInvoicedOrders] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    account_id: '', customer_name: '', customer_doc: '',
    amount: '', issue_date: new Date().toISOString().split('T')[0],
    due_date: '', description: '',
  });

  useEffect(() => { Promise.all([load(), loadAccounts()]); }, []);

  const load = async () => {
    setLoading(true);
    try { setRecords(await salesOrdersApi.list()); } catch { } finally { setLoading(false); }
  };
  const loadAccounts = async () => {
    try {
      const data = await accountsApi.list();
      setAccounts(data);
      if (data.length) setForm(f => ({ ...f, account_id: data[0].id }));
    } catch { }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setError('');
    try {
      await salesOrdersApi.create({ ...form, amount: parseFloat(form.amount) });
      setShowCreate(false);
      setForm(f => ({ ...f, customer_name: '', customer_doc: '', amount: '', due_date: '', description: '' }));
      await load();
    } catch (err: any) { setError(err.message); } finally { setSubmitting(false); }
  };

  const confirm = async (id: string) => {
    setActioning(id);
    try { await salesOrdersApi.confirm(id); await load(); } catch { } finally { setActioning(null); }
  };

  const invoice = async (id: string) => {
    setActioning(id);
    try {
      await salesOrdersApi.invoice(id);
      setInvoicedOrders(prev => new Set([...prev, id]));
      await load();
    } catch { } finally { setActioning(null); }
  };

  const cancel = async (id: string) => {
    setActioning(id);
    try { await salesOrdersApi.cancel(id); await load(); } catch { } finally { setActioning(null); }
  };

  const kpis = [
    { label: 'Total Pedidos', value: records.length, color: 'text-inho-gold', icon: ShoppingCart },
    { label: 'Confirmados', value: records.filter(r => r.status === 'CONFIRMED').length, color: 'text-inho-blue', icon: CheckCircle2 },
    { label: 'Faturados', value: records.filter(r => r.status === 'INVOICED').length, color: 'text-inho-green', icon: FileText },
    { label: 'Cancelados', value: records.filter(r => r.status === 'CANCELLED').length, color: 'text-red-700', icon: XCircle },
  ];

  const inputCls = 'w-full bg-inho-dark border border-inho-border p-2.5 rounded-lg text-inho-text text-sm focus:border-inho-gold outline-none transition-colors';

  return (
    <div className="min-h-screen bg-inho-black p-6 lg:p-8">
      <div className="max-w-full mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-inho-muted hover:text-inho-text transition-colors p-2 rounded-lg hover:bg-inho-dark">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-2xl font-bold text-inho-text flex items-center gap-2">
              <ShoppingCart size={24} className="text-inho-gold" />
              Pedidos de Venda
            </h1>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-inho-gold text-white font-bold px-5 py-2.5 rounded-xl hover:-translate-y-0.5 transition-transform text-sm"
          >
            <Plus size={16} /> Novo Pedido
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-slide-up">
          {kpis.map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="glassmorphism rounded-2xl p-5 border border-inho-border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-inho-muted text-xs">{label}</p>
                <Icon size={14} className={color} />
              </div>
              <p className={`text-2xl font-black font-mono ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Pipeline Kanban */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-inho-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 animate-slide-up">
            {COLUMNS.map(col => {
              const colItems = records.filter(r => r.status === col.key);
              return (
                <div key={col.key} className={`glassmorphism rounded-2xl border ${col.border} p-4 flex flex-col gap-3 min-h-[400px]`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2 h-2 rounded-full ${col.dot}`} />
                    <h3 className="font-bold text-sm text-inho-text">{col.label}</h3>
                    <span className="ml-auto bg-inho-dark border border-inho-border text-inho-muted text-xs px-2 py-0.5 rounded-full font-mono">{colItems.length}</span>
                  </div>
                  {colItems.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-inho-muted text-xs opacity-50 gap-1">
                      <FileText size={20} />
                      Vazio
                    </div>
                  ) : colItems.map(r => (
                    <div key={r.id} className="bg-inho-dark/60 border border-inho-border rounded-xl p-4 hover:border-inho-gold/30 transition-colors">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-mono text-[10px] text-inho-muted">#{r.id?.slice(0, 8)?.toUpperCase()}</p>
                        {invoicedOrders.has(r.id) && (
                          <span className="flex items-center gap-1 text-[10px] bg-green-500/20 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                            <BadgeCheck size={10} /> AUTHORIZED
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-inho-text text-sm truncate">{r.customer_name}</p>
                      <p className="font-mono font-black text-inho-gold text-base mt-1">{fmt(r.amount ?? 0)}</p>
                      {r.due_date && (
                        <p className="text-inho-muted text-[10px] mt-1 font-mono flex items-center gap-1">
                          <Clock size={10} /> {new Date(r.due_date).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                      {invoicedOrders.has(r.id) && (
                        <div className="mt-2 p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                          <p className="text-[9px] text-emerald-700 font-mono break-all">
                            Chave: {r.id?.replace(/-/g, '').padEnd(44, '0').slice(0, 44)}
                          </p>
                        </div>
                      )}
                      <div className="flex gap-1.5 mt-3 flex-wrap">
                        {r.status === 'DRAFT' && (
                          <>
                            <button
                              onClick={() => confirm(r.id)}
                              disabled={actioning === r.id}
                              className="flex items-center gap-1 text-[10px] bg-inho-blue/10 text-inho-blue border border-inho-blue/20 px-2 py-1 rounded-lg hover:bg-inho-blue/20 transition-colors font-semibold disabled:opacity-50"
                            >
                              <CheckCircle2 size={10} /> Confirmar
                            </button>
                            <button
                              onClick={() => cancel(r.id)}
                              disabled={actioning === r.id}
                              className="flex items-center gap-1 text-[10px] bg-red-500/10 text-red-700 border border-red-500/20 px-2 py-1 rounded-lg hover:bg-red-500/20 transition-colors font-semibold disabled:opacity-50"
                            >
                              <XCircle size={10} /> Cancelar
                            </button>
                          </>
                        )}
                        {r.status === 'CONFIRMED' && (
                          <button
                            onClick={() => invoice(r.id)}
                            disabled={actioning === r.id}
                            className="flex items-center gap-1 text-[10px] bg-green-500/10 text-emerald-700 border border-green-500/20 px-2 py-1 rounded-lg hover:bg-green-500/20 transition-colors font-semibold disabled:opacity-50"
                          >
                            <TrendingUp size={10} /> Emitir NF-e
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal – Novo Pedido */}
      {showCreate && (
        <div className="fixed inset-0 bg-white backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glassmorphism rounded-2xl p-8 border border-inho-gold/20 w-full max-w-lg animate-slide-up overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-inho-text flex items-center gap-2">
                <Plus size={18} className="text-inho-gold" /> Novo Pedido de Venda
              </h2>
              <button onClick={() => setShowCreate(false)} className="text-inho-muted hover:text-inho-text transition-colors"><X size={20} /></button>
            </div>
            {error && <div className="text-red-700 text-xs mb-4 p-3 bg-red-400/10 rounded-lg border border-red-400/20">{error}</div>}
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div>
                <label className="text-inho-muted text-xs mb-1 block">Conta</label>
                <select value={form.account_id} onChange={e => setForm({ ...form, account_id: e.target.value })} className={inputCls}>
                  <option value="">Selecione...</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>...{a.id.slice(-6)} ({a.currency})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-inho-muted text-xs mb-1 block">Cliente</label>
                  <input type="text" value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} placeholder="Nome do cliente" className={inputCls} required />
                </div>
                <div>
                  <label className="text-inho-muted text-xs mb-1 block">CPF/CNPJ</label>
                  <input type="text" value={form.customer_doc} onChange={e => setForm({ ...form, customer_doc: e.target.value })} placeholder="000.000.000-00" className={inputCls} />
                </div>
              </div>
              <div>
                <label className="text-inho-muted text-xs mb-1 block">Valor (R$)</label>
                <input type="number" step="0.01" min="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0,00" className={inputCls} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-inho-muted text-xs mb-1 block">Data Emissão</label>
                  <input type="date" value={form.issue_date} onChange={e => setForm({ ...form, issue_date: e.target.value })} className={`${inputCls} [color-scheme:dark]`} required />
                </div>
                <div>
                  <label className="text-inho-muted text-xs mb-1 block">Data Vencimento</label>
                  <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} className={`${inputCls} [color-scheme:dark]`} required />
                </div>
              </div>
              <div>
                <label className="text-inho-muted text-xs mb-1 block">Descrição (opcional)</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Detalhes do pedido..." className={`${inputCls} resize-none h-20`} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-3 rounded-xl border border-inho-border text-inho-muted hover:text-inho-text transition-colors text-sm font-semibold">Cancelar</button>
                <button disabled={submitting} className="flex-1 py-3 rounded-xl bg-inho-gold text-white font-bold hover:-translate-y-0.5 transition-transform disabled:opacity-50 text-sm">
                  {submitting ? 'Criando...' : 'Criar Pedido'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
