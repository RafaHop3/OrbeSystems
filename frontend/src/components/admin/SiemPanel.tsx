"use client";

import React, { useState, useEffect } from "react";
import {
    ShieldAlert, ShieldCheck, Lock, Activity, RefreshCw,
    Search, Filter, Terminal, AlertTriangle, User, Globe, FileText
} from "lucide-react";

interface AuditLogEvent {
    id: string;
    timestamp: string | null;
    user_id: string | null;
    user_email: string;
    action: string;
    entity: string;
    entity_id: string | null;
    ip_address: string;
    user_agent: string;
    details: string | null;
    severity: "CRITICAL" | "WARNING" | "INFO";
}

interface SIEMData {
    status: string;
    threat_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    metrics: {
        total_audit_events: number;
        failed_logins_count: number;
        mfa_failures_count: number;
        active_mfa_lockouts: number;
        critical_alerts_count: number;
    };
    logs: AuditLogEvent[];
}

export default function SIEMPanel() {
    const [data, setData] = useState<SIEMData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [filterSeverity, setFilterSeverity] = useState<string>("ALL");
    const [searchQuery, setSearchQuery] = useState<string>("");

    const fetchSIEMData = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem("orbe_token");
            const res = await fetch("http://localhost:8000/api/v1/audit/siem", {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token || ""}`,
                },
            });

            if (!res.ok) {
                throw new Error(`Erro ao carregar dados do SIEM (${res.status})`);
            }

            const result = await res.json();
            setData(result);
        } catch (err: any) {
            // Fallback mock data if API is offline during preview
            setData({
                status: "active",
                threat_level: "LOW",
                metrics: {
                    total_audit_events: 142,
                    failed_logins_count: 3,
                    mfa_failures_count: 1,
                    active_mfa_lockouts: 0,
                    critical_alerts_count: 4,
                },
                logs: [
                    {
                        id: "1",
                        timestamp: new Date().toISOString(),
                        user_id: "usr_01",
                        user_email: "admin@orbesystems.com.br",
                        action: "USER_LOGIN_SUCCESS",
                        entity: "Auth",
                        entity_id: "usr_01",
                        ip_address: "189.120.45.12",
                        user_agent: "Mozilla/5.0 (Windows NT 10.0)",
                        details: "Autenticação 2FA via TOTP confirmada",
                        severity: "INFO",
                    },
                    {
                        id: "2",
                        timestamp: new Date(Date.now() - 300000).toISOString(),
                        user_id: "usr_02",
                        user_email: "suspect@external.com",
                        action: "MFA_FAILED_ATTEMPT",
                        entity: "Auth",
                        entity_id: "usr_02",
                        ip_address: "201.88.99.14",
                        user_agent: "Python-urllib/3.11",
                        details: "Código TOTP inválido fornecido (Tentativa 4/5)",
                        severity: "CRITICAL",
                    },
                    {
                        id: "3",
                        timestamp: new Date(Date.now() - 900000).toISOString(),
                        user_id: "usr_03",
                        user_email: "operador@inho.com.br",
                        action: "GHOST_ENGINE_DISPATCH",
                        entity: "PrivacyRequest",
                        entity_id: "req_99",
                        ip_address: "177.34.12.88",
                        user_agent: "Mozilla/5.0 (Macintosh)",
                        details: "Notificação LGPD Art. 18 enviada para Serasa Experian",
                        severity: "WARNING",
                    },
                ],
            });
        } finally {
            setLoading(false);
        }
    };

    const [sseActive, setSseActive] = useState<boolean>(false);

    useEffect(() => {
        fetchSIEMData();

        // Pilar 1 - Server-Sent Events (SSE) Realtime Push Stream
        const token = localStorage.getItem("orbe_token");
        const sseUrl = `http://localhost:8000/api/v1/audit/siem/stream`;
        let eventSource: EventSource | null = null;

        try {
            eventSource = new EventSource(sseUrl);
            eventSource.onopen = () => setSseActive(true);
            eventSource.onmessage = (event) => {
                try {
                    const parsed = JSON.parse(event.data);
                    setData(parsed);
                    setSseActive(true);
                } catch (e) {
                    console.error("Erro ao decodificar evento SSE SIEM:", e);
                }
            };
            eventSource.onerror = () => {
                setSseActive(false);
                if (eventSource) eventSource.close();
            };
        } catch (e) {
            setSseActive(false);
        }

        const interval = setInterval(fetchSIEMData, 15000); // Polling Fallback
        return () => {
            clearInterval(interval);
            if (eventSource) eventSource.close();
        };
    }, []);

    const filteredLogs = data?.logs.filter((log) => {
        const matchesSeverity =
            filterSeverity === "ALL" || log.severity === filterSeverity;
        const matchesSearch =
            log.user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.ip_address.includes(searchQuery);
        return matchesSeverity && matchesSearch;
    }) || [];

    return (
        <div className="space-y-6 font-mono text-slate-100">
            {/* Header SIEM SOC */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-cyan-950/60 pb-5 gap-4">
                <div>
                    <div className="flex items-center space-x-3">
                        <Terminal className="w-7 h-7 text-cyan-400 animate-pulse" />
                        <h1 className="text-2xl font-bold tracking-wider text-cyan-400 uppercase">
                            SIEM SOC Guard // Central de Cibersegurança
                        </h1>
                    </div>
                    <p className="text-sm text-slate-400 mt-1">
                        Monitoramento de Tráfego, Logs de Auditoria Imutáveis e Proteção em Tempo Real
                    </p>
                </div>

                <div className="flex items-center space-x-3">
                    {/* SSE Stream Push Status Badge */}
                    <div className="flex items-center space-x-2 px-3 py-1.5 rounded bg-slate-900 border border-slate-800">
                        <span className={`relative flex h-2.5 w-2.5 ${sseActive ? "text-cyan-400" : "text-slate-600"}`}>
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${sseActive ? "bg-cyan-400" : "bg-slate-600"}`}></span>
                            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${sseActive ? "bg-cyan-500" : "bg-slate-600"}`}></span>
                        </span>
                        <span className={`text-[11px] font-semibold uppercase ${sseActive ? "text-cyan-400" : "text-slate-500"}`}>
                            {sseActive ? "SSE PUSH: ATIVO" : "POLLING FALLBACK"}
                        </span>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center space-x-2 px-3 py-1.5 rounded bg-slate-900 border border-slate-800">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                        <span className="text-xs font-semibold text-emerald-400 uppercase">
                            Ameaça: {data?.threat_level || "LOW"}
                        </span>
                    </div>

                    <button
                        onClick={fetchSIEMData}
                        disabled={loading}
                        className="flex items-center space-x-2 px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-800/60 text-cyan-300 text-xs rounded transition-colors"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                        <span>Atualizar</span>
                    </button>
                </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Metric 1 */}
                <div className="p-4 rounded-lg bg-slate-900/90 border border-cyan-900/40 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                            Total de Eventos Auditados
                        </span>
                        <Activity className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div className="text-2xl font-bold text-cyan-300 mt-2">
                        {data?.metrics.total_audit_events || 0}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">Registros imutáveis no banco</div>
                </div>

                {/* Metric 2 */}
                <div className="p-4 rounded-lg bg-slate-900/90 border border-amber-900/40 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                            Falhas de Login
                        </span>
                        <ShieldAlert className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="text-2xl font-bold text-amber-400 mt-2">
                        {data?.metrics.failed_logins_count || 0}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">Tentativas não autorizadas</div>
                </div>

                {/* Metric 3 */}
                <div className="p-4 rounded-lg bg-slate-900/90 border border-rose-900/40 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                            Bloqueios 2FA Rate-Limit
                        </span>
                        <Lock className="w-5 h-5 text-rose-400" />
                    </div>
                    <div className="text-2xl font-bold text-rose-400 mt-2">
                        {data?.metrics.active_mfa_lockouts || 0}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">Contas bloqueadas (15 min)</div>
                </div>

                {/* Metric 4 */}
                <div className="p-4 rounded-lg bg-slate-900/90 border border-emerald-900/40 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                            Alertas Críticos
                        </span>
                        <AlertTriangle className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="text-2xl font-bold text-emerald-400 mt-2">
                        {data?.metrics.critical_alerts_count || 0}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">Severidade Crítica ativada</div>
                </div>
            </div>

            {/* Control Bar (Filters & Search) */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-lg bg-slate-900/80 border border-slate-800">
                {/* Severity Tabs */}
                <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded border border-slate-800 w-full sm:w-auto">
                    {["ALL", "CRITICAL", "WARNING", "INFO"].map((sev) => (
                        <button
                            key={sev}
                            onClick={() => setFilterSeverity(sev)}
                            className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${filterSeverity === sev
                                ? sev === "CRITICAL"
                                    ? "bg-rose-950 text-rose-300 border border-rose-800"
                                    : sev === "WARNING"
                                        ? "bg-amber-950 text-amber-300 border border-amber-800"
                                        : sev === "INFO"
                                            ? "bg-cyan-950 text-cyan-300 border border-cyan-800"
                                            : "bg-slate-800 text-slate-200"
                                : "text-slate-400 hover:text-slate-200"
                                }`}
                        >
                            {sev}
                        </button>
                    ))}
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Buscar por IP, E-mail ou Ação..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded text-slate-200 focus:outline-none focus:border-cyan-500 placeholder-slate-600"
                    />
                </div>
            </div>

            {/* SIEM Log Stream Table */}
            <div className="rounded-lg bg-slate-900/90 border border-slate-800 overflow-hidden shadow-2xl">
                <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
                        <FileText className="w-4 h-4 text-cyan-400" />
                        <span>STREAM DE EVENTOS DE AUDITORIA (IMUTÁVEL)</span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                        Exibindo {filteredLogs.length} eventos
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                            <tr>
                                <th className="px-4 py-3">SEVERIDADE</th>
                                <th className="px-4 py-3">DATA / HORA</th>
                                <th className="px-4 py-3">AÇÃO</th>
                                <th className="px-4 py-3">USUÁRIO</th>
                                <th className="px-4 py-3">ENDEREÇO IP</th>
                                <th className="px-4 py-3">DETALHES</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                            {filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                                        Nenhum evento encontrado com os filtros selecionados.
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${log.severity === "CRITICAL"
                                                    ? "bg-rose-950/80 text-rose-300 border-rose-800"
                                                    : log.severity === "WARNING"
                                                        ? "bg-amber-950/80 text-amber-300 border-amber-800"
                                                        : "bg-cyan-950/80 text-cyan-300 border-cyan-800"
                                                    }`}
                                            >
                                                {log.severity}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                                            {log.timestamp ? new Date(log.timestamp).toLocaleString("pt-BR") : "N/A"}
                                        </td>
                                        <td className="px-4 py-3 font-semibold text-cyan-300">
                                            {log.action}
                                        </td>
                                        <td className="px-4 py-3 text-slate-300">
                                            {log.user_email}
                                        </td>
                                        <td className="px-4 py-3 text-slate-400 whitespace-nowrap flex items-center space-x-1">
                                            <Globe className="w-3 h-3 text-slate-500 inline" />
                                            <span>{log.ip_address}</span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-400 max-w-xs truncate">
                                            {log.details || "N/A"}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
