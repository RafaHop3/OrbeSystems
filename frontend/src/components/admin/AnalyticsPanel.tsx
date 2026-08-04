'use client';

import { useEffect, useState, useCallback } from 'react';
import {
    Activity, Globe, Users, Eye, TrendingUp, AlertTriangle,
    Clock, Wifi, MapPin, Shield, RefreshCw, ChevronDown, ChevronUp
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────

interface VisitLog {
    id: string;
    ip: string;
    city: string | null;
    region: string | null;
    country: string | null;
    isp: string | null;
    user_agent: string | null;
    path: string | null;
    referrer: string | null;
    event_type: string;
    timestamp: string;
    risk_score: number | null;
    threat_tags: string[] | null;
    session_duration: number | null;
}

interface ActiveSession {
    id: string;
    session_id: string;
    ip: string;
    user_agent: string | null;
    current_path: string | null;
    last_activity: string;
    created_at: string;
}

interface VisitStats {
    total_visits: number;
    unique_visitors: number;
    top_paths: { path: string; count: number }[];
    top_countries: { country: string; count: number }[];
    period_days: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function riskColor(score: number | null): string {
    if (score === null) return 'text-neon-green/40';
    if (score >= 0.7) return 'text-red-500';
    if (score >= 0.4) return 'text-yellow-400';
    return 'text-neon-green';
}

function riskLabel(score: number | null): string {
    if (score === null) return 'N/A';
    if (score >= 0.7) return 'HIGH';
    if (score >= 0.4) return 'MED';
    return 'LOW';
}

function parseUA(ua: string | null): string {
    if (!ua) return 'Unknown';
    if (/mobile/i.test(ua)) return '📱 Mobile';
    if (/bot|crawler|spider/i.test(ua)) return '🤖 Bot';
    if (/chrome/i.test(ua)) return '🌐 Chrome';
    if (/firefox/i.test(ua)) return '🦊 Firefox';
    if (/safari/i.test(ua)) return '🧭 Safari';
    return '💻 Desktop';
}

function formatDuration(secs: number | null): string {
    if (secs === null || secs === 0) return '—';
    if (secs < 60) return `${secs}s`;
    return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

function relativeTime(ts: string): string {
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function AnalyticsPanel() {
    const [stats, setStats] = useState<VisitStats | null>(null);
    const [visits, setVisits] = useState<VisitLog[]>([]);
    const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [statsDays, setStatsDays] = useState(7);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [filterRisk, setFilterRisk] = useState<'all' | 'high' | 'med'>('all');
    const [lastRefresh, setLastRefresh] = useState(new Date());

    const BACKEND = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');

    const fetchAll = useCallback(async () => {
        try {
            const token = localStorage.getItem('orbe_admin_token');
            const h = { Authorization: `Bearer ${token}` };

            const [statsRes, visitsRes, activeRes] = await Promise.all([
                fetch(`${BACKEND}/api/analytics/stats?days=${statsDays}`, { headers: h }),
                fetch(`${BACKEND}/api/analytics/list?limit=100`, { headers: h }),
                fetch(`${BACKEND}/api/analytics/active?minutes=10`, { headers: h }),
            ]);

            if (!statsRes.ok || !visitsRes.ok) throw new Error('Falha ao carregar analytics');

            const statsData = await statsRes.json();
            const visitsData = await visitsRes.json();
            const activeData = activeRes.ok ? await activeRes.json() : { active_sessions: [] };

            setStats(statsData);
            setVisits(visitsData.visits ?? []);
            setActiveSessions(activeData.active_sessions ?? []);
            setLastRefresh(new Date());
            setError('');
        } catch (err: any) {
            setError(err.message || 'Erro de conexão');
        } finally {
            setLoading(false);
        }
    }, [BACKEND, statsDays]);

    useEffect(() => {
        fetchAll();
        const interval = setInterval(fetchAll, 15000); // auto-refresh every 15s
        return () => clearInterval(interval);
    }, [fetchAll]);

    // ── Derived ──────────────────────────────────────────────────────────────

    const filteredVisits = visits.filter(v => {
        if (filterRisk === 'high') return (v.risk_score ?? 0) >= 0.7;
        if (filterRisk === 'med') return (v.risk_score ?? 0) >= 0.4 && (v.risk_score ?? 0) < 0.7;
        return true;
    });

    const highRiskCount = visits.filter(v => (v.risk_score ?? 0) >= 0.7).length;
    const maxPathCount = Math.max(...(stats?.top_paths.map(p => p.count) ?? [1]), 1);
    const maxCountryCount = Math.max(...(stats?.top_countries.map(c => c.count) ?? [1]), 1);

    // ── Render ────────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="border border-neon-green/20 bg-neon-green/5 p-5 min-h-[400px] flex items-center justify-center">
                <div className="flex items-center gap-4 text-neon-green/60 animate-pulse">
                    <Activity size={24} />
                    <span className="font-mono text-sm tracking-widest uppercase">Carregando telemetria de visitantes...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="border border-red-500/20 bg-red-500/5 p-5">
                <div className="text-red-500 font-mono text-xs uppercase tracking-wider mb-2">ANALYTICS OFFLINE</div>
                <p className="text-red-500/70 text-[10px]">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">

            {/* ── Header bar ──────────────────────────────────────────────────── */}
            <div className="border border-neon-green/20 bg-neon-green/5 p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Eye size={14} className="text-neon-green" />
                    <span className="text-xs font-bold text-neon-green uppercase tracking-widest">VISITOR INTELLIGENCE</span>
                    {highRiskCount > 0 && (
                        <span className="flex items-center gap-1 text-red-500 text-[9px] font-mono border border-red-500/30 px-2 py-0.5 animate-pulse">
                            <AlertTriangle size={10} /> {highRiskCount} HIGH RISK
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-[9px] text-neon-green/40 font-mono">
                        SYNC: {lastRefresh.toLocaleTimeString()}
                    </span>
                    <button
                        onClick={fetchAll}
                        className="flex items-center gap-1 text-[9px] text-neon-green/60 hover:text-neon-green border border-neon-green/20 hover:border-neon-green/60 px-2 py-1 transition-all uppercase"
                    >
                        <RefreshCw size={10} /> Refresh
                    </button>
                    {/* Period selector */}
                    {([7, 14, 30] as const).map(d => (
                        <button
                            key={d}
                            onClick={() => setStatsDays(d)}
                            className={`text-[9px] font-mono px-2 py-1 border transition-all uppercase ${statsDays === d
                                ? 'border-neon-green text-neon-green bg-neon-green/10'
                                : 'border-neon-green/20 text-neon-green/40 hover:text-neon-green hover:border-neon-green/60'}`}
                        >
                            {d}d
                        </button>
                    ))}
                </div>
            </div>

            {/* ── KPI Cards ───────────────────────────────────────────────────── */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { icon: <Eye size={16} />, label: 'Total Visits', value: stats.total_visits.toLocaleString(), color: 'text-neon-green' },
                        { icon: <Users size={16} />, label: 'Unique IPs', value: stats.unique_visitors.toLocaleString(), color: 'text-neon-cyan' },
                        { icon: <Wifi size={16} />, label: 'Live Sessions', value: activeSessions.length.toString(), color: 'text-yellow-400' },
                        { icon: <AlertTriangle size={16} />, label: 'High Risk', value: highRiskCount.toString(), color: highRiskCount > 0 ? 'text-red-500' : 'text-neon-green/40' },
                    ].map((kpi, i) => (
                        <div key={i} className="border border-neon-green/20 bg-black/40 p-4">
                            <div className={`flex items-center gap-2 mb-2 ${kpi.color}`}>{kpi.icon}</div>
                            <div className={`text-xl font-bold font-mono ${kpi.color}`}>{kpi.value}</div>
                            <div className="text-[9px] text-neon-green/40 uppercase tracking-widest mt-1">{kpi.label}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Active Sessions ──────────────────────────────────────────────── */}
            {activeSessions.length > 0 && (
                <div className="border border-yellow-400/20 bg-yellow-400/5 p-5">
                    <h2 className="text-xs font-bold border-b border-yellow-400/10 pb-3 mb-4 flex items-center gap-2 text-yellow-400 uppercase">
                        <Wifi size={14} className="animate-pulse" /> LIVE SESSIONS ({activeSessions.length})
                    </h2>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                        {activeSessions.map(s => (
                            <div key={s.id} className="flex items-center justify-between text-[10px] font-mono border border-yellow-400/10 bg-black/40 px-3 py-2">
                                <div className="flex items-center gap-3">
                                    <span className="w-2 h-2 rounded-full bg-yellow-400 animate-ping" />
                                    <span className="text-yellow-400">{s.ip}</span>
                                    <span className="text-neon-green/60">{s.current_path || '/'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-neon-green/40">
                                    <span>{parseUA(s.user_agent)}</span>
                                    <span><Clock size={9} className="inline" /> {relativeTime(s.last_activity)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Top Charts ──────────────────────────────────────────────────── */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Top Pages */}
                    <div className="border border-neon-cyan/20 bg-neon-cyan/5 p-5">
                        <h2 className="text-xs font-bold border-b border-neon-cyan/10 pb-3 mb-4 flex items-center gap-2 text-neon-cyan uppercase">
                            <TrendingUp size={14} /> TOP PAGES ({statsDays}d)
                        </h2>
                        <div className="space-y-3">
                            {stats.top_paths.length === 0 ? (
                                <p className="text-neon-cyan/30 text-[10px] text-center py-4">Sem dados</p>
                            ) : stats.top_paths.slice(0, 8).map((p, i) => (
                                <div key={i} className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono">
                                        <span className="text-neon-cyan/80 truncate max-w-[160px]">{p.path || '/'}</span>
                                        <span className="text-neon-cyan font-bold">{p.count}</span>
                                    </div>
                                    <div className="h-1 bg-black/40 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-neon-cyan/60 transition-all duration-700"
                                            style={{ width: `${(p.count / maxPathCount) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Top Countries */}
                    <div className="border border-neon-green/20 bg-neon-green/5 p-5">
                        <h2 className="text-xs font-bold border-b border-neon-green/10 pb-3 mb-4 flex items-center gap-2 text-neon-green uppercase">
                            <Globe size={14} /> TOP COUNTRIES ({statsDays}d)
                        </h2>
                        <div className="space-y-3">
                            {stats.top_countries.length === 0 ? (
                                <p className="text-neon-green/30 text-[10px] text-center py-4">Sem dados</p>
                            ) : stats.top_countries.slice(0, 8).map((c, i) => (
                                <div key={i} className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono">
                                        <span className="text-neon-green/80">{c.country || 'Unknown'}</span>
                                        <span className="text-neon-green font-bold">{c.count}</span>
                                    </div>
                                    <div className="h-1 bg-black/40 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-neon-green/60 transition-all duration-700"
                                            style={{ width: `${(c.count / maxCountryCount) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Raw Visit Feed ───────────────────────────────────────────────── */}
            <div className="border border-neon-green/20 bg-neon-green/5 p-5">
                <div className="flex items-center justify-between border-b border-neon-green/10 pb-3 mb-4">
                    <h2 className="text-xs font-bold flex items-center gap-2 text-neon-green uppercase">
                        <Shield size={14} /> VISIT LOG FEED
                        <span className="text-[9px] text-neon-green/40 px-2 border border-neon-green/20">{filteredVisits.length} RECORDS</span>
                    </h2>
                    {/* Risk filter */}
                    <div className="flex gap-1">
                        {(['all', 'med', 'high'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilterRisk(f)}
                                className={`text-[9px] font-mono px-2 py-0.5 border uppercase transition-all ${filterRisk === f
                                    ? f === 'high' ? 'border-red-500 text-red-500 bg-red-500/10'
                                        : f === 'med' ? 'border-yellow-400 text-yellow-400 bg-yellow-400/10'
                                            : 'border-neon-green text-neon-green bg-neon-green/10'
                                    : 'border-neon-green/20 text-neon-green/40 hover:text-neon-green hover:border-neon-green/40'
                                    }`}
                            >
                                {f === 'all' ? 'ALL' : f === 'med' ? '⚠ MED+' : '🔴 HIGH'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-neon-green/20">
                    {filteredVisits.length === 0 ? (
                        <div className="text-center py-10 text-neon-green/30 text-[10px] font-mono uppercase">
                            Nenhuma visita encontrada
                        </div>
                    ) : filteredVisits.map(v => (
                        <div
                            key={v.id}
                            className={`border bg-black/40 font-mono transition-all ${(v.risk_score ?? 0) >= 0.7
                                ? 'border-red-500/30 bg-red-500/5'
                                : (v.risk_score ?? 0) >= 0.4
                                    ? 'border-yellow-400/20 bg-yellow-400/5'
                                    : 'border-neon-green/10 hover:border-neon-green/30'
                                }`}
                        >
                            {/* Collapsed row */}
                            <button
                                onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}
                                className="w-full flex items-center justify-between p-3 text-left gap-2"
                            >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    {/* Risk badge */}
                                    <span className={`text-[8px] font-bold w-8 shrink-0 ${riskColor(v.risk_score)}`}>
                                        {riskLabel(v.risk_score)}
                                    </span>
                                    <span className="text-neon-green/80 text-[10px] shrink-0">{v.ip}</span>
                                    <span className="text-neon-green/40 text-[9px] hidden sm:block">
                                        {[v.city, v.country].filter(Boolean).join(', ') || 'Unknown'}
                                    </span>
                                    <span className="text-neon-cyan/60 text-[9px] truncate">{v.path || '/'}</span>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <span className="text-neon-green/30 text-[9px]">{relativeTime(v.timestamp)}</span>
                                    <span className="text-neon-green/30 text-[9px]">{parseUA(v.user_agent)}</span>
                                    {expandedId === v.id ? <ChevronUp size={12} className="text-neon-green/40" /> : <ChevronDown size={12} className="text-neon-green/40" />}
                                </div>
                            </button>

                            {/* Expanded detail */}
                            {expandedId === v.id && (
                                <div className="border-t border-neon-green/10 p-3 grid grid-cols-2 md:grid-cols-3 gap-3 text-[10px] animate-in fade-in duration-200">
                                    {[
                                        { label: 'IP', value: v.ip },
                                        { label: 'City', value: v.city || '—' },
                                        { label: 'Region', value: v.region || '—' },
                                        { label: 'Country', value: v.country || '—' },
                                        { label: 'ISP', value: v.isp || '—' },
                                        { label: 'Path', value: v.path || '/' },
                                        { label: 'Referrer', value: v.referrer || 'Direct' },
                                        { label: 'Event', value: v.event_type },
                                        { label: 'Duration', value: formatDuration(v.session_duration) },
                                        { label: 'Risk Score', value: v.risk_score !== null ? `${(v.risk_score * 100).toFixed(0)}%` : '—' },
                                        { label: 'Timestamp', value: new Date(v.timestamp).toLocaleString() },
                                        { label: 'User Agent', value: v.user_agent?.slice(0, 60) + '...' || '—' },
                                    ].map(f => (
                                        <div key={f.label}>
                                            <span className="text-neon-green/30 uppercase tracking-widest text-[8px] block">{f.label}</span>
                                            <span className="text-neon-green/80 break-all">{f.value}</span>
                                        </div>
                                    ))}
                                    {/* Threat tags */}
                                    {v.threat_tags && v.threat_tags.length > 0 && (
                                        <div className="col-span-full">
                                            <span className="text-neon-green/30 uppercase tracking-widest text-[8px] block mb-1">Threat Tags</span>
                                            <div className="flex flex-wrap gap-1">
                                                {v.threat_tags.map((tag, i) => (
                                                    <span key={i} className="text-red-500 border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[9px]">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {/* ID */}
                                    <div className="col-span-full">
                                        <span className="text-neon-green/20 tracking-widest text-[8px]">ID: {v.id}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Compliance notice ───────────────────────────────────────────── */}
            <div className="border border-neon-green/10 p-3 text-[9px] text-neon-green/30 font-mono flex items-start gap-2">
                <MapPin size={10} className="mt-0.5 shrink-0" />
                <span>
                    LGPD/GDPR COMPLIANCE: Os dados coletados (IP, GeoIP, User-Agent, path) são dados de acesso de rede,
                    legítimos para fins de segurança e analytics agregado. IPs completos são armazenados internamente
                    e nunca expostos publicamente. Dados retidos por padrão por 90 dias.
                </span>
            </div>
        </div>
    );
}
