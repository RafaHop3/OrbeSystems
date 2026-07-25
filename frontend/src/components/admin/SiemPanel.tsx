'use client';
import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Shield } from 'lucide-react';

const SEV_COLOR: Record<string, string> = {
    CRITICAL: 'text-red-400 border-red-500/40 bg-red-500/10',
    HIGH: 'text-orange-400 border-orange-500/40 bg-orange-500/10',
    MEDIUM: 'text-yellow-400 border-yellow-500/40 bg-yellow-500/10',
    LOW: 'text-neon-green border-neon-green/40 bg-neon-green/10',
};

export default function SiemPanel({ apiUrl, token }: { apiUrl: string; token: string }) {
    const [stats, setStats] = useState<any>(null);
    const [alerts, setAlerts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const h = { Authorization: `Bearer ${token}` };

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [sRes, aRes] = await Promise.all([
                fetch(`${apiUrl}/api/siem/alerts/stats?days=7`, { headers: h }),
                fetch(`${apiUrl}/api/siem/alerts?status=open&limit=20`, { headers: h }),
            ]);
            if (sRes.ok) setStats(await sRes.json());
            if (aRes.ok) { const d = await aRes.json(); setAlerts(d.alerts || []); }
        } finally { setLoading(false); }
    };

    const act = async (id: string, action: 'acknowledge' | 'resolve') => {
        await fetch(`${apiUrl}/api/siem/alerts/${id}/${action}`, {
            method: 'POST', headers: { ...h, 'Content-Type': 'application/json' },
            body: action === 'resolve' ? JSON.stringify({ resolved_by: 'admin' }) : '{}',
        });
        fetchAll();
    };

    useEffect(() => { fetchAll(); }, []);

    if (loading) return <div className="text-neon-green/40 text-xs animate-pulse">FETCHING SIEM DATA...</div>;

    const total = stats ? (stats.critical + stats.high + stats.medium + stats.low) || 1 : 1;

    return (
        <div className="space-y-6">
            {/* KPI Row */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { label: 'CRITICAL', val: stats.critical, cls: 'text-red-400 border-red-500/30' },
                        { label: 'HIGH', val: stats.high, cls: 'text-orange-400 border-orange-500/30' },
                        { label: 'MEDIUM', val: stats.medium, cls: 'text-yellow-400 border-yellow-500/30' },
                        { label: 'LOW', val: stats.low, cls: 'text-neon-green border-neon-green/30' },
                    ].map(({ label, val, cls }) => (
                        <div key={label} className={`border p-4 text-center ${cls}`}>
                            <div className="text-2xl font-bold">{val}</div>
                            <div className="text-[9px] uppercase tracking-widest opacity-60 mt-1">{label}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Severity Bar Chart */}
            {stats && (
                <div className="border border-neon-green/20 bg-neon-green/5 p-4">
                    <p className="text-[9px] text-neon-green/50 uppercase tracking-widest mb-3">Severity Distribution (7 days)</p>
                    {[
                        { label: 'CRITICAL', val: stats.critical, color: 'bg-red-500' },
                        { label: 'HIGH', val: stats.high, color: 'bg-orange-500' },
                        { label: 'MEDIUM', val: stats.medium, color: 'bg-yellow-500' },
                        { label: 'LOW', val: stats.low, color: 'bg-neon-green' },
                    ].map(({ label, val, color }) => (
                        <div key={label} className="flex items-center gap-3 mb-2">
                            <span className="text-[9px] w-16 text-neon-green/50 uppercase">{label}</span>
                            <div className="flex-1 bg-white/5 h-3 rounded-sm overflow-hidden">
                                <div
                                    className={`h-full ${color} transition-all duration-700`}
                                    style={{ width: `${Math.round((val / total) * 100)}%` }}
                                />
                            </div>
                            <span className="text-[10px] w-6 text-right text-neon-green/70">{val}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Alerts Table */}
            <div className="border border-neon-green/20">
                <div className="border-b border-neon-green/10 px-4 py-2 flex justify-between items-center">
                    <span className="text-[10px] text-neon-cyan uppercase tracking-widest flex items-center gap-2">
                        <AlertTriangle size={12} /> Open Alerts
                    </span>
                    <span className="text-[9px] text-neon-green/40">{alerts.length} records</span>
                </div>
                {alerts.length === 0 ? (
                    <div className="p-6 text-center text-neon-green/30 text-xs flex items-center justify-center gap-2">
                        <Shield size={14} /> No open alerts — system nominal
                    </div>
                ) : (
                    <div className="divide-y divide-neon-green/10 max-h-72 overflow-y-auto">
                        {alerts.map((a: any) => (
                            <div key={a.id} className="px-4 py-3 flex items-center justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-[8px] px-2 py-0.5 border rounded-full font-bold ${SEV_COLOR[a.severity] || ''}`}>
                                            {a.severity}
                                        </span>
                                        <span className="text-[10px] text-white truncate">{a.rule_name}</span>
                                    </div>
                                    <div className="text-[9px] text-neon-green/40">
                                        {a.source_ip && <span className="mr-3">IP: {a.source_ip}</span>}
                                        <Clock size={8} className="inline mr-1" />
                                        {new Date(a.triggered_at).toLocaleString('pt-BR')}
                                    </div>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    {a.status === 'open' && (
                                        <button onClick={() => act(a.id, 'acknowledge')}
                                            className="text-[8px] border border-yellow-500/40 text-yellow-400 px-2 py-1 hover:bg-yellow-500/10 transition-all">
                                            ACK
                                        </button>
                                    )}
                                    <button onClick={() => act(a.id, 'resolve')}
                                        className="text-[8px] border border-neon-green/40 text-neon-green px-2 py-1 hover:bg-neon-green/10 transition-all">
                                        <CheckCircle2 size={10} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
