'use client';
import { useEffect, useState } from 'react';
import { Package, AlertTriangle } from 'lucide-react';

const LICENSE_COLORS: Record<string, string> = {
    MIT: 'bg-neon-green',
    Apache: 'bg-neon-cyan',
    BSD: 'bg-blue-400',
    GPL: 'bg-red-500',
    LGPL: 'bg-orange-500',
    ISC: 'bg-blue-400',
    Other: 'bg-yellow-500',
};

export default function SbomPanel({ apiUrl, token }: { apiUrl: string; token: string }) {
    const [licenses, setLicenses] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const h = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const res = await fetch(`${apiUrl}/api/admin/sbom/licenses`, { headers: h });
                if (res.ok) setLicenses(await res.json());
            } finally { setLoading(false); }
        };
        load();
    }, []);

    if (loading) return <div className="text-neon-green/40 text-xs animate-pulse">SCANNING SBOM...</div>;
    if (!licenses) return <div className="text-red-400 text-xs">Failed to load SBOM data.</div>;

    const summary: Record<string, number> = licenses.summary || licenses.license_summary || {};
    const deps: any[] = licenses.dependencies || licenses.packages || [];
    const hasGpl = Object.keys(summary).some(k => k.toLowerCase().includes('gpl'));
    const total = Object.values(summary).reduce((a: number, b: any) => a + Number(b), 0);

    return (
        <div className="space-y-4">
            {/* GPL Warning */}
            {hasGpl && (
                <div className="flex items-center gap-2 border border-red-500/40 bg-red-500/10 p-3 text-red-400 text-xs">
                    <AlertTriangle size={14} /> GPL license detected — legal review required before distribution
                </div>
            )}

            {/* License Donut (CSS bar chart) */}
            <div className="border border-neon-cyan/20 bg-neon-cyan/5 p-4">
                <p className="text-[9px] text-neon-cyan/50 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Package size={10} /> License Distribution — {total} dependencies
                </p>
                <div className="flex h-4 w-full rounded-sm overflow-hidden mb-3">
                    {Object.entries(summary).map(([lic, count]: [string, any]) => {
                        const grp = Object.keys(LICENSE_COLORS).find(k => lic.startsWith(k)) || 'Other';
                        return (
                            <div
                                key={lic}
                                className={`${LICENSE_COLORS[grp] || 'bg-gray-500'} transition-all`}
                                style={{ width: `${Math.round((Number(count) / total) * 100)}%` }}
                                title={`${lic}: ${count}`}
                            />
                        );
                    })}
                </div>
                <div className="flex flex-wrap gap-3">
                    {Object.entries(summary).map(([lic, count]: [string, any]) => {
                        const grp = Object.keys(LICENSE_COLORS).find(k => lic.startsWith(k)) || 'Other';
                        return (
                            <div key={lic} className="flex items-center gap-1.5 text-[9px]">
                                <span className={`w-2 h-2 rounded-full ${LICENSE_COLORS[grp] || 'bg-gray-500'}`} />
                                <span className="text-neon-green/70">{lic}</span>
                                <span className="text-neon-green font-bold">{count}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Dependency Table */}
            {deps.length > 0 && (
                <div className="border border-neon-green/20">
                    <div className="border-b border-neon-green/10 px-4 py-2 text-[10px] text-neon-cyan uppercase tracking-widest">
                        Dependency Manifest
                    </div>
                    <div className="divide-y divide-neon-green/10 max-h-64 overflow-y-auto">
                        {deps.slice(0, 50).map((d: any, i: number) => (
                            <div key={i} className="px-4 py-2 flex items-center justify-between text-[9px]">
                                <span className="text-white font-mono">{d.name || d.package}</span>
                                <span className="text-neon-green/50">{d.version}</span>
                                <span className={`px-2 py-0.5 border rounded-full text-[8px] ${(d.license || '').includes('GPL')
                                        ? 'border-red-500/40 text-red-400'
                                        : 'border-neon-green/30 text-neon-green/70'
                                    }`}>{d.license || 'Unknown'}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
