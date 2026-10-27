'use client';

import { useEffect, useState } from 'react';
import { FileCheck, Plus, CheckCircle2, ShoppingCart, Loader2, X } from 'lucide-react';
import { salesOrdersApi } from '@/lib/api';

export default function ProposalsPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    customer_name: '',
    customer_doc: '',
    amount: '',
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    description: '',
  });

  async function load() {
    setLoading(true);
    try {
      const data = await salesOrdersApi.list();
      setOrders(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreateProposal(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const nowIso = new Date().toISOString();
      await salesOrdersApi.create({
        customer_name: form.customer_name,
        customer_doc: form.customer_doc || undefined,
        amount: Number(form.amount),
        issue_date: nowIso,
        due_date: new Date(form.due_date).toISOString(),
        description: `[PROPOSTA] ${form.description || 'Orçamento Comercial'}`,
      });
      setIsModalOpen(false);
      setForm({
        customer_name: '',
        customer_doc: '',
        amount: '',
        due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        description: '',
      });
      await load();
    } catch (err: any) {
      alert(err?.message || 'Erro ao gerar proposta');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove(id: string) {
    try {
      await salesOrdersApi.confirm(id);
      await load();
    } catch (err: any) {
      alert(err?.message || 'Erro ao aprovar proposta');
    }
  }

  async function handleInvoice(id: string) {
    try {
      await salesOrdersApi.invoice(id);
      alert('Proposta faturada e convertida com sucesso!');
      await load();
    } catch (err: any) {
      alert(err?.message || 'Erro ao faturar proposta');
    }
  }

  return (
    <div className="min-h-screen bg-[#F6F4EE] p-6 lg:p-8 font-sans text-[#0F172A]">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-terminal-border pb-5">
          <div>
            <div className="flex items-center gap-2 text-[#e879f9] text-xs font-bold uppercase tracking-widest mb-1">
              <span className="w-2 h-2 rounded-full bg-[#e879f9] animate-pulse" />
              Organização • Propostas & Orçamentos
            </div>
            <h1 className="text-2xl font-extrabold tracking-wide flex items-center gap-3">
              Central de Propostas Comerciais
              <FileCheck size={22} className="text-[#e879f9]" />
            </h1>
            <p className="text-xs text-[#57606A] mt-1">
              Elabore propostas B2B/B2C, aprove orçamentos e converta em Pedidos de Venda / Faturas em 1 clique.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-purple-500/20 border border-purple-500/50 text-[#e879f9] hover:bg-purple-500/30 text-xs font-bold uppercase tracking-wider flex items-center gap-2"
          >
            <Plus size={16} /> Nova Proposta
          </button>
        </div>

        <div className="bg-white shadow-sm border border-terminal-border rounded-2xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8F2] border-b border-terminal-border text-[#57606A] uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Proposta #</th>
                <th className="px-6 py-4">Cliente / Escopo</th>
                <th className="px-6 py-4">Validade</th>
                <th className="px-6 py-4">Estágio</th>
                <th className="px-6 py-4 text-right">Valor Total</th>
                <th className="px-6 py-4 text-right">Conversão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-terminal-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-[#57606A]">
                    <Loader2 className="animate-spin mx-auto mb-2" size={20} /> Carregando propostas...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#57606A]">
                    Nenhuma proposta registrada. Clique em &ldquo;Nova Proposta&rdquo; para criar um orçamento.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="hover:bg-[#FAF8F2] transition-colors">
                    <td className="px-6 py-4 text-[#57606A]">PROP-{o.id.slice(0, 6).toUpperCase()}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-[#0F172A]">{o.customer_name}</div>
                      <div className="text-[10px] text-[#57606A]">{o.description || 'Proposta Comercial'}</div>
                    </td>
                    <td className="px-6 py-4">{new Date(o.due_date).toLocaleDateString('pt-BR')}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] border ${
                          o.status === 'INVOICED'
                            ? 'bg-neon-green/10 text-neon-green border-neon-green/30'
                            : o.status === 'CONFIRMED'
                            ? 'bg-neon-cyan/10 text-neon-cyan border-neon-cyan/30'
                            : 'bg-purple-500/10 text-[#e879f9] border-purple-500/30'
                        }`}
                      >
                        {o.status === 'DRAFT' ? 'EM ANÁLISE' : o.status === 'CONFIRMED' ? 'APROVADA' : o.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-[#0F172A]">
                      R$ {Number(o.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {o.status === 'DRAFT' && (
                        <button
                          onClick={() => handleApprove(o.id)}
                          className="px-3 py-1.5 rounded-lg bg-neon-cyan/15 border border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/25 font-bold text-[10px] uppercase inline-flex items-center gap-1"
                        >
                          <CheckCircle2 size={12} /> Aprovar
                        </button>
                      )}
                      {o.status === 'CONFIRMED' && (
                        <button
                          onClick={() => handleInvoice(o.id)}
                          className="px-3 py-1.5 rounded-lg bg-neon-green/15 border border-neon-green/40 text-neon-green hover:bg-neon-green/25 font-bold text-[10px] uppercase inline-flex items-center gap-1"
                        >
                          <ShoppingCart size={12} /> Faturar Pedido
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white backdrop-blur-sm p-4">
          <div className="bg-white shadow-sm border border-terminal-border rounded-2xl p-6 w-full max-w-md relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-[#57606A] hover:text-[#0F172A]">
              <X size={18} />
            </button>
            <h2 className="text-base font-bold uppercase tracking-widest text-[#e879f9] mb-4">
              Elaborar Proposta Comercial
            </h2>
            <form onSubmit={handleCreateProposal} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#57606A] mb-1 uppercase">Cliente / Cooperado</label>
                <input
                  required
                  value={form.customer_name}
                  onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                  className="w-full bg-[#F6F4EE] border border-terminal-border rounded-xl px-3 py-2.5 text-[#0F172A]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#57606A] mb-1 uppercase">CPF / CNPJ</label>
                  <input
                    value={form.customer_doc}
                    onChange={(e) => setForm({ ...form, customer_doc: e.target.value })}
                    className="w-full bg-[#F6F4EE] border border-terminal-border rounded-xl px-3 py-2.5 text-[#0F172A]"
                  />
                </div>
                <div>
                  <label className="block text-[#57606A] mb-1 uppercase">Validade</label>
                  <input
                    required
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    className="w-full bg-[#F6F4EE] border border-terminal-border rounded-xl px-3 py-2.5 text-[#0F172A]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[#57606A] mb-1 uppercase">Valor Proposto (R$)</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="w-full bg-[#F6F4EE] border border-terminal-border rounded-xl px-3 py-2.5 text-[#0F172A]"
                />
              </div>
              <div>
                <label className="block text-[#57606A] mb-1 uppercase">Escopo / Condições</label>
                <input
                  required
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Ex: Implantação + Mensalidade"
                  className="w-full bg-[#F6F4EE] border border-terminal-border rounded-xl px-3 py-2.5 text-[#0F172A]"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-[#B8860B] text-white font-extrabold uppercase tracking-wider"
              >
                {submitting ? 'Salvando...' : 'Emitir Proposta'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
