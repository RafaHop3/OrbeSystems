'use client';

import { useEffect, useState } from 'react';
import { Lock, ShieldCheck, Download, Plus, Loader2, X } from 'lucide-react';
import { accountingApi, MonthCloseItem } from '@/lib/api';

export default function AccountingPage() {
  const [closes, setCloses] = useState<MonthCloseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const now = new Date();
  const [form, setForm] = useState({
    period_year: String(now.getFullYear()),
    period_month: String(now.getMonth() + 1),
  });

  async function load() {
    setLoading(true);
    try {
      const data = await accountingApi.listMonthCloses();
      setCloses(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCloseMonth(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await accountingApi.createMonthClose({
        period_year: Number(form.period_year),
        period_month: Number(form.period_month),
      });
      setIsModalOpen(false);
      await load();
    } catch (err: any) {
      alert(err?.message || 'Erro ao fechar competência');
    } finally {
      setSubmitting(false);
    }
  }

  function handleExportBundle(item: MonthCloseItem) {
    const blob = new Blob([JSON.stringify(item, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fechamento_contabil_${item.period_year}_${String(item.period_month).padStart(2, '0')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 lg:p-8 font-sans text-[#0F172A]">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-terminal-border pb-5">
          <div>
            <div className="flex items-center gap-2 text-neon-cyan text-xs font-bold uppercase tracking-widest mb-1">
              <span className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse" />
              Contabilidade & BI • Portal do Contador & Governança
            </div>
            <h1 className="text-2xl font-extrabold tracking-wide flex items-center gap-3">
              Fechamento Contábil Mensal
              <Lock size={22} className="text-neon-cyan" />
            </h1>
            <p className="text-xs text-[#64748B] mt-1">
              Lacre criptográfico (SHA-256) das competências mensais e exportação auditada para o Contador.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-neon-cyan/15 border border-neon-cyan/50 text-neon-cyan hover:bg-neon-cyan/25 text-xs font-bold uppercase tracking-wider flex items-center gap-2"
          >
            <Plus size={16} /> Lacrar Competência Mensal
          </button>
        </div>

        <div className="bg-white shadow-sm border border-terminal-border rounded-2xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F1F5F9] border-b border-terminal-border text-[#64748B] uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Competência</th>
                <th className="px-6 py-4">Responsável pelo Lacre</th>
                <th className="px-6 py-4">Receitas / Custos</th>
                <th className="px-6 py-4">Hash SHA-256 (Imutável)</th>
                <th className="px-6 py-4">Fechado em</th>
                <th className="px-6 py-4 text-right">Pacote Contador</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-terminal-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-[#64748B]">
                    <Loader2 className="animate-spin mx-auto mb-2" size={20} /> Carregando fechamentos...
                  </td>
                </tr>
              ) : closes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#64748B]">
                    Nenhuma competência lacrada ainda. Clique em &ldquo;Lacrar Competência Mensal&rdquo; para consolidar um mês.
                  </td>
                </tr>
              ) : (
                closes.map((c) => {
                  let summary = { total_revenue: 0, total_cost: 0 };
                  try {
                    summary = JSON.parse(c.summary_json || '{}');
                  } catch {}
                  return (
                    <tr key={c.id} className="hover:bg-[#F1F5F9] transition-colors">
                      <td className="px-6 py-4 font-extrabold text-neon-cyan text-sm">
                        {String(c.period_month).padStart(2, '0')}/{c.period_year}
                      </td>
                      <td className="px-6 py-4 text-[#0F172A]">{c.closed_by_name}</td>
                      <td className="px-6 py-4">
                        <span className="text-neon-green font-bold">
                          +R$ {Number(summary.total_revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>{' '}
                        /{' '}
                        <span className="text-red-700 font-bold">
                          -R$ {Number(summary.total_cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded bg-[#F1F5F9] border border-terminal-border text-[10px] text-[#64748B] inline-flex items-center gap-1.5">
                          <ShieldCheck size={12} className="text-neon-green" />
                          {c.checksum.slice(0, 16)}...
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[#64748B]">
                        {new Date(c.closed_at).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleExportBundle(c)}
                          className="px-3 py-1.5 rounded-lg bg-neon-cyan/15 border border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/25 font-bold text-[10px] uppercase inline-flex items-center gap-1"
                        >
                          <Download size={12} /> Exportar Lote
                        </button>
                      </td>
                    </tr>
                  );
                })
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
              Lacrar Competência Contábil
            </h2>
            <form onSubmit={handleCloseMonth} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#64748B] mb-1 uppercase">Mês (1-12)</label>
                  <input
                    required
                    type="number"
                    min="1"
                    max="12"
                    value={form.period_month}
                    onChange={(e) => setForm({ ...form, period_month: e.target.value })}
                    className="w-full bg-[#F8FAFC] border border-terminal-border rounded-xl px-3 py-2.5 text-[#0F172A]"
                  />
                </div>
                <div>
                  <label className="block text-[#64748B] mb-1 uppercase">Ano</label>
                  <input
                    required
                    type="number"
                    min="2020"
                    max="2035"
                    value={form.period_year}
                    onChange={(e) => setForm({ ...form, period_year: e.target.value })}
                    className="w-full bg-[#F8FAFC] border border-terminal-border rounded-xl px-3 py-2.5 text-[#0F172A]"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-neon-cyan text-white font-extrabold uppercase tracking-wider"
              >
                {submitting ? 'Gerando Checksum SHA-256...' : 'Confirmar Fechamento Imutável'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
