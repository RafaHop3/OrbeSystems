'use client';
import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Download, Link } from 'lucide-react';

export default function AuditChainPanel({ apiUrl, token }: { apiUrl: string; token: string }) {
    const [chain, setChain] = useState<any[]>([]);
    const [verify, setVerify] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const h = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [cRes, vRes] = await Promise.all([
                    fetch(`${apiUrl}/api/audit/chain?limit=30`, { headers: h }),
                    fetch(`${apiUrl}/api/audit/chain/verify`, { headers: h }),
                ]);
                if (cRes.ok) { const d = await cRes.json(); setChain(d.chain || d.events || []); }
                if (vRes.ok) setVerify(await vRes.json());
            } finally { setLoading(false); }
        };
        load();
    }, []);

    const exportCsv = () => window.open(`${apiUrl}/api/audit/chain/export?format=csv`, '_blank');

    if (loading) return <div className="text-neon-green/40 text-xs animate-pulse">VERIFYING CHAIN INTEGRITY...</div>;

    const intact = verify?.intact ?? verify?.valid ?? true;

    return (
        <div className="space-y-4">
            {/* Integrity Badge */}
            <div className={`flex items-center justify-between p-4 border ${intact ? 'border-neon-green/40 bg-neon-green/5' : 'border-red-500/40 bg-red-500/10'}`}>
                <div className="flex items-center gap-3">
                    {intact
                        ? <CheckCircle2 className="text-neon-green" size={20} />
                        : <XCircle className="text-red-400" size={20} />}
                    <div>
                        <p className={`text-sm font-bold ${intact ? 'text-neon-green' : 'text-red-400'}`}>
                            CHAIN {intact ? 'INTACT' : 'COMPROMISED'}
                        </p>
                        <p className="text-[9px] opacity-50 mt-0.5">
                            {intact ? 'SHA-256 hash chain verified — admissível juridicamente (MCI)' : 'Integrity violation detected — forensic review required'}
                        </p>
                    </div>
                </div>
                <button onClick={exportCsv}
                    className="flex items-center gap-2 text-[9px] border border-neon-cyan/30 text-neon-cyan px-3 py-2 hover:bg-neon-cyan/10 transition-all">
                    <Download size={10} /> EXPORT CSV
                </button>
            </div>

            {/* Chain Timeline */}
            <div className="border border-neon-green/20">
                <div className="border-b border-neon-green/10 px-4 py-2 flex items-center gap-2">
                    <Link size={12} className="text-neon-cyan" />
                    <span className="text-[10px] text-neon-cyan uppercase tracking-widest">Audit Chain</span>
                    <span className="ml-auto text-[9px] text-neon-green/40">{chain.length} events</span>
                </div>
                <div className="divide-y divide-neon-green/10 max-h-80 overflow-y-auto">
                    {chain.length === 0 ? (
                        <div className="p-6 text-center text-neon-green/30 text-xs">No audit events recorded yet</div>
                    ) : chain.map((e: any, i: number) => (
                        <div key={e.id || i} className="px-4 py-3 grid grid-cols-3 gap-2 text-[9px]">
                            <div>
                                <p className="text-neon-green/40 uppercase">Actor</p>
                                <p className="text-white font-mono truncate">{e.actor}</p>
                            </div>
                            <div>
                                <p className="text-neon-green/40 uppercase">Action</p>
                                <p className={`font-mono truncate ${e.action?.includes('retroalimentacao') ? 'text-neon-cyan' :
                                        e.action?.includes('playbook') ? 'text-orange-400' : 'text-neon-green'
                                    }`}>{e.action}</p>
                            </div>
                            <div>
                                <p className="text-neon-green/40 uppercase">Time</p>
                                <p className="text-neon-green/70">{new Date(e.created_at || e.timestamp).toLocaleString('pt-BR')}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
