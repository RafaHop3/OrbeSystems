'use client';

import { useEffect, useState } from 'react';
import { Calendar, Plus, Loader2, X, Wallet } from 'lucide-react';
import { crmApi, AccountPayableOut } from '@/lib/api';

export default function PayableSchedulePage() {
  const [payables, setPayables] = useState<AccountPayableOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    supplier_name: '',
    description: '',
    amount: '',
    due_date: new Date().toISOString().split('T')[0],
  });

  async function load() {
    setLoading(true);
    try {
      const data = await crmApi.getPayables();
      setPayables(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSchedule(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await crmApi.createPayable({
        supplier_name: form.supplier_name,
        description: `[AGENDADO] ${form.supplier_name} - ${form.description || 'Obrigação Programada'}`,
        amount: Number(form.amount),
        due_date: new Date(form.due_date).toISOString(),
      });
      setIsModalOpen(false);
      setForm({
        supplier_name: '',
        description: '',
        amount: '',
        due_date: new Date().toISOString().split('T')[0],
      });
      await load();
    } catch (err: any) {
      alert(err?.message || 'Erro ao agendar pagamento');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F6F4EE] p-6 lg:p-8 font-sans text-[#0F172A]">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-terminal-border pb-5">
          <div>
            <div className="flex items-center gap-2 text-amber-700 text-xs font-bold uppercase tracking-widest mb-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Pagamentos • Agenda de Obrigações & Repasses
            </div>
            <h1 className="text-2xl font-extrabold tracking-wide flex items-center gap-3">
              Agendar Pagamentos & Repasses
              <Calendar size={22} className="text-amber-700" />
            </h1>
            <p className="text-xs text-[#57606A] mt-1">
              Programe pagamentos a fornecedores, folha de colaboradores e liquidação de sobras/cotas.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/50 text-amber-700 hover:bg-amber-500/25 text-xs font-bold uppercase tracking-wider flex items-center gap-2"
          >
            <Plus size={16} /> Programar Pagamento
          </button>
        </div>

        <div className="bg-white shadow-sm border border-terminal-border rounded-2xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8F2] border-b border-terminal-border text-[#57606A] uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Código</th>
                <th className="px-6 py-4">Favorecido / Descrição</th>
                <th className="px-6 py-4">Data Programada</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Valor Programado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-terminal-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-[#57606A]">
                    <Loader2 className="animate-spin mx-auto mb-2" size={20} /> Carregando programação...
                  </td>
                </tr>
              ) : payables.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[#57606A]">
                    Nenhum pagamento agendado no momento.
                  </td>
                </tr>
              ) : (
                payables.map((p) => (
                  <tr key={p.id} className="hover:bg-[#FAF8F2] transition-colors">
                    <td className="px-6 py-4 text-[#57606A]">{p.id.slice(0, 8).toUpperCase()}</td>
                    <td className="px-6 py-4 font-bold text-[#0F172A] flex items-center gap-2">
                      <Wallet size={14} className="text-amber-700" />
                      {p.description || p.supplier_name || 'Obrigação Financeira'}
                    </td>
                    <td className="px-6 py-4">{new Date(p.due_date).toLocaleDateString('pt-BR')}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 border border-amber-500/30 font-bold text-[10px]">
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-amber-700">
                      - R$ {Number(p.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
            <h2 className="text-base font-bold uppercase tracking-widest text-amber-700 mb-4">
              Programar Novo Pagamento
            </h2>
            <form onSubmit={handleSchedule} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#57606A] mb-1 uppercase">Favorecido / Fornecedor</label>
                <input
                  required
                  value={form.supplier_name}
                  onChange={(e) => setForm({ ...form, supplier_name: e.target.value })}
                  className="w-full bg-[#F6F4EE] border border-terminal-border rounded-xl px-3 py-2.5 text-[#0F172A]"
                />
              </div>
              <div>
                <label className="block text-[#57606A] mb-1 uppercase">Descrição / Centro de Custo</label>
                <input
                  required
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-[#F6F4EE] border border-terminal-border rounded-xl px-3 py-2.5 text-[#0F172A]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#57606A] mb-1 uppercase">Valor (R$)</label>
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
                  <label className="block text-[#57606A] mb-1 uppercase">Data Programada</label>
                  <input
                    required
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    className="w-full bg-[#F6F4EE] border border-terminal-border rounded-xl px-3 py-2.5 text-[#0F172A]"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-amber-400 text-black font-extrabold uppercase tracking-wider"
              >
                {submitting ? 'Agendando...' : 'Agendar Pagamento'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
