'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Download,
  RefreshCw,
  Clock,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import { reportsApi } from '@/lib/api';

const fmtCurrency = (val: number | string) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val || 0));

type ReportTab = 'DRE' | 'CASHFLOW' | 'AGING' | 'BUDGET' | 'LOSSES';

export default function ReportsPage() {
  const now = new Date();
  const [activeTab, setActiveTab] = useState<ReportTab>('DRE');
  const [regime, setRegime] = useState<'competencia' | 'caixa'>('competencia');
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [loading, setLoading] = useState(true);

  const [dre, setDre] = useState<any>(null);
  const [cashflow, setCashflow] = useState<any>(null);
  const [aging, setAging] = useState<any>(null);
  const [budget, setBudget] = useState<any>(null);
  const [losses, setLosses] = useState<any>(null);

  const loadAllReports = async () => {
    setLoading(true);
    try {
      const [dreRes, cfRes, agingRes, budgetRes, lossesRes] = await Promise.all([
        reportsApi.getDre({ year, month, regime }).catch(() => null),
        reportsApi.getCashflow().catch(() => null),
        reportsApi.getAging().catch(() => null),
        reportsApi.getBudget({ year, month }).catch(() => null),
        reportsApi.getLosses().catch(() => null),
      ]);
      setDre(dreRes);
      setCashflow(cfRes);
      setAging(agingRes);
      setBudget(budgetRes);
      setLosses(lossesRes);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllReports();
  }, [year, month, regime]);

  const revTotal = Number(dre?.revenue_total ?? dre?.total_revenue ?? 0);
  const expTotal = Number(dre?.expenses_total ?? dre?.total_expense ?? 0);
  const netProfit = Number(dre?.net_profit ?? revTotal - expTotal);
  const marginPct = revTotal > 0 ? ((netProfit / revTotal) * 100).toFixed(1) : '0.0';

  const handleExportCsv = () => {
    const rows: string[][] = [
      ['Relatorio', 'Periodo', 'Regime', 'Receita Bruta', 'Despesas', 'Lucro Liquido', 'Inadimplencia Aging'],
      [
        'DRE & BI Consolidado',
        `${year}-${String(month).padStart(2, '0')}`,
        regime.toUpperCase(),
        revTotal.toFixed(2),
        expTotal.toFixed(2),
        netProfit.toFixed(2),
        Number(aging?.total_overdue || 0).toFixed(2),
      ],
    ];
    if (cashflow?.projection?.length) {
      rows.push([]);
      rows.push(['Projecao Fluxo de Caixa', 'Mes', 'Entradas', 'Saidas', 'Saldo Liquido']);
      for (const m of cashflow.projection) {
        rows.push(['Cashflow', m.period, String(m.inflow), String(m.outflow), String(m.net)]);
      }
    }
    const csvContent = rows.map((r) => r.join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_bi_inho_${year}_${String(month).padStart(2, '0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
                Relatórios Financeiros & DRE
                <BarChart3 size={22} className="text-inho-teal" />
              </h1>
              <p className="text-xs text-inho-muted mt-1">
                DRE em Tempo Real, Projeção de Fluxo de Caixa, Aging de Inadimplência, Orçado vs Realizado e Perdas.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="bg-inho-dark border border-inho-border rounded-xl px-3 py-2 text-xs text-[#0F172A] outline-none focus:border-inho-teal"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                <option key={m} value={m}>
                  Mês {String(m).padStart(2, '0')}
                </option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="bg-inho-dark border border-inho-border rounded-xl px-3 py-2 text-xs text-[#0F172A] outline-none focus:border-inho-teal"
            >
              {[2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            <div className="bg-inho-dark p-1 rounded-xl border border-inho-border flex">
              <button
                onClick={() => setRegime('competencia')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  regime === 'competencia'
                    ? 'bg-inho-teal text-white shadow-glow-teal'
                    : 'text-inho-muted hover:text-[#0F172A]'
                }`}
              >
                Competência
              </button>
              <button
                onClick={() => setRegime('caixa')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  regime === 'caixa'
                    ? 'bg-inho-teal text-white shadow-glow-teal'
                    : 'text-inho-muted hover:text-[#0F172A]'
                }`}
              >
                Caixa
              </button>
            </div>

            <button
              onClick={loadAllReports}
              className="bg-[#FAF8F2] hover:bg-[#FAF8F2] text-[#0F172A] border border-[#E5DEC9] p-2 rounded-xl transition-colors"
              title="Atualizar dados"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin text-inho-teal' : ''} />
            </button>

            <button
              onClick={handleExportCsv}
              className="bg-inho-teal/15 hover:bg-inho-teal/25 text-inho-teal border border-inho-teal/30 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
            >
              <Download size={14} /> Exportar CSV
            </button>
          </div>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glassmorphism p-6 rounded-2xl border border-inho-border relative overflow-hidden">
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs uppercase font-mono tracking-wider text-inho-muted">
                Receitas ({year}-{String(month).padStart(2, '0')})
              </p>
              <div className="p-2 bg-green-500/10 rounded-lg text-emerald-700">
                <TrendingUp size={18} />
              </div>
            </div>
            <p className="text-3xl font-black font-mono text-[#0F172A]">{fmtCurrency(revTotal)}</p>
            <p className="text-[10px] text-emerald-700 mt-2 font-mono uppercase">
              Regime de {regime === 'competencia' ? 'Competência' : 'Caixa'}
            </p>
          </div>

          <div className="glassmorphism p-6 rounded-2xl border border-inho-border relative overflow-hidden">
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs uppercase font-mono tracking-wider text-inho-muted">
                Despesas ({year}-{String(month).padStart(2, '0')})
              </p>
              <div className="p-2 bg-red-500/10 rounded-lg text-red-700">
                <TrendingDown size={18} />
              </div>
            </div>
            <p className="text-3xl font-black font-mono text-[#0F172A]">{fmtCurrency(expTotal)}</p>
            <p className="text-[10px] text-red-700 mt-2 font-mono uppercase">
              Contas a Pagar & Custos Operacionais
            </p>
          </div>

          <div className="glassmorphism p-6 rounded-2xl border border-inho-teal/30 relative overflow-hidden shadow-[0_0_25px_rgba(184,134,11,0.05)]">
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs uppercase font-mono tracking-wider text-inho-teal">Resultado Líquido (DRE)</p>
              <div className="p-2 bg-inho-teal/10 rounded-lg text-inho-teal">
                <DollarSign size={18} />
              </div>
            </div>
            <p className={`text-3xl font-black font-mono ${netProfit >= 0 ? 'text-inho-teal' : 'text-red-700'}`}>
              {fmtCurrency(netProfit)}
            </p>
            <p className="text-[10px] text-inho-muted mt-2 font-mono">Margem Líquida: {marginPct}%</p>
          </div>
        </div>

        {/* Report Navigation Tabs */}
        <div className="flex flex-wrap gap-2 bg-inho-dark/60 border border-inho-border p-2 rounded-xl">
          {[
            { id: 'DRE', label: '1. Demonstrativo DRE' },
            { id: 'CASHFLOW', label: '2. Fluxo de Caixa Projetado' },
            { id: 'AGING', label: '3. Aging de Inadimplência' },
            { id: 'BUDGET', label: '4. Orçado vs Realizado' },
            { id: 'LOSSES', label: '5. Relatório de Perdas' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as ReportTab)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === t.id
                  ? 'bg-inho-teal/20 text-inho-teal border border-inho-teal/40'
                  : 'text-inho-muted hover:text-[#0F172A]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Active Report Body */}
        {loading ? (
          <div className="glassmorphism rounded-2xl border border-inho-border p-12 text-center">
            <div className="w-8 h-8 border-2 border-inho-teal border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-inho-muted mt-3 font-mono">Processando indicadores contábeis...</p>
          </div>
        ) : activeTab === 'DRE' ? (
          <div className="glassmorphism rounded-2xl border border-inho-border overflow-hidden">
            <div className="p-5 bg-inho-dark border-b border-inho-border flex justify-between items-center">
              <h2 className="text-sm font-bold text-[#0F172A] uppercase font-mono tracking-wider">
                Estrutura DRE — {year}/{String(month).padStart(2, '0')} ({regime.toUpperCase()})
              </h2>
              <span className="text-xs text-inho-muted font-mono">Valores em BRL (R$)</span>
            </div>
            <div className="divide-y divide-inho-border/40 text-sm">
              <div className="p-4 flex justify-between items-center bg-white/[0.02] font-bold text-[#0F172A]">
                <span>1. RECEITA OPERACIONAL BRUTA</span>
                <span className="font-mono text-emerald-700">{fmtCurrency(revTotal)}</span>
              </div>
              {(dre?.revenues || []).map((r: any, idx: number) => (
                <div key={idx} className="p-3 pl-8 flex justify-between items-center text-inho-muted text-xs">
                  <span>(+) {r.category_name || 'Faturamento Bruto'}</span>
                  <span className="font-mono">{fmtCurrency(r.amount)}</span>
                </div>
              ))}
              <div className="p-4 flex justify-between items-center bg-white/[0.02] font-bold text-[#0F172A]">
                <span>2. CUSTOS E DESPESAS OPERACIONAIS</span>
                <span className="font-mono text-red-700">- {fmtCurrency(expTotal)}</span>
              </div>
              {(dre?.expenses || []).map((e: any, idx: number) => (
                <div key={idx} className="p-3 pl-8 flex justify-between items-center text-inho-muted text-xs">
                  <span>(-) {e.category_name || 'Despesas Operacionais'}</span>
                  <span className="font-mono">- {fmtCurrency(e.amount)}</span>
                </div>
              ))}
              <div className="p-5 flex justify-between items-center bg-inho-teal/5 border-t-2 border-inho-teal/30 font-black text-base text-[#0F172A]">
                <span>(=) RESULTADO LÍQUIDO DO EXERCÍCIO</span>
                <span className={`font-mono text-xl ${netProfit >= 0 ? 'text-inho-teal' : 'text-red-700'}`}>
                  {fmtCurrency(netProfit)}
                </span>
              </div>
            </div>
          </div>
        ) : activeTab === 'CASHFLOW' ? (
          <div className="glassmorphism rounded-2xl border border-inho-border overflow-hidden">
            <div className="p-5 bg-inho-dark border-b border-inho-border flex justify-between items-center">
              <h2 className="text-sm font-bold text-[#0F172A] uppercase font-mono tracking-wider">
                Projeção de Fluxo de Caixa ({cashflow?.horizon_months || 6} Meses)
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-inho-dark/60 border-b border-inho-border text-[10px] font-mono uppercase text-inho-muted">
                  <tr>
                    <th className="px-6 py-3">Período</th>
                    <th className="px-6 py-3">Entradas Previstas</th>
                    <th className="px-6 py-3">Saídas Previstas</th>
                    <th className="px-6 py-3 text-right">Saldo Líquido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-inho-border/40">
                  {(cashflow?.projection || []).map((row: any) => (
                    <tr key={row.period} className="hover:bg-white/[0.02]">
                      <td className="px-6 py-4 font-mono text-xs font-bold text-[#0F172A]">{row.period}</td>
                      <td className="px-6 py-4 font-mono text-xs text-emerald-700">{fmtCurrency(row.inflow)}</td>
                      <td className="px-6 py-4 font-mono text-xs text-red-700">{fmtCurrency(row.outflow)}</td>
                      <td
                        className={`px-6 py-4 font-mono text-xs font-bold text-right ${
                          row.net >= 0 ? 'text-inho-teal' : 'text-red-700'
                        }`}
                      >
                        {fmtCurrency(row.net)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'AGING' ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { key: '0_30', label: '1 a 30 dias vencido', val: aging?.buckets?.['0_30'] || 0 },
              { key: '31_60', label: '31 a 60 dias vencido', val: aging?.buckets?.['31_60'] || 0 },
              { key: '61_90', label: '61 a 90 dias vencido', val: aging?.buckets?.['61_90'] || 0 },
              { key: '90_plus', label: 'Acima de 90 dias', val: aging?.buckets?.['90_plus'] || 0 },
            ].map((b) => (
              <div key={b.key} className="glassmorphism p-5 rounded-2xl border border-inho-border">
                <div className="flex items-center gap-2 text-xs text-inho-muted font-mono mb-2">
                  <Clock size={14} className="text-amber-700" />
                  {b.label}
                </div>
                <p className="text-2xl font-black font-mono text-[#0F172A]">{fmtCurrency(b.val)}</p>
              </div>
            ))}
          </div>
        ) : activeTab === 'BUDGET' ? (
          <div className="glassmorphism rounded-2xl border border-inho-border p-6 space-y-4">
            <h2 className="text-sm font-bold text-[#0F172A] uppercase font-mono flex items-center gap-2">
              <Layers size={16} className="text-inho-teal" />
              Orçado vs Realizado ({budget?.year || year}/{String(budget?.month || month).padStart(2, '0')})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-[#E5DEC9]">
                <p className="text-xs text-inho-muted font-mono">Total Orçado</p>
                <p className="text-2xl font-black font-mono text-[#0F172A] mt-1">
                  {fmtCurrency(budget?.total_budgeted || 0)}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-[#E5DEC9]">
                <p className="text-xs text-inho-muted font-mono">Total Realizado (Pago)</p>
                <p className="text-2xl font-black font-mono text-inho-teal mt-1">
                  {fmtCurrency(budget?.total_actual || 0)}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="glassmorphism rounded-2xl border border-inho-border overflow-hidden">
            <div className="p-5 bg-inho-dark border-b border-inho-border flex justify-between items-center">
              <h2 className="text-sm font-bold text-[#0F172A] uppercase font-mono flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-700" />
                Relatório de Perdas e Inadimplência — Total: {fmtCurrency(losses?.total_loss || 0)}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-inho-dark/60 border-b border-inho-border text-[10px] font-mono uppercase text-inho-muted">
                  <tr>
                    <th className="px-6 py-3">Cliente</th>
                    <th className="px-6 py-3">Vencimento</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Valor em Aberto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-inho-border/40">
                  {(losses?.losses || []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-xs text-inho-muted">
                        Nenhuma perda ou fatura vencida registrada no período.
                      </td>
                    </tr>
                  ) : (
                    (losses?.losses || []).map((item: any) => (
                      <tr key={item.invoice_id} className="hover:bg-white/[0.02]">
                        <td className="px-6 py-4 font-bold text-[#0F172A] text-xs">{item.customer_name}</td>
                        <td className="px-6 py-4 font-mono text-xs text-inho-muted">
                          {new Date(item.due_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                        </td>
                        <td className="px-6 py-4 text-xs text-red-700 font-mono">{item.status}</td>
                        <td className="px-6 py-4 font-mono text-xs font-bold text-red-700 text-right">
                          {fmtCurrency(item.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
