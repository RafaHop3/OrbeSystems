"use client";

import React, { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { Users, Activity, Wallet, TrendingUp } from 'lucide-react';

interface Stats {
  total_users: number;
  active_accounts: number;
  total_transactions_volume: string;
  total_pdv_sales_volume: string;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await adminApi.getStats();
        setStats(data);
      } catch (error) {
        console.error("Erro ao carregar stats do admin", error);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) {
    return <div className="animate-pulse flex space-x-4"><div className="flex-1 space-y-6 py-1"><div className="h-2 bg-gray-700 rounded"></div><div className="space-y-3"><div className="grid grid-cols-3 gap-4"><div className="h-2 bg-gray-700 rounded col-span-2"></div><div className="h-2 bg-gray-700 rounded col-span-1"></div></div><div className="h-2 bg-gray-700 rounded"></div></div></div></div>;
  }

  const formatCurrency = (val: string | number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val));
  };

  const kpis = [
    { title: 'Usuários Totais', value: stats?.total_users || 0, icon: Users, color: 'text-blue-700', bg: 'bg-blue-500/10' },
    { title: 'Contas Ativas', value: stats?.active_accounts || 0, icon: Activity, color: 'text-emerald-700', bg: 'bg-green-500/10' },
    { title: 'Volume Transacionado', value: formatCurrency(stats?.total_transactions_volume || 0), icon: Wallet, color: 'text-purple-700', bg: 'bg-purple-500/10' },
    { title: 'Volume PDV', value: formatCurrency(stats?.total_pdv_sales_volume || 0), icon: TrendingUp, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  ];

  return (
    <div className="animate-fade-in">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-[#0F172A] mb-2">Visão Global da Plataforma</h1>
        <p className="text-[#64748B]">Acompanhe as métricas globais e o status do sistema.</p>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-[#E2E8F0] transition-colors">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Icon className={`w-24 h-24 ${kpi.color}`} />
              </div>
              <div className="relative z-10">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${kpi.bg}`}>
                  <Icon className={`w-6 h-6 ${kpi.color}`} />
                </div>
                <p className="text-[#64748B] text-sm font-medium mb-1">{kpi.title}</p>
                <h3 className="text-3xl font-bold text-[#0F172A]">{kpi.value}</h3>
              </div>
            </div>
          );
        })}
      </div>

      {/* Futuristic placeholder for charts */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xl">
        <h2 className="text-xl font-bold text-[#0F172A] mb-4">Crescimento da Base (Projeção)</h2>
        <div className="h-64 flex items-center justify-center border border-dashed border-[#E2E8F0] rounded-xl bg-white">
          <p className="text-gray-500">Gráfico Analítico Integrado com Recharts (Em breve)</p>
        </div>
      </div>
    </div>
  );
}
