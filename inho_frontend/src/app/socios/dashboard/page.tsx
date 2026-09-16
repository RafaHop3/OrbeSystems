"use client";

import React, { useState, useEffect } from "react";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from "recharts";
import { Users, Activity, Briefcase, MapPin, Search } from "lucide-react";

const COLORS = ["#00FF9D", "#B026FF", "#00D4FF", "#FF2A55", "#FFD700"];

export default function SociosDashboard() {
    const [mounted, setMounted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Real data states
    const [recentLogs, setRecentLogs] = useState<any[]>([]);
    const [kpis, setKpis] = useState({ total: 0, today: 0, entities: 0, distinctUsers: 0 });
    const [timeline, setTimeline] = useState<any[]>([]);
    const [operations, setOperations] = useState<any[]>([]);
    const [apiError, setApiError] = useState("");

    useEffect(() => {
        setMounted(true);

        async function fetchRealData() {
            try {
                const token = localStorage.getItem('token') || localStorage.getItem('orbe_token') || '';
                let API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://inho-api.orbesystems.com.br';

                // Remove trailing slash if exists
                if (API_URL.endsWith('/')) API_URL = API_URL.slice(0, -1);

                // Use the current domain as fallback if API_URL fails and we're local
                if (window.location.hostname === 'localhost' && !process.env.NEXT_PUBLIC_API_URL) {
                    API_URL = 'http://localhost:8000';
                }

                const res = await fetch(`${API_URL}/api/v1/audit/all?limit=500`, {
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                });

                if (!res.ok) {
                    throw new Error("Falha ao carregar auditoria");
                }

                const data = await res.json();

                if (Array.isArray(data)) {
                    // Process Table
                    const mappedLogs = data.slice(0, 15).map((log: any) => ({
                        id: log.id,
                        action: log.action || "AÇÃO",
                        operator: log.user_name || log.user_id || "Sistema",
                        time: new Date(log.timestamp).toLocaleString("pt-BR"),
                        status: "Sucesso"
                    }));
                    setRecentLogs(mappedLogs);

                    // Process KPIs
                    const today = new Date().toDateString();
                    const todayLogs = data.filter((d: any) => new Date(d.timestamp).toDateString() === today);
                    const distinctEntities = new Set(data.map((d: any) => d.entity)).size;
                    const distinctUsers = new Set(data.map((d: any) => d.user_id)).size;

                    setKpis({
                        total: data.length,
                        today: todayLogs.length,
                        entities: distinctEntities,
                        distinctUsers: distinctUsers
                    });

                    // Process Donut Chart (Operations breakdown)
                    const opsCount: Record<string, number> = {};
                    data.forEach((d: any) => {
                        const act = d.action || "OUTRO";
                        opsCount[act] = (opsCount[act] || 0) + 1;
                    });

                    const opsArray = Object.keys(opsCount).map(key => ({
                        name: key,
                        value: opsCount[key]
                    }));
                    setOperations(opsArray);

                    // Process Line Chart (Evolução nos últimos 7 dias)
                    const daysMap: Record<string, number> = {};
                    data.forEach((d: any) => {
                        const dateStr = new Date(d.timestamp).toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit' });
                        daysMap[dateStr] = (daysMap[dateStr] || 0) + 1;
                    });

                    // Sort keys (basic date string sort won't perfectly work for all years, but fine for recent days)
                    const sortedDays = Object.keys(daysMap).slice(0, 10).reverse();
                    const timelineArray = sortedDays.map(day => ({
                        name: day,
                        ações: daysMap[day]
                    }));

                    setTimeline(timelineArray);
                }
            } catch (err: any) {
                setApiError(err.message || "Erro de Conexão");
            } finally {
                setIsLoading(false);
            }
        }

        fetchRealData();
    }, []);

    if (!mounted) return <div className="min-h-screen bg-[#050510]" />;

    return (
        <div className="min-h-screen bg-[#050510] text-gray-300 p-8 font-sans">

            {/* Header */}
            <div className="flex justify-between items-center mb-8 border-b border-[#B026FF]/30 pb-4 shadow-[0_4px_30px_rgba(176,38,255,0.1)]">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#00FF9D] to-[#B026FF] uppercase tracking-wider">
                        Painel de Inteligência (Real-Time)
                    </h1>
                    <p className="text-sm text-gray-400 mt-1 uppercase tracking-widest">Auditoria Global &bull; Nível de Segurança: Máximo</p>
                </div>
                <div className="flex space-x-4">
                    <div className="bg-[#0b0c16] border border-[#00FF9D]/30 rounded-lg px-4 py-2 flex items-center text-sm shadow-[0_0_10px_rgba(0,255,157,0.1)]">
                        <Activity className="w-4 h-4 mr-2 text-[#00FF9D]" />
                        <span className="text-[#00FF9D]">{isLoading ? "Sincronizando..." : "Conectado"}</span>
                    </div>
                </div>
            </div>

            {apiError && (
                <div className="bg-red-900/20 text-red-400 border border-red-500/30 p-4 rounded-xl mb-6 flex items-center">
                    Você não possui sessão ativa ou privilégios para ver esta rota em tempo real. Exibindo dados bloqueados.
                </div>
            )}

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {[
                    { title: "Volume Analisado", value: kpis.total, icon: Activity, color: "text-[#00FF9D]", border: "border-[#00FF9D]/30" },
                    { title: "Eventos Hoje", value: kpis.today, icon: Activity, color: "text-[#B026FF]", border: "border-[#B026FF]/30" },
                    { title: "Entidades Afetadas", value: kpis.entities, icon: Briefcase, color: "text-[#00D4FF]", border: "border-[#00D4FF]/30" },
                    { title: "Operadores Ativos", value: kpis.distinctUsers, icon: Users, color: "text-[#FF2A55]", border: "border-[#FF2A55]/30" },
                ].map((kpi, idx) => (
                    <div key={idx} className={`bg-[#0b0c16]/80 backdrop-blur-sm border ${kpi.border} p-6 rounded-xl relative overflow-hidden group hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] transition-all`}>
                        {/* Cyberpunk accent element */}
                        <div className={`absolute top-0 right-0 w-2 h-full bg-gradient-to-b from-transparent to-current opacity-20 ${kpi.color}`}></div>
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-sm font-semibold tracking-wider text-gray-400 uppercase">{kpi.title}</span>
                            <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
                        </div>
                        <div className={`text-4xl font-bold font-mono ${kpi.color}`}>
                            {kpi.value}
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Main Chart */}
                <div className="lg:col-span-2 bg-[#0b0c16]/80 backdrop-blur-sm border border-gray-800 p-6 rounded-xl shadow-lg">
                    <h2 className="text-lg text-white mb-6 uppercase tracking-wider font-semibold border-l-4 border-[#00FF9D] pl-3">
                        Fluxo de Operações
                    </h2>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={timeline}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                                <XAxis dataKey="name" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                                <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0b0c16', borderColor: '#00FF9D', color: '#fff' }}
                                    itemStyle={{ color: '#00FF9D' }}
                                />
                                <Line type="monotone" dataKey="ações" stroke="#00FF9D" strokeWidth={3} dot={{ r: 6, fill: '#050510', stroke: '#00FF9D', strokeWidth: 2 }} activeDot={{ r: 8 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Donut Chart */}
                <div className="bg-[#0b0c16]/80 backdrop-blur-sm border border-gray-800 p-6 rounded-xl shadow-lg">
                    <h2 className="text-lg text-white mb-6 uppercase tracking-wider font-semibold border-l-4 border-[#B026FF] pl-3">
                        Frequência de Ações (Audit)
                    </h2>
                    <div className="h-[300px] flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={operations.length > 0 ? operations : [{ name: "Vazio", value: 1 }]}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {operations.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0b0c16', borderColor: '#B026FF', color: '#fff', borderRadius: '8px' }}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    height={36}
                                    wrapperStyle={{ color: '#9ca3af', fontSize: '12px' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>

            {/* Audit Logs Table */}
            <div className="mt-8 bg-[#0b0c16]/80 backdrop-blur-sm border border-gray-800 p-6 rounded-xl shadow-lg">
                <h2 className="text-lg text-white mb-6 uppercase tracking-wider font-semibold border-l-4 border-[#00D4FF] pl-3">
                    Histórico Real
                </h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-widest">
                                <th className="pb-3 px-4">Operação</th>
                                <th className="pb-3 px-4">Usuário</th>
                                <th className="pb-3 px-4">Horário</th>
                                <th className="pb-3 px-4">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentLogs.map((log) => (
                                <tr key={log.id} className="border-b border-gray-800/50 hover:bg-white/5 transition-colors">
                                    <td className="py-4 px-4 whitespace-nowrap text-gray-300 font-medium">{log.action}</td>
                                    <td className="py-4 px-4 whitespace-nowrap text-gray-400 text-sm font-mono max-w-[200px] truncate">{log.operator}</td>
                                    <td className="py-4 px-4 whitespace-nowrap text-gray-400 text-sm">{log.time}</td>
                                    <td className="py-4 px-4 whitespace-nowrap">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold bg-[#00FF9D]/10 text-[#00FF9D] border border-[#00FF9D]/30`}>
                                            {log.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {recentLogs.length === 0 && !isLoading && !apiError && (
                                <tr>
                                    <td colSpan={4} className="py-8 text-center text-gray-500">Nenhuma trilha de auditoria encontrada.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}
