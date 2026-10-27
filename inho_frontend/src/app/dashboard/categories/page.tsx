'use client';

import { useEffect, useState } from 'react';
import { Layers, Plus, Trash2, Loader2, X } from 'lucide-react';
import { categoriesApi, AccountCategoryItem } from '@/lib/api';

const TYPE_META: Record<string, { label: string; badge: string }> = {
  REVENUE: { label: 'Receita Operacional', badge: 'bg-neon-green/10 text-neon-green border-neon-green/30' },
  COST: { label: 'Custo Direto (CSP/CMV)', badge: 'bg-amber-500/10 text-amber-700 border-amber-500/30' },
  EXPENSE: { label: 'Despesa Operacional', badge: 'bg-red-500/10 text-red-700 border-red-500/30' },
  TAX: { label: 'Impostos & Retenções', badge: 'bg-purple-500/10 text-purple-700 border-purple-500/30' },
  TRANSFER: { label: 'Transferência / Neutro', badge: 'bg-neon-cyan/10 text-neon-cyan border-neon-cyan/30' },
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<AccountCategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'REVENUE' });

  async function load() {
    setLoading(true);
    try {
      const data = await categoriesApi.list(filterType || undefined);
      setCategories(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [filterType]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) return;
    setSubmitting(true);
    try {
      await categoriesApi.create(form);
      setIsModalOpen(false);
      setForm({ name: '', type: 'REVENUE' });
      await load();
    } catch (err: any) {
      alert(err?.message || 'Erro ao criar categoria');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await categoriesApi.delete(id);
      await load();
    } catch (err: any) {
      alert(err?.message || 'Erro ao arquivar categoria');
    }
  }

  return (
    <div className="min-h-screen bg-[#F6F4EE] p-6 lg:p-8 font-sans text-[#0F172A]">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-terminal-border pb-5">
          <div>
            <div className="flex items-center gap-2 text-neon-cyan text-xs font-bold uppercase tracking-widest mb-1">
              <span className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse" />
              Contabilidade & BI • Estrutura Gerencial
            </div>
            <h1 className="text-2xl font-extrabold tracking-wide flex items-center gap-3">
              Plano de Contas & Categorias DRE
              <Layers size={22} className="text-neon-cyan" />
            </h1>
            <p className="text-xs text-[#57606A] mt-1">
              Classificação contábil de receitas, custos, despesas e impostos que alimentam o DRE automático.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-neon-cyan/15 border border-neon-cyan/50 text-neon-cyan hover:bg-neon-cyan/25 text-xs font-bold uppercase tracking-wider flex items-center gap-2"
          >
            <Plus size={16} /> Nova Conta / Categoria
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { id: '', label: 'Todas as Contas' },
            { id: 'REVENUE', label: 'Receitas' },
            { id: 'COST', label: 'Custos Diretos' },
            { id: 'EXPENSE', label: 'Despesas' },
            { id: 'TAX', label: 'Impostos' },
            { id: 'TRANSFER', label: 'Transferências' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setFilterType(t.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase transition-all ${
                filterType === t.id
                  ? 'bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/40'
                  : 'bg-white shadow-sm text-[#57606A] border border-terminal-border hover:text-[#0F172A]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="bg-white shadow-sm border border-terminal-border rounded-2xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8F2] border-b border-terminal-border text-[#57606A] uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Código</th>
                <th className="px-6 py-4">Nome da Categoria Contábil</th>
                <th className="px-6 py-4">Natureza no DRE</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-terminal-border">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-[#57606A]">
                    <Loader2 className="animate-spin mx-auto mb-2" size={20} /> Carregando Plano de Contas...
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-[#57606A]">
                    Nenhuma categoria encontrada para este filtro.
                  </td>
                </tr>
              ) : (
                categories.map((cat) => {
                  const meta = TYPE_META[cat.type] || { label: cat.type, badge: 'bg-[#FAF8F2] text-[#0F172A]' };
                  return (
                    <tr key={cat.id} className="hover:bg-[#FAF8F2] transition-colors">
                      <td className="px-6 py-4 text-[#57606A]">{cat.id.slice(0, 8).toUpperCase()}</td>
                      <td className="px-6 py-4 font-bold text-[#0F172A]">{cat.name}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded border text-[10px] font-bold uppercase ${meta.badge}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDelete(cat.id)}
                          className="p-1.5 rounded-lg bg-[#FAF8F2] hover:bg-red-500/20 text-red-700 border border-terminal-border"
                          title="Arquivar categoria"
                        >
                          <Trash2 size={13} />
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
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-[#57606A] hover:text-[#0F172A]">
              <X size={18} />
            </button>
            <h2 className="text-base font-bold uppercase tracking-widest text-neon-cyan mb-4">
              Nova Categoria no Plano de Contas
            </h2>
            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#57606A] mb-1 uppercase">Nome da Conta / Rubrica</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Integralização de Cotas-Partes"
                  className="w-full bg-[#F6F4EE] border border-terminal-border rounded-xl px-3 py-2.5 text-[#0F172A]"
                />
              </div>
              <div>
                <label className="block text-[#57606A] mb-1 uppercase">Grupo no DRE</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full bg-[#F6F4EE] border border-terminal-border rounded-xl px-3 py-2.5 text-[#0F172A]"
                >
                  <option value="REVENUE">Receita Operacional (+)</option>
                  <option value="COST">Custo Direto (-)</option>
                  <option value="EXPENSE">Despesa Operacional (-)</option>
                  <option value="TAX">Impostos e Retenções (-)</option>
                  <option value="TRANSFER">Transferência / Neutro (=)</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-neon-cyan text-white font-extrabold uppercase tracking-wider"
              >
                {submitting ? 'Salvando...' : 'Criar Categoria'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
