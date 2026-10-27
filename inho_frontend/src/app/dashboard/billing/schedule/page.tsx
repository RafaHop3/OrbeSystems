'use client';

import { useEffect, useState } from 'react';
import { Calendar, Plus, Play, Pause, Trash2, Loader2, X, RefreshCw } from 'lucide-react';
import { recurrencesApi, RecurrenceItem } from '@/lib/api';

export default function BillingSchedulePage() {
  const [items, setItems] = useState<RecurrenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    description: '',
    amount: '',
    frequency: 'MONTHLY',
    first_due_date: new Date().toISOString().split('T')[0],
    parcel_total: '12',
    payment_method: 'PIX',
  });

  async function load() {
    setLoading(true);
    try {
      const data = await recurrencesApi.list();
      setItems(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description || !form.amount) return;
    setSubmitting(true);
    try {
      await recurrencesApi.create({
        description: form.description,
        amount: Number(form.amount),
        frequency: form.frequency,
        first_due_date: new Date(form.first_due_date).toISOString(),
        parcel_total: form.parcel_total ? Number(form.parcel_total) : undefined,
        payment_method: form.payment_method,
      });
      setIsModalOpen(false);
      setForm({
        description: '',
        amount: '',
        frequency: 'MONTHLY',
        first_due_date: new Date().toISOString().split('T')[0],
        parcel_total: '12',
        payment_method: 'PIX',
      });
      await load();
    } catch (err: any) {
      alert(err?.message || 'Erro ao agendar recorrência');
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleStatus(item: RecurrenceItem) {
    try {
      if (item.status === 'ACTIVE') {
        await recurrencesApi.pause(item.id);
      } else {
        await recurrencesApi.resume(item.id);
      }
      await load();
    } catch (err: any) {
      alert(err?.message || 'Falha ao atualizar status');
    }
  }

  async function handleCancel(id: string) {
    try {
      await recurrencesApi.cancel(id);
      await load();
    } catch (err: any) {
      alert(err?.message || 'Falha ao cancelar');
    }
  }

  const freqLabel: Record<string, string> = {
    DAILY: 'Diário',
    WEEKLY: 'Semanal',
    MONTHLY: 'Mensal',
    ANNUAL: 'Anual',
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 lg:p-8 font-sans text-[#0F172A]">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-terminal-border pb-5">
          <div>
            <div className="flex items-center gap-2 text-neon-green text-xs font-bold uppercase tracking-widest mb-1">
              <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
              Recebimentos • Motor de Recorrência
            </div>
            <h1 className="text-2xl font-extrabold tracking-wide flex items-center gap-3">
              Agendamento de Recebíveis
              <Calendar size={22} className="text-neon-green" />
            </h1>
            <p className="text-xs text-[#64748B] mt-1">
              Programe mensalidades, cotas de cooperados e cobranças automáticas conectadas à régua OrBrick.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={load}
              className="px-3.5 py-2.5 rounded-xl bg-terminal-surface border border-terminal-border hover:border-neon-green/40 text-xs font-bold flex items-center gap-2"
            >
              <RefreshCw size={14} /> Atualizar
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-neon-green/15 border border-neon-green/50 text-neon-green hover:bg-neon-green/25 text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-[0_0_15px_rgba(57,255,20,0.15)]"
            >
              <Plus size={16} /> Novo Agendamento
            </button>
          </div>
        </div>

        <div className="bg-white shadow-sm border border-terminal-border rounded-2xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F1F5F9] border-b border-terminal-border text-[#64748B] uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Descrição / Contrato</th>
                <th className="px-6 py-4">Periodicidade</th>
                <th className="px-6 py-4">Próx. Vencimento</th>
                <th className="px-6 py-4">Parcela</th>
                <th className="px-6 py-4">Método</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Valor</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-terminal-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-[#64748B]">
                    <Loader2 className="animate-spin mx-auto mb-2" size={20} /> Carregando agendamentos...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-[#64748B]">
                    Nenhum agendamento recorrente cadastrado. Clique em &ldquo;Novo Agendamento&rdquo; para programar cobranças.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F1F5F9] transition-colors">
                    <td className="px-6 py-4 font-bold text-[#0F172A]">{item.description}</td>
                    <td className="px-6 py-4 text-[#64748B]">{freqLabel[item.frequency] || item.frequency}</td>
                    <td className="px-6 py-4">
                      {new Date(item.next_due_date || item.first_due_date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-[#64748B]">
                      {item.parcel_current}/{item.parcel_total || '∞'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30 font-bold text-[10px]">
                        {item.payment_method}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] border ${
                          item.status === 'ACTIVE'
                            ? 'bg-neon-green/10 text-neon-green border-neon-green/30'
                            : item.status === 'PAUSED'
                            ? 'bg-amber-500/10 text-amber-700 border-amber-500/30'
                            : 'bg-red-500/10 text-red-700 border-red-500/30'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-neon-green">
                      R$ {Number(item.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {item.status !== 'CANCELLED' && (
                        <>
                          <button
                            onClick={() => toggleStatus(item)}
                            className="p-1.5 rounded-lg bg-[#F1F5F9] hover:bg-[#F1F5F9] text-neon-cyan border border-terminal-border"
                            title={item.status === 'ACTIVE' ? 'Pausar' : 'Retomar'}
                          >
                            {item.status === 'ACTIVE' ? <Pause size={13} /> : <Play size={13} />}
                          </button>
                          <button
                            onClick={() => handleCancel(item.id)}
                            className="p-1.5 rounded-lg bg-[#F1F5F9] hover:bg-red-500/20 text-red-700 border border-terminal-border"
                            title="Cancelar"
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
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
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-[#64748B] hover:text-[#0F172A]">
              <X size={18} />
            </button>
            <h2 className="text-base font-bold uppercase tracking-widest text-neon-green mb-4">
              Novo Agendamento de Recebível
            </h2>
            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#64748B] mb-1 uppercase">Descrição da Cobrança</label>
                <input
                  required
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Ex: Mensalidade Cooperado / Manutenção"
                  className="w-full bg-[#F8FAFC] border border-terminal-border rounded-xl px-3 py-2.5 text-[#0F172A]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#64748B] mb-1 uppercase">Valor (R$)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="250.00"
                    className="w-full bg-[#F8FAFC] border border-terminal-border rounded-xl px-3 py-2.5 text-[#0F172A]"
                  />
                </div>
                <div>
                  <label className="block text-[#64748B] mb-1 uppercase">1º Vencimento</label>
                  <input
                    required
                    type="date"
                    value={form.first_due_date}
                    onChange={(e) => setForm({ ...form, first_due_date: e.target.value })}
                    className="w-full bg-[#F8FAFC] border border-terminal-border rounded-xl px-3 py-2.5 text-[#0F172A]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#64748B] mb-1 uppercase">Frequência</label>
                  <select
                    value={form.frequency}
                    onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                    className="w-full bg-[#F8FAFC] border border-terminal-border rounded-xl px-2.5 py-2.5 text-[#0F172A]"
                  >
                    <option value="MONTHLY">Mensal</option>
                    <option value="WEEKLY">Semanal</option>
                    <option value="ANNUAL">Anual</option>
                    <option value="DAILY">Diário</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#64748B] mb-1 uppercase">Nº Parcelas</label>
                  <input
                    type="number"
                    value={form.parcel_total}
                    onChange={(e) => setForm({ ...form, parcel_total: e.target.value })}
                    className="w-full bg-[#F8FAFC] border border-terminal-border rounded-xl px-3 py-2.5 text-[#0F172A]"
                  />
                </div>
                <div>
                  <label className="block text-[#64748B] mb-1 uppercase">Método</label>
                  <select
                    value={form.payment_method}
                    onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                    className="w-full bg-[#F8FAFC] border border-terminal-border rounded-xl px-2.5 py-2.5 text-[#0F172A]"
                  >
                    <option value="PIX">PIX</option>
                    <option value="BOLETO">Boleto</option>
                    <option value="CREDIT_CARD">Cartão</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-neon-green text-white font-extrabold uppercase tracking-wider hover:opacity-90 transition-opacity"
              >
                {submitting ? 'Salvando...' : 'Confirmar Agendamento'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
