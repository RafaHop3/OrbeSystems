'use client';
import { useEffect, useState } from 'react';
import { Ban, Unlock, ShieldAlert } from 'lucide-react';

export default function SoarPanel({ apiUrl, token }: { apiUrl: string; token: string }) {
    const [blocks, setBlocks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const h = { Authorization: `Bearer ${token}` };

    const fetch_ = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${apiUrl}/api/audit/blocklist`, { headers: h });
            if (res.ok) { const d = await res.json(); setBlocks(d.blocked || d || []); }
        } finally { setLoading(false); }
    };

    const unblock = async (ip: string) => {
        if (!confirm(`Unblock ${ip}?`)) return;
        await fetch(`${apiUrl}/api/audit/blocklist/${ip}`, { method: 'DELETE', headers: h });
        fetch_();
    };

    useEffect(() => { fetch_(); }, []);

    if (loading) return <div className="text-neon-green/40 text-xs animate-pulse">FETCHING SOAR DATA...</div>;

    return (
        <div className="space-y-4">
            {/* Stats row */}
            <div className="grid grid-cols-2 gap-4">
                <div className="border border-red-500/30 bg-red-500/5 p-4 text-center">
                    <div className="text-3xl font-bold text-red-400">{blocks.length}</div>
                    <div className="text-[9px] text-red-400/60 uppercase tracking-widest mt-1">Active Blocks</div>
                </div>
                <div className="border border-neon-cyan/30 bg-neon-cyan/5 p-4 text-center">
                    <div className="text-3xl font-bold text-neon-cyan">
                        {blocks.length > 0 ? new Date(blocks[0]?.blocked_until || '').toLocaleDateString('pt-BR') : '—'}
                    </div>
                    <div className="text-[9px] text-neon-cyan/60 uppercase tracking-widest mt-1">Newest Expiry</div>
                </div>
            </div>

            {/* Blocklist */}
            <div className="border border-red-500/20">
                <div className="border-b border-red-500/10 px-4 py-2 flex items-center gap-2">
                    <Ban size={12} className="text-red-400" />
                    <span className="text-[10px] text-red-400 uppercase tracking-widest">IP Blocklist</span>
                </div>
                {blocks.length === 0 ? (
                    <div className="p-6 text-center text-neon-green/30 text-xs flex items-center justify-center gap-2">
                        <ShieldAlert size={14} /> No blocked IPs — SOAR has not fired recently
                    </div>
                ) : (
                    <div className="divide-y divide-red-500/10 max-h-80 overflow-y-auto">
                        {blocks.map((b: any) => (
                            <div key={b.ip} className="px-4 py-3 flex items-center justify-between gap-3">
                                <div className="flex-1">
                                    <div className="text-sm font-bold text-red-300 font-mono">{b.ip}</div>
                                    <div className="text-[9px] text-red-400/50 mt-0.5 space-x-3">
                                        {b.reason && <span>{b.reason}</span>}
                                        {b.playbook_triggered && (
                                            <span className="border border-orange-500/30 px-1 text-orange-400">{b.playbook_triggered}</span>
                                        )}
                                        {b.blocked_until && (
                                            <span>until {new Date(b.blocked_until).toLocaleString('pt-BR')}</span>
                                        )}
                                    </div>
                                </div>
                                <button onClick={() => unblock(b.ip)}
                                    className="flex items-center gap-1 text-[8px] border border-neon-green/40 text-neon-green px-2 py-1 hover:bg-neon-green/10 transition-all">
                                    <Unlock size={10} /> UNBLOCK
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
