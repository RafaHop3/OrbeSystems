'use client';

import { useEffect, useState } from 'react';
import {
  TrendingUp, Plus, Presentation, AlertCircle, CheckCircle2,
  XCircle, ArrowRight, Loader2, X
} from 'lucide-react';
import { dealsApi, CRMDealItem, billingApi } from '@/lib/api';

const STAGES: { id: CRMDealItem['stage']; title: string; badge: string; icon: any }[] = [
  { id: 'PROSPECTING', title: 'Prospecção', badge: 'text-neon-blue border-neon-blue/30 bg-neon-blue/10', icon: TrendingUp },
  { id: 'PRESENTATION', title: 'Apresentação', badge: 'text-purple-700 border-purple-500/30 bg-purple-500/10', icon: Presentation },
  { id: 'NEGOTIATION', title: 'Negociação', badge: 'text-amber-700 border-amber-500/30 bg-amber-500/10', icon: AlertCircle },
  { id: 'WON', title: 'Ganhos / Faturar', badge: 'text-neon-green border-neon-green/30 bg-neon-green/10', icon: CheckCircle2 },
  { id: 'LOST', title: 'Perdidos', badge: 'text-red-700 border-red-500/30 bg-red-500/10', icon: XCircle },
];

export default function FunnelKanbanPage() {
  const [deals, setDeals] = useState<CRMDealItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: '', value: '', stage: 'PROSPECTING' });

  async function load() {
    setLoading(true);
    try {
      const data = await dealsApi.list();
      setDeals(data);
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
    if (!form.title) return;
    setSubmitting(true);
    try {
      await dealsApi.create({
        title: form.title,
        value: Number(form.value || 0),
        stage: form.stage,
      });
      setIsModalOpen(false);
      setForm({ title: '', value: '', stage: 'PROSPECTING' });
      await load();
    } catch (err: any) {
      alert(err?.message || 'Erro ao criar oportunidade');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMoveStage(deal: CRMDealItem, nextStage: CRMDealItem['stage']) {
    try {
      await dealsApi.update(deal.id, { stage: nextStage });
      if (nextStage === 'WON' && deal.value > 0) {
        const confirmBill = window.confirm(
          `Negócio "${deal.title}" marcado como GANHO! Deseja gerar automaticamente a fatura de R$ ${Number(deal.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em Recebimentos?`
        );
        if (confirmBill) {
          await billingApi.create({
            customer_name: deal.title,
            amount: Number(deal.value),
            due_date: new Date(Date.now() + 7 * 86400000).toISOString(),
            description: `Faturamento Originado do Funil CRM: ${deal.title}`,
            payment_method: 'PIX',
          });
        }
      }
      await load();
    } catch (err: any) {
      alert(err?.message || 'Erro ao mover oportunidade');
    }
  }

  const totalPipeline = deals
    .filter((d) => d.stage !== 'LOST')
    .reduce((acc, d) => acc + Number(d.value || 0), 0);

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 lg:p-8 font-sans text-[#0F172A]">
      <div className="max-w-[1600px] mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-terminal-border pb-5">
          <div>
            <div className="flex items-center gap-2 text-[#e879f9] text-xs font-bold uppercase tracking-widest mb-1">
              <span className="w-2 h-2 rounded-full bg-[#e879f9] animate-pulse" />
              Organização • Pipeline Comercial
            </div>
            <h1 className="text-2xl font-extrabold tracking-wide flex items-center gap-3">
              Funil de Vendas (Kanban)
              <TrendingUp size={22} className="text-[#e879f9]" />
            </h1>
            <p className="text-xs text-[#64748B] mt-1">
              Volume ativo em pipeline:{' '}
              <span className="text-neon-green font-bold">
                R$ {totalPipeline.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-purple-500/20 border border-purple-500/50 text-[#e879f9] hover:bg-purple-500/30 text-xs font-bold uppercase tracking-wider flex items-center gap-2"
          >
            <Plus size={16} /> Nova Oportunidade
          </button>
        </div>

        {loading ? (
          <div className="py-20 text-center text-[#64748B] text-xs">
            <Loader2 className="animate-spin mx-auto mb-2" size={22} /> Carregando pipeline...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {STAGES.map((stage, sIdx) => {
              const stageDeals = deals.filter((d) => d.stage === stage.id);
              const stageSum = stageDeals.reduce((a, b) => a + Number(b.value || 0), 0);
              return (
                <div
                  key={stage.id}
                  className="bg-white shadow-sm border border-terminal-border rounded-2xl p-4 flex flex-col min-h-[480px]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase flex items-center gap-1.5 ${stage.badge}`}>
                      <stage.icon size={12} /> {stage.title}
                    </span>
                    <span className="text-xs font-bold text-[#64748B]">{stageDeals.length}</span>
                  </div>
                  <div className="text-xs font-bold text-[#0F172A] mb-4 pb-3 border-b border-terminal-border">
                    R$ {stageSum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>

                  <div className="space-y-3 flex-1">
                    {stageDeals.length === 0 ? (
                      <div className="text-[11px] text-[#64748B] text-center py-10 border border-dashed border-terminal-border rounded-xl">
                        Sem negócios nesta etapa
                      </div>
                    ) : (
                      stageDeals.map((deal) => (
                        <div
                          key={deal.id}
                          className="bg-white shadow-sm border border-terminal-border hover:border-neon-cyan/40 rounded-xl p-3.5 space-y-2.5 transition-all"
                        >
                          <div className="font-bold text-xs text-[#0F172A] leading-snug">{deal.title}</div>
                          <div className="text-sm font-extrabold text-neon-cyan">
                            R$ {Number(deal.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0]">
                            <span className="text-[10px] text-[#64748B]">
                              {new Date(deal.created_at).toLocaleDateString('pt-BR')}
                            </span>
                            <div className="flex items-center gap-1">
                              {sIdx < STAGES.length - 2 && (
                                <button
                                  onClick={() => handleMoveStage(deal, STAGES[sIdx + 1].id)}
                                  className="px-2 py-1 rounded bg-neon-cyan/10 hover:bg-neon-cyan/20 text-neon-cyan text-[10px] font-bold flex items-center gap-1"
                                  title={`Avançar para ${STAGES[sIdx + 1].title}`}
                                >
                                  Avançar <ArrowRight size={10} />
                                </button>
                              )}
                              {stage.id !== 'WON' && (
                                <button
                                  onClick={() => handleMoveStage(deal, 'WON')}
                                  className="px-1.5 py-1 rounded bg-neon-green/10 hover:bg-neon-green/20 text-neon-green text-[10px] font-bold"
                                  title="Marcar Ganho"
                                >
                                  ✓
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white backdrop-blur-sm p-4">
          <div className="bg-white shadow-sm border border-terminal-border rounded-2xl p-6 w-full max-w-md relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-[#64748B] hover:text-[#0F172A]">
              <X size={18} />
            </button>
            <h2 className="text-base font-bold uppercase tracking-widest text-[#e879f9] mb-4">
              Nova Oportunidade no Funil
            </h2>
            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#64748B] mb-1 uppercase">Título / Cliente</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ex: Implantação Cooperativa Sul"
                  className="w-full bg-[#F8FAFC] border border-terminal-border rounded-xl px-3 py-2.5 text-[#0F172A]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#64748B] mb-1 uppercase">Valor Estimado (R$)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                    placeholder="12500.00"
                    className="w-full bg-[#F8FAFC] border border-terminal-border rounded-xl px-3 py-2.5 text-[#0F172A]"
                  />
                </div>
                <div>
                  <label className="block text-[#64748B] mb-1 uppercase">Etapa Inicial</label>
                  <select
                    value={form.stage}
                    onChange={(e) => setForm({ ...form, stage: e.target.value })}
                    className="w-full bg-[#F8FAFC] border border-terminal-border rounded-xl px-2.5 py-2.5 text-[#0F172A]"
                  >
                    {STAGES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-[#B8860B] text-white font-extrabold uppercase tracking-wider"
              >
                {submitting ? 'Criando...' : 'Adicionar ao Funil'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
