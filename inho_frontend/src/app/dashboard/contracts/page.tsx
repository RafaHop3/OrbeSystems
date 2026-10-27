'use client';

import { useEffect, useState } from 'react';
import {
  FileSignature, Search, Plus, MoreVertical, ShieldCheck,
  CheckCircle2, PauseCircle, Ban, XCircle, ArrowRight, ArrowDownRight, ArrowUpRight
} from 'lucide-react';
import { contractsApi } from '@/lib/api';
import type { ContractOut, ContractCreate, ContractStatus, RecordType } from '@/types/contracts';

// ── Components ──────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: ContractStatus }) => {
  const styles: Record<ContractStatus, string> = {
    ACTIVE: 'text-inho-green bg-inho-green/10 border-inho-green/30',
    SUSPENDED: 'text-inho-gold bg-inho-gold/10 border-inho-gold/30',
    CANCELLED: 'text-red-700 bg-red-400/10 border-red-400/30',
    EXPIRED: 'text-inho-muted bg-inho-muted/10 border-inho-border',
  };
  const icons: Record<ContractStatus, React.ReactNode> = {
    ACTIVE: <CheckCircle2 size={12} />,
    SUSPENDED: <PauseCircle size={12} />,
    CANCELLED: <Ban size={12} />,
    EXPIRED: <XCircle size={12} />,
  };
  const labels: Record<ContractStatus, string> = {
    ACTIVE: 'Ativo',
    SUSPENDED: 'Suspenso',
    CANCELLED: 'Cancelado',
    EXPIRED: 'Expirado',
  };

  return (
    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] uppercase font-bold tracking-wider w-fit ${styles[status]}`}>
      {icons[status]}
      {labels[status]}
    </span>
  );
};

const TypeBadge = ({ type }: { type: RecordType }) => {
  const isPayable = type === 'PAYABLE';
  return (
    <span className={`flex items-center gap-1 text-xs font-mono font-bold ${isPayable ? 'text-red-700' : 'text-inho-green'}`}>
      {isPayable ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
      {isPayable ? 'A Pagar' : 'A Receber'}
    </span>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────

export default function ContractsPage() {
  const [contracts, setContracts] = useState<ContractOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [formData, setFormData] = useState<ContractCreate>({
    title: '',
    contact_name: '',
    contact_doc: '',
    record_type: 'RECEIVABLE',
    total_value: 0,
    installments: 1,
    frequency: 'MONTHLY',
    start_date: new Date().toISOString().split('T')[0],
  });

  const loadContracts = async () => {
    try {
      setLoading(true);
      const data = await contractsApi.list();
      setContracts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContracts();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      // API expects total_value as number, ensure parsing
      const payload: ContractCreate = {
        ...formData,
        start_date: new Date(formData.start_date).toISOString(),
      };
      await contractsApi.create(payload);
      setIsModalOpen(false);

      // Reset form
      setFormData({
        title: '', contact_name: '', contact_doc: '', record_type: 'RECEIVABLE',
        total_value: 0, installments: 1, frequency: 'MONTHLY', start_date: new Date().toISOString().split('T')[0],
      });

      await loadContracts();
    } catch (err: any) {
      setError(err.message || 'Erro ao criar contrato');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (id: string, action: 'activate' | 'suspend') => {
    try {
      if (action === 'activate') {
        await contractsApi.activate(id);
      } else {
        await contractsApi.updateStatus(id, 'SUSPENDED');
      }
      await loadContracts();
    } catch (err) {
      alert('Erro ao atualizar contrato');
    }
  };

  const handleGenerateSchedule = async (c: ContractOut) => {
    try {
      const res = await contractsApi.generateSchedule(c.id, `sched-${c.id}`);
      const destino = res.record_type === 'RECEIVABLE' ? 'Contas a Receber (PIX)' : 'Contas a Pagar';
      alert(
        res.cached_replay
          ? `Cronograma já gerado anteriormente (${res.generated_count} parcelas em ${destino}).`
          : `Cronograma gerado com sucesso! ${res.generated_count} parcela(s) lançadas automaticamente em ${destino}.`
      );
      await loadContracts();
    } catch (err: any) {
      alert(err?.message || 'Erro ao gerar parcelas do contrato');
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="min-h-screen bg-inho-black pb-12">
      {/* Header */}
      <header className="sticky top-0 z-10 glassmorphism border-b border-inho-border px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-inho-muted">INHO</span>
          <span className="text-inho-muted">/</span>
          <span className="text-inho-text font-bold uppercase tracking-wider">Contratos</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-10 relative">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <FileSignature size={16} className="text-purple-700" />
              </div>
              <span className="text-inho-muted text-[10px] font-mono uppercase tracking-widest">Gestão Organizacional</span>
            </div>
            <h1 className="text-3xl font-black text-inho-text">Base de <span className="text-purple-700">Contratos</span></h1>
            <p className="text-inho-muted text-sm mt-1">Gerencie vínculos recorrentes a pagar e a receber.</p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-inho-text text-inho-black rounded-xl font-bold text-sm tracking-wide hover:shadow-inho-glow transition-all active:scale-95"
          >
            <Plus size={16} />
            Novo Contrato
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="glassmorphism p-4 border border-inho-border rounded-2xl mb-6 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-inho-muted" />
            <input
              type="text"
              placeholder="Buscar contratos..."
              className="w-full bg-inho-dark/50 border border-inho-border rounded-xl pl-9 pr-4 py-2.5 text-inho-text text-sm focus:outline-none focus:border-purple-500/50 transition-colors placeholder:text-inho-muted/50"
            />
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs font-mono text-inho-muted">
            <ShieldCheck size={14} className="text-inho-green" />
            Auditoria Ativa
          </div>
        </div>

        {/* Data Grid */}
        <div className="glassmorphism rounded-2xl border border-inho-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-inho-dark/80 text-inho-muted text-[10px] font-mono uppercase tracking-widest border-b border-inho-border">
                  <th className="px-6 py-4 font-bold">Título do Contrato</th>
                  <th className="px-6 py-4 font-bold">Contraparte</th>
                  <th className="px-6 py-4 font-bold">Fluxo</th>
                  <th className="px-6 py-4 font-bold text-right">Valor Total</th>
                  <th className="px-6 py-4 font-bold text-center">Status</th>
                  <th className="px-6 py-4 font-bold text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-inho-border/50 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="inline-block w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    </td>
                  </tr>
                ) : contracts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center font-mono text-inho-muted text-xs">
                      Nenhum contrato encontrado.
                    </td>
                  </tr>
                ) : (
                  contracts.map((c) => (
                    <tr key={c.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4">
                        <p className="font-bold text-inho-text">{c.title}</p>
                        <p className="text-[10px] font-mono text-inho-muted truncate max-w-[200px]">ID: {c.id}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-inho-text font-medium">{c.contact_name}</p>
                        {c.contact_doc && <p className="text-[10px] font-mono text-inho-muted">Doc: {c.contact_doc}</p>}
                      </td>
                      <td className="px-6 py-4">
                        <TypeBadge type={c.record_type} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="font-mono font-bold text-inho-text">{formatCurrency(c.total_value)}</p>
                        <p className="text-xs text-inho-muted mt-0.5">{c.installments}x parcela(s)</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <StatusBadge status={c.status} />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleGenerateSchedule(c)}
                            className="px-3 py-1.5 bg-purple-500/15 text-purple-300 border border-purple-500/30 hover:bg-purple-500/25 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors"
                            title="Converter Contrato em Parcelas no Financeiro (1-Clique Idempotente)"
                          >
                            Gerar Parcelas (1-Click)
                          </button>
                          {c.status !== 'ACTIVE' && (
                            <button
                              onClick={() => handleAction(c.id, 'activate')}
                              className="px-3 py-1.5 bg-inho-green/10 text-inho-green hover:bg-inho-green/20 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors"
                            >
                              Ativar
                            </button>
                          )}
                          {c.status === 'ACTIVE' && (
                            <button
                              onClick={() => handleAction(c.id, 'suspend')}
                              className="px-3 py-1.5 bg-inho-gold/10 text-inho-gold hover:bg-inho-gold/20 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors"
                            >
                              Suspender
                            </button>
                          )}
                          <button className="p-1.5 text-inho-muted hover:text-inho-text hover:bg-[#FAF8F2] rounded-lg transition-colors">
                            <MoreVertical size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Creation Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-white backdrop-blur-sm" onClick={() => !submitting && setIsModalOpen(false)} />
            <div className="relative w-full max-w-2xl bg-inho-dark border border-inho-border rounded-2xl shadow-2xl p-6 lg:p-8 animate-slide-up overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-black text-inho-text flex items-center gap-2">
                    <Plus size={20} className="text-purple-700" /> Registrar Contrato
                  </h2>
                  <p className="text-sm text-inho-muted mt-1">Insira os dados do vínculo com o cliente ou fornecedor.</p>
                </div>
                <button onClick={() => !submitting && setIsModalOpen(false)} className="text-inho-muted hover:text-inho-text">
                  <XCircle size={24} />
                </button>
              </div>

              {error && (
                <div className="mb-6 p-3 bg-red-400/10 border border-red-500/30 rounded-xl text-xs font-mono text-red-700 flex items-center gap-2">
                  <Ban size={14} /> {error}
                </div>
              )}

              <form onSubmit={handleCreate} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-mono text-inho-muted uppercase tracking-wider mb-2">Título do Contrato</label>
                    <input
                      required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })}
                      type="text" placeholder="Ex: Prestação de Serviços SaaS"
                      className="w-full bg-inho-black border border-inho-border rounded-xl px-4 py-3 text-sm text-inho-text focus:outline-none focus:border-purple-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-inho-muted uppercase tracking-wider mb-2">Contato / Empresa</label>
                    <input
                      required value={formData.contact_name} onChange={e => setFormData({ ...formData, contact_name: e.target.value })}
                      type="text" placeholder="Nome do Cliente/Fornecedor"
                      className="w-full bg-inho-black border border-inho-border rounded-xl px-4 py-3 text-sm text-inho-text focus:outline-none focus:border-purple-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-inho-muted uppercase tracking-wider mb-2">CNPJ / CPF do Contato</label>
                    <input
                      value={formData.contact_doc} onChange={e => setFormData({ ...formData, contact_doc: e.target.value })}
                      type="text" placeholder="00.000.000/0001-00"
                      className="w-full bg-inho-black border border-inho-border rounded-xl px-4 py-3 text-sm text-inho-text focus:outline-none focus:border-purple-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-inho-muted uppercase tracking-wider mb-2">Tipo de Fluxo</label>
                    <select
                      required value={formData.record_type} onChange={e => setFormData({ ...formData, record_type: e.target.value as RecordType })}
                      className="w-full bg-inho-black border border-inho-border rounded-xl px-4 py-3 text-sm text-inho-text focus:outline-none focus:border-purple-500/50 appearance-none"
                    >
                      <option value="RECEIVABLE">Recebimento (A Receber)</option>
                      <option value="PAYABLE">Pagamento (A Pagar)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-inho-muted uppercase tracking-wider mb-2">Valor Total Bruto</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-inho-muted font-mono">R$</span>
                      <input
                        required min="0.01" step="0.01"
                        value={formData.total_value || ''} onChange={e => setFormData({ ...formData, total_value: parseFloat(e.target.value) || 0 })}
                        type="number" placeholder="0,00"
                        className="w-full bg-inho-black border border-inho-border rounded-xl pl-10 pr-4 py-3 text-sm text-inho-text font-mono focus:outline-none focus:border-purple-500/50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-inho-muted uppercase tracking-wider mb-2">Parcelas</label>
                    <input
                      required min="1"
                      value={formData.installments} onChange={e => setFormData({ ...formData, installments: parseInt(e.target.value) || 1 })}
                      type="number"
                      className="w-full bg-inho-black border border-inho-border rounded-xl px-4 py-3 text-sm text-inho-text font-mono focus:outline-none focus:border-purple-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-inho-muted uppercase tracking-wider mb-2">Data de Início</label>
                    <input
                      required value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                      type="date"
                      className="w-full bg-inho-black border border-inho-border rounded-xl px-4 py-3 text-sm text-inho-text text-inho-muted focus:text-inho-text focus:outline-none focus:border-purple-500/50 calendar-picker-indicator-white"
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-inho-border flex justify-end gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} disabled={submitting} className="px-6 py-3 rounded-xl font-bold text-sm text-inho-muted hover:text-inho-text hover:bg-[#FAF8F2] transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" disabled={submitting} className="group flex items-center gap-2 px-8 py-3 bg-purple-500 text-[#0F172A] rounded-xl font-bold text-sm hover:bg-purple-400 hover:shadow-lg hover:shadow-purple-500/20 transition-all disabled:opacity-50">
                    {submitting ? 'Registrando...' : 'Confirmar Contrato'}
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
