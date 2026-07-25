'use client';
import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, ChevronRight, X } from 'lucide-react';

const PHASE_COLOR: Record<string, string> = {
    preparation: 'text-neon-green/60 border-neon-green/20',
    detection: 'text-yellow-400 border-yellow-500/40',
    containment: 'text-orange-400 border-orange-500/40',
    post_incident: 'text-neon-cyan border-neon-cyan/40',
};

export default function IrPanel({ apiUrl, token }: { apiUrl: string; token: string }) {
    const [metrics, setMetrics] = useState<any>(null);
    const [incidents, setIncidents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [closing, setClosing] = useState<string | null>(null);
    const [closeForm, setCloseForm] = useState({ lessons: '', sast: false, waf: false, arch: false });
    const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [mRes, iRes] = await Promise.all([
                fetch(`${apiUrl}/api/ir/metrics?days=30`, { headers: h }),
                fetch(`${apiUrl}/api/ir/incidents?status=open&limit=20`, { headers: h }),
            ]);
            if (mRes.ok) setMetrics(await mRes.json());
            if (iRes.ok) { const d = await iRes.json(); setIncidents(d.incidents || []); }
        } finally { setLoading(false); }
    };

    const advance = async (id: string, phase: string) => {
        await fetch(`${apiUrl}/api/ir/incidents/${id}/advance`, {
            method: 'POST', headers: h,
            body: JSON.stringify({ phase, notes: 'Manual advance via admin dashboard' }),
        });
        fetchAll();
    };

    const closeIncident = async (id: string) => {
        await fetch(`${apiUrl}/api/ir/incidents/${id}/close`, {
            method: 'POST', headers: h,
            body: JSON.stringify({
                lessons_learned: closeForm.lessons,
                sast_rule_added: closeForm.sast,
                waf_signature_added: closeForm.waf,
                arch_revision_needed: closeForm.arch,
            }),
        });
        setClosing(null);
        setCloseForm({ lessons: '', sast: false, waf: false, arch: false });
        fetchAll();
    };

    useEffect(() => { fetchAll(); }, []);

    if (loading) return <div className="text-neon-green/40 text-xs animate-pulse">LOADING IR MODULE...</div>;

    return (
        <div className="space-y-4">
            {/* Close Modal */}
            {closing && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="border border-neon-cyan/40 bg-black p-6 w-full max-w-md space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-neon-cyan text-sm font-bold uppercase tracking-wider">Close Incident + Retroalimentação</h3>
                            <button onClick={() => setClosing(null)}><X size={14} className="text-neon-green/50" /></button>
                        </div>
                        <textarea
                            placeholder="Lessons learned (descreva o vetor, o que foi corrigido)..."
                            value={closeForm.lessons}
                            onChange={e => setCloseForm(f => ({ ...f, lessons: e.target.value }))}
                            className="w-full bg-black/60 border border-neon-cyan/30 p-2 text-xs text-neon-cyan focus:outline-none min-h-[80px]"
                        />
                        {[
                            { key: 'sast', label: 'Semgrep/Bandit rule added (SAST)' },
                            { key: 'waf', label: 'WAF signature added' },
                            { key: 'arch', label: 'Architecture revision needed' },
                        ].map(({ key, label }) => (
                            <label key={key} className="flex items-center gap-3 text-[10px] text-neon-green/70 cursor-pointer">
                                <input type="checkbox" checked={(closeForm as any)[key]}
                                    onChange={e => setCloseForm(f => ({ ...f, [key]: e.target.checked }))}
                                    className="accent-neon-cyan w-4 h-4" />
                                {label}
                            </label>
                        ))}
                        <button onClick={() => closeIncident(closing)}
                            className="w-full border border-neon-cyan text-neon-cyan py-2 text-[10px] uppercase tracking-widest hover:bg-neon-cyan/10 transition-all">
                            CLOSE + RECORD RETROALIMENTAÇÃO
                        </button>
                    </div>
                </div>
            )}

            {/* KPI Row */}
            {metrics && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { label: 'Open', val: metrics.total_open, cls: 'text-orange-400 border-orange-500/30' },
                        { label: 'Closed', val: metrics.total_closed, cls: 'text-neon-green border-neon-green/30' },
                        { label: 'MTTR', val: metrics.avg_mttr_human ?? '—', cls: 'text-neon-cyan border-neon-cyan/30' },
                        { label: 'Shift-Left Updates', val: metrics.retroalimentacao?.total_shift_left_updates ?? 0, cls: 'text-purple-400 border-purple-500/30' },
                    ].map(({ label, val, cls }) => (
                        <div key={label} className={`border p-3 text-center ${cls}`}>
                            <div className="text-xl font-bold">{val}</div>
                            <div className="text-[8px] uppercase tracking-widest opacity-60 mt-1">{label}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* SLA Grid */}
            {metrics?.sla && (
                <div className="border border-neon-green/20 bg-neon-green/5 p-4">
                    <p className="text-[9px] text-neon-green/50 uppercase tracking-widest mb-3">Risk-Based SLA (open incidents)</p>
                    <div className="grid grid-cols-4 gap-2 text-center text-[9px]">
                        {Object.entries(metrics.sla).map(([sev, data]: [string, any]) => (
                            <div key={sev} className={`p-2 border ${data.open > 0 ? 'border-orange-500/40' : 'border-neon-green/20'}`}>
                                <p className="font-bold text-white uppercase">{sev}</p>
                                <p className="text-neon-green/50 mt-0.5">{data.sla_hours}h SLA</p>
                                <p className={`font-bold mt-1 ${data.open > 0 ? 'text-orange-400' : 'text-neon-green/40'}`}>{data.open} open</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Incidents Table */}
            <div className="border border-neon-green/20">
                <div className="border-b border-neon-green/10 px-4 py-2 flex items-center gap-2">
                    <AlertTriangle size={12} className="text-orange-400" />
                    <span className="text-[10px] text-orange-400 uppercase tracking-widest">Open Incidents</span>
                    <span className="ml-auto text-[9px] text-neon-green/40">{incidents.length} active</span>
                </div>
                {incidents.length === 0 ? (
                    <div className="p-6 text-center text-neon-green/30 text-xs flex items-center justify-center gap-2">
                        <CheckCircle2 size={14} /> No open incidents — NIST cycle is clear
                    </div>
                ) : incidents.map((inc: any) => (
                    <div key={inc.id} className="px-4 py-3 border-b border-neon-green/10">
                        <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                                <span className={`text-[8px] px-2 py-0.5 border rounded-full ${PHASE_COLOR[inc.nist_phase] || 'text-neon-green/50 border-neon-green/20'}`}>
                                    {inc.nist_phase?.toUpperCase().replace('_', ' ')}
                                </span>
                                <span className="ml-2 text-[9px] text-white font-mono">{inc.vector || inc.id.slice(0, 8)}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[9px] text-neon-green/40">
                                <Clock size={8} />
                                {new Date(inc.opened_at).toLocaleString('pt-BR')}
                            </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            {inc.nist_phase === 'detection' && (
                                <button onClick={() => advance(inc.id, 'containment')}
                                    className="flex items-center gap-1 text-[8px] border border-orange-500/40 text-orange-400 px-2 py-1 hover:bg-orange-500/10 transition-all">
                                    <ChevronRight size={10} /> CONTAINMENT
                                </button>
                            )}
                            {inc.nist_phase === 'containment' && (
                                <button onClick={() => advance(inc.id, 'post_incident')}
                                    className="flex items-center gap-1 text-[8px] border border-neon-cyan/40 text-neon-cyan px-2 py-1 hover:bg-neon-cyan/10 transition-all">
                                    <ChevronRight size={10} /> POST-INCIDENT
                                </button>
                            )}
                            <button onClick={() => { setClosing(inc.id); setCloseForm({ lessons: '', sast: false, waf: false, arch: false }); }}
                                className="flex items-center gap-1 text-[8px] border border-neon-green/40 text-neon-green px-2 py-1 hover:bg-neon-green/10 transition-all">
                                <CheckCircle2 size={10} /> CLOSE + RETROALIM.
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
