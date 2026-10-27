'use client';

import { useEffect, useState } from 'react';
import { Receipt, Plus, Send, CheckCircle2, Copy, Loader2, X } from 'lucide-react';
import { billingApi, BillingInvoice } from '@/lib/api';

export default function BoletosPage() {
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    customer_name: '',
    customer_doc: '',
    customer_phone: '',
    amount: '',
    due_date: new Date().toISOString().split('T')[0],
    description: '',
    payment_method: 'BOLETO',
  });

  async function load() {
    setLoading(true);
    try {
      const data = await billingApi.list();
      setInvoices(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleEmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await billingApi.create({
        customer_name: form.customer_name,
        customer_doc: form.customer_doc || undefined,
        customer_phone: form.customer_phone || undefined,
        amount: Number(form.amount),
        due_date: new Date(form.due_date).toISOString(),
        description: form.description || 'Emissão de Boleto Registrado / PIX Híbrido',
        payment_method: form.payment_method,
      });
      setIsModalOpen(false);
      setForm({
        customer_name: '',
        customer_doc: '',
        customer_phone: '',
        amount: '',
        due_date: new Date().toISOString().split('T')[0],
        description: '',
        payment_method: 'BOLETO',
      });
      await load();
    } catch (err: any) {
      alert(err?.message || 'Erro ao emitir boleto');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleNotifyWhatsApp(id: string) {
    try {
      await billingApi.notifyWhatsApp(id);
      alert('Cobrança disparada via OrBrick WhatsApp com sucesso!');
      await load();
    } catch (err: any) {
      alert(err?.message || 'Falha ao enviar lembrete WhatsApp');
    }
  }

  async function handleMarkPaid(id: string) {
    try {
      await billingApi.updateStatus(id, 'PAID');
      await load();
    } catch (err: any) {
      alert(err?.message || 'Erro ao liquidar título');
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 lg:p-8 font-sans text-[#0F172A]">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-terminal-border pb-5">
          <div>
            <div className="flex items-center gap-2 text-neon-green text-xs font-bold uppercase tracking-widest mb-1">
              <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
              Recebimentos • Boletos & PIX Híbrido
            </div>
            <h1 className="text-2xl font-extrabold tracking-wide flex items-center gap-3">
              Central de Boletos Bancários
              <Receipt size={22} className="text-neon-cyan" />
            </h1>
            <p className="text-xs text-[#64748B] mt-1">
              Emissão de boletos registrados com QR Code PIX embutido e envio direto pela régua do OrBrick.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-neon-cyan/15 border border-neon-cyan/50 text-neon-cyan hover:bg-neon-cyan/25 text-xs font-bold uppercase tracking-wider flex items-center gap-2"
          >
            <Plus size={16} /> Emitir Boleto / PIX
          </button>
        </div>

        <div className="bg-white shadow-sm border border-terminal-border rounded-2xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F1F5F9] border-b border-terminal-border text-[#64748B] uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Nosso Número / ID</th>
                <th className="px-6 py-4">Sacado (Cliente / Sócio)</th>
                <th className="px-6 py-4">Vencimento</th>
                <th className="px-6 py-4">Modalidade</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Valor</th>
                <th className="px-6 py-4 text-right">Ações Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-terminal-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-[#64748B]">
                    <Loader2 className="animate-spin mx-auto mb-2" size={20} /> Carregando títulos...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-[#64748B]">
                    Nenhum título emitido. Clique em &ldquo;Emitir Boleto / PIX&rdquo; acima.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#F1F5F9] transition-colors">
                    <td className="px-6 py-4 text-[#64748B]">{inv.id.slice(0, 8).toUpperCase()}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-[#0F172A]">{inv.customer_name}</div>
                      <div className="text-[10px] text-[#64748B]">{inv.customer_doc || inv.customer_phone || '---'}</div>
                    </td>
                    <td className="px-6 py-4">{new Date(inv.due_date).toLocaleDateString('pt-BR')}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded bg-neon-blue/10 text-neon-blue border border-neon-blue/30 font-bold text-[10px]">
                        {inv.payment_method}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] border ${
                          inv.status === 'PAID'
                            ? 'bg-neon-green/10 text-neon-green border-neon-green/30'
                            : inv.status === 'OVERDUE'
                            ? 'bg-red-500/10 text-red-700 border-red-500/30'
                            : 'bg-amber-500/10 text-amber-700 border-amber-500/30'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-[#0F172A]">
                      R$ {Number(inv.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {inv.pix_code && (
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(inv.pix_code!);
                            alert('Linha digitável / Copia e Cola copiado!');
                          }}
                          className="p-1.5 rounded-lg bg-[#F1F5F9] hover:bg-[#F1F5F9] text-neon-cyan border border-terminal-border"
                          title="Copiar Linha Digitável / PIX"
                        >
                          <Copy size={13} />
                        </button>
                      )}
                      <button
                        onClick={() => handleNotifyWhatsApp(inv.id)}
                        className="p-1.5 rounded-lg bg-[#F1F5F9] hover:bg-neon-green/20 text-neon-green border border-terminal-border"
                        title="Enviar via WhatsApp (OrBrick)"
                      >
                        <Send size={13} />
                      </button>
                      {inv.status !== 'PAID' && (
                        <button
                          onClick={() => handleMarkPaid(inv.id)}
                          className="p-1.5 rounded-lg bg-[#F1F5F9] hover:bg-neon-cyan/20 text-neon-cyan border border-terminal-border"
                          title="Dar Baixa Manual"
                        >
                          <CheckCircle2 size={13} />
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
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-[#64748B] hover:text-[#0F172A]">
              <X size={18} />
            </button>
            <h2 className="text-base font-bold uppercase tracking-widest text-neon-cyan mb-4">
              Emitir Boleto / PIX Híbrido
            </h2>
            <form onSubmit={handleEmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#64748B] mb-1 uppercase">Sacado (Nome / Razão Social)</label>
                <input
                  required
                  value={form.customer_name}
                  onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                  className="w-full bg-[#F8FAFC] border border-terminal-border rounded-xl px-3 py-2.5 text-[#0F172A]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#64748B] mb-1 uppercase">CPF / CNPJ</label>
                  <input
                    value={form.customer_doc}
                    onChange={(e) => setForm({ ...form, customer_doc: e.target.value })}
                    className="w-full bg-[#F8FAFC] border border-terminal-border rounded-xl px-3 py-2.5 text-[#0F172A]"
                  />
                </div>
                <div>
                  <label className="block text-[#64748B] mb-1 uppercase">WhatsApp (Opcional)</label>
                  <input
                    value={form.customer_phone}
                    onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                    placeholder="51999999999"
                    className="w-full bg-[#F8FAFC] border border-terminal-border rounded-xl px-3 py-2.5 text-[#0F172A]"
                  />
                </div>
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
                    className="w-full bg-[#F8FAFC] border border-terminal-border rounded-xl px-3 py-2.5 text-[#0F172A]"
                  />
                </div>
                <div>
                  <label className="block text-[#64748B] mb-1 uppercase">Vencimento</label>
                  <input
                    required
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    className="w-full bg-[#F8FAFC] border border-terminal-border rounded-xl px-3 py-2.5 text-[#0F172A]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[#64748B] mb-1 uppercase">Descrição / Instruções</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-[#F8FAFC] border border-terminal-border rounded-xl px-3 py-2.5 text-[#0F172A]"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-neon-cyan text-white font-extrabold uppercase tracking-wider"
              >
                {submitting ? 'Registrando...' : 'Gerar Boleto Registrado'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
