"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
    Shield, ShieldAlert, Send, RefreshCw, Lock, Ghost,
    AlertTriangle, CheckCircle, Clock, ExternalLink,
    Eye, Trash2, Zap, TrendingUp, Activity, Search, Filter,
    Database, Mail, Globe, CheckSquare, Square, Download, Copy, Check
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter, useSearchParams } from "next/navigation";
import { getAuthTokenAction } from "@/lib/auth-actions";
import brokersCatalogData from "@/data/ghost_brokers.json";

interface BrokerItem {
    id: string;
    name: string;
    domain: string;
    category: string;
    method: "DPO_EMAIL" | "PLAYWRIGHT_DOM" | "HTTP_API";
    status: "ONLINE" | "STANDBY" | "CLOUDFLARE_PROTECTED";
    dpo_email?: string;
    optout_url?: string;
    sla_days: number;
}

interface EvidenceLedgerItem {
    broker_id: string;
    broker_name: string;
    domain: string;
    category: string;
    method: string;
    status: string;
    timestamp: string;
    protocol: string;
    audit_hash: string;
    target_endpoint?: string;
    sla_days: number;
    details: string;
}

interface SweepResult {
    batch_id: string;
    batch_hash_sha256: string;
    timestamp: string;
    total_targets: number;
    dispatched: number;
    client: {
        name: string;
        masked_cpf: string;
        email: string;
    };
    evidence_ledger: EvidenceLedgerItem[];
}

interface OptOutTicket {
    id: string;
    target_broker: string;
    status: string;
    logs: string;
    proof_url?: string;
    created_at: string;
}

const API_URL = "/api/proxy";

// ── Security Animation Canvas ─────────────────────────────────────────────────
function EncryptionAnimation() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        const chars = "01AES█▓▒░LGPD∑∞§SHA256";
        const particles: { x: number; y: number; speed: number; char: string; opacity: number }[] = [];

        for (let i = 0; i < 40; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                speed: 0.3 + Math.random() * 0.7,
                char: chars[Math.floor(Math.random() * chars.length)],
                opacity: Math.random() * 0.5 + 0.1,
            });
        }

        let animId: number;
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.font = "10px monospace";

            particles.forEach((p) => {
                ctx.fillStyle = `rgba(0, 255, 245, ${p.opacity})`;
                ctx.fillText(p.char, p.x, p.y);
                p.y += p.speed;
                p.opacity -= 0.003;
                if (p.y > canvas.height || p.opacity <= 0) {
                    p.y = 0;
                    p.x = Math.random() * canvas.width;
                    p.opacity = Math.random() * 0.5 + 0.1;
                }
            });
            animId = requestAnimationFrame(animate);
        };
        animate();

        return () => cancelAnimationFrame(animId);
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full opacity-25 pointer-events-none"
        />
    );
}

export default function DataBrokerOptOutPage() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPassUnlocked, setIsPassUnlocked] = useState(false);
    const [isStripeLoading, setIsStripeLoading] = useState(false);

    useEffect(() => {
        if (searchParams.get("unlocked") === "true") {
            setIsPassUnlocked(true);
            try { localStorage.setItem("orbe_ghost_unlocked", "true"); } catch (e) {}
        } else {
            try {
                if (localStorage.getItem("orbe_ghost_unlocked") === "true") {
                    setIsPassUnlocked(true);
                }
            } catch (e) {}
        }
    }, [searchParams]);

    const isUnlocked = user?.role === "premium" || isPassUnlocked;

    const handleStripeUnlock = async () => {
        setIsStripeLoading(true);
        try {
            const res = await fetch("/api/v1/ghost/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: user?.email, return_url: window.location.href }),
            });
            const data = await res.json();
            if (data.checkout_url) {
                window.location.href = data.checkout_url;
            } else {
                alert(data.error || "Erro ao conectar com Stripe.");
            }
        } catch {
            alert("Erro de conexão ao iniciar checkout do Stripe.");
        } finally {
            setIsStripeLoading(false);
        }
    };
    const [tickets, setTickets] = useState<OptOutTicket[]>([]);
    const [sseStatus, setSseStatus] = useState<"connecting" | "live" | "error">("connecting");
    const esRef = useRef<EventSource | null>(null);

    // Form state
    const [fullName, setFullName] = useState("");
    const [cpf, setCpf] = useState("");
    const [email, setEmail] = useState("");
    const [acceptLgpd, setAcceptLgpd] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formStep, setFormStep] = useState<"form" | "encrypting" | "done">("form");

    // 50+ Brokers Matrix filters & selection
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [selectedMethod, setSelectedMethod] = useState("all");
    const [selectedBrokers, setSelectedBrokers] = useState<string[]>(
        brokersCatalogData.map((b) => b.id)
    );
    const [activeTab, setActiveTab] = useState<"matrix" | "ledger" | "legacy">("matrix");
    const [sweepResult, setSweepResult] = useState<SweepResult | null>(null);
    const [copiedHash, setCopiedHash] = useState<string | null>(null);

    // CPF mask
    const handleCpfChange = (v: string) => {
        const digits = v.replace(/\D/g, "").slice(0, 11);
        const masked = digits
            .replace(/(\d{3})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
        setCpf(masked);
    };

    // Filtered brokers
    const categories = useMemo(() => {
        const cats = new Set(brokersCatalogData.map((b) => b.category));
        return Array.from(cats);
    }, []);

    const filteredBrokers = useMemo(() => {
        return (brokersCatalogData as BrokerItem[]).filter((b) => {
            const matchCat = selectedCategory === "all" || b.category.toLowerCase() === selectedCategory.toLowerCase();
            const matchMethod = selectedMethod === "all" || b.method.toLowerCase() === selectedMethod.toLowerCase();
            const matchQuery =
                !searchQuery ||
                b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                b.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
                b.category.toLowerCase().includes(searchQuery.toLowerCase());
            return matchCat && matchMethod && matchQuery;
        });
    }, [selectedCategory, selectedMethod, searchQuery]);

    const toggleSelectAll = () => {
        if (selectedBrokers.length === brokersCatalogData.length) {
            setSelectedBrokers([]);
        } else {
            setSelectedBrokers(brokersCatalogData.map((b) => b.id));
        }
    };

    const toggleBroker = (id: string) => {
        setSelectedBrokers((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedHash(id);
        setTimeout(() => setCopiedHash(null), 2000);
    };

    // ── Batch Execution across selected 50+ brokers ───────────────────────
    const executeGhostSweep = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!acceptLgpd || selectedBrokers.length === 0) return;
        setLoading(true);
        setFormStep("encrypting");

        try {
            const res = await fetch("/api/v1/ghost/sweep", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    full_name: fullName,
                    cpf,
                    email: email || user?.email,
                    target_ids: selectedBrokers,
                }),
            });

            if (res.ok) {
                const data: SweepResult = await res.json();
                setSweepResult(data);
                setFormStep("done");
                setActiveTab("ledger");
            } else {
                const err = await res.json();
                alert(err.error || "Falha ao deflagrar varredura distribuída.");
                setFormStep("form");
            }
        } catch (e: any) {
            alert("Erro de conexão com o backbone da Orbe Systems.");
            setFormStep("form");
        } finally {
            setLoading(false);
        }
    };

    // Fetch legacy tickets
    const fetchTickets = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/api/optout/list`, {
                credentials: "include",
            });
            if (res.ok) setTickets(await res.json());
        } catch (e) {
            console.error("Refresh failed", e);
        }
    }, []);

    useEffect(() => {
        if (!user) return;
        if (user.role !== "premium") {
            router.push("/assinar?from=databroker");
            return;
        }
        fetchTickets();
    }, [user, router, fetchTickets]);

    return (
        <div className="min-h-screen bg-[#030508] text-white font-mono pb-24 selection:bg-[#00fff5] selection:text-black">
            <style>{`
                @keyframes scan {
                  0% { transform: translateX(-100%); }
                  100% { transform: translateX(400%); }
                }
                @keyframes pulseGlow {
                  0%, 100% { opacity: 0.6; }
                  50% { opacity: 1; }
                }
                .glow-border { box-shadow: 0 0 25px rgba(0, 255, 245, 0.15); }
            `}</style>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 space-y-8">
                {/* ── Top Header Badge & Title ─────────────────────────────────────── */}
                <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#00fff5]/10 border border-[#00fff5]/30 rounded-full text-[10px] text-[#00fff5] uppercase font-bold tracking-widest">
                        <Activity size={12} className="animate-pulse" />
                        GHOST ENGINE v2.0 // MOTOR DISTRIBUÍDO DE DESINDEXAÇÃO
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight flex items-center gap-3">
                                <Ghost size={38} className="text-[#00fff5] animate-pulse" />
                                Data Broker <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00fff5] via-sky-400 to-emerald-400">Demolition Engine</span>
                            </h1>
                            <p className="text-slate-400 text-sm mt-2 max-w-3xl leading-relaxed">
                                Varredura massiva e desindexação de registros pessoais em <strong className="text-white">mais de 50 Data Brokers, agregadores de CNPJ e diretórios OSINT</strong> com prova criptográfica em <strong className="text-[#00fff5]">Hash SHA-256</strong> e notificações jurídicas sob o <strong className="text-emerald-400">Art. 18 da LGPD</strong>.
                            </p>
                        </div>

                        {/* Top Action Tabs */}
                        <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800">
                            <button
                                onClick={() => setActiveTab("matrix")}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                                    activeTab === "matrix"
                                        ? "bg-[#00fff5] text-black shadow-lg shadow-[#00fff5]/20"
                                        : "text-slate-400 hover:text-white"
                                }`}
                            >
                                <Database size={14} /> Matriz 50+ Sites ({brokersCatalogData.length})
                            </button>
                            {sweepResult && (
                                <button
                                    onClick={() => setActiveTab("ledger")}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                                        activeTab === "ledger"
                                            ? "bg-[#00fff5] text-black shadow-lg shadow-[#00fff5]/20"
                                            : "text-slate-400 hover:text-white"
                                    }`}
                                >
                                    <Shield size={14} /> Livro Razão ({sweepResult.dispatched})
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── High-Level Architecture Metrics ─────────────────────────────── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-950/60 rounded-xl border border-cyan-500/20 p-4">
                        <div className="flex items-center gap-2 mb-1 text-slate-400 text-xs font-mono">
                            <Database size={16} className="text-[#00fff5]" /> ALVOS CATALOGADOS
                        </div>
                        <p className="text-3xl font-extrabold text-[#00fff5]">
                            {brokersCatalogData.length}
                        </p>
                        <span className="text-[10px] text-slate-500">Bureaus, CNPJs e OSINT</span>
                    </div>

                    <div className="bg-slate-950/60 rounded-xl border border-emerald-500/20 p-4">
                        <div className="flex items-center gap-2 mb-1 text-slate-400 text-xs font-mono">
                            <Mail size={16} className="text-emerald-400" /> NOTIFICAÇÃO DPO ART. 18
                        </div>
                        <p className="text-3xl font-extrabold text-emerald-400">
                            {brokersCatalogData.filter((b) => b.method === "DPO_EMAIL").length}
                        </p>
                        <span className="text-[10px] text-slate-500">SMTP com DKIM/SPF Oficial</span>
                    </div>

                    <div className="bg-slate-950/60 rounded-xl border border-sky-500/20 p-4">
                        <div className="flex items-center gap-2 mb-1 text-slate-400 text-xs font-mono">
                            <Globe size={16} className="text-sky-400" /> PLAYWRIGHT STEALTH DOM
                        </div>
                        <p className="text-3xl font-extrabold text-sky-400">
                            {brokersCatalogData.filter((b) => b.method === "PLAYWRIGHT_DOM").length}
                        </p>
                        <span className="text-[10px] text-slate-500">Automação de Formulário</span>
                    </div>

                    <div className="bg-slate-950/60 rounded-xl border border-purple-500/20 p-4">
                        <div className="flex items-center gap-2 mb-1 text-slate-400 text-xs font-mono">
                            <Lock size={16} className="text-purple-400" /> ZERO-KNOWLEDGE RAM
                        </div>
                        <p className="text-3xl font-extrabold text-purple-400">
                            AES-256
                        </p>
                        <span className="text-[10px] text-slate-500">Cofre em Memória Efêmera</span>
                    </div>
                </div>

                {/* ── Main Layout: Execution Form + Interactive Matrix ───────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* ── Left Column: Form de Disparo (4 cols) ────────────────────── */}
                    <div className="lg:col-span-4 bg-slate-950/80 border border-cyan-500/30 rounded-2xl p-6 relative overflow-hidden glow-border">
                        <EncryptionAnimation />
                        <div className="relative z-10 space-y-4">
                            <div>
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Zap size={18} className="text-[#00fff5]" /> Deflagrar Varredura
                                </h2>
                                <p className="text-xs text-slate-400 mt-1">
                                    Dados encriptados com chave Fernet transitória antes de qualquer emissão.
                                </p>
                            </div>

                            {formStep === "encrypting" && (
                                <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
                                    <div className="relative w-16 h-16">
                                        <div className="absolute inset-0 rounded-full border-2 border-[#00fff5]/30 animate-ping" />
                                        <div className="absolute inset-2 rounded-full border-2 border-[#00fff5] animate-spin" />
                                        <Lock size={20} className="absolute inset-0 m-auto text-[#00fff5]" />
                                    </div>
                                    <p className="text-[#00fff5] font-bold text-sm">Disparando Ghost Engine...</p>
                                    <p className="text-slate-500 text-xs">Assinando protocolos LGPD para {selectedBrokers.length} brokers</p>
                                </div>
                            )}

                            {formStep === "done" && sweepResult && (
                                <div className="py-8 flex flex-col items-center justify-center text-center gap-3 bg-black/40 border border-emerald-500/30 rounded-xl p-4">
                                    <CheckCircle size={44} className="text-emerald-400" />
                                    <h3 className="text-emerald-400 font-bold text-base">Varredura Concluída com Sucesso!</h3>
                                    <p className="text-xs text-slate-300">
                                        Foram emitidos <strong className="text-white">{sweepResult.dispatched} protocolos</strong> de desindexação.
                                    </p>
                                    <div className="w-full bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 text-[10px] font-mono break-all text-slate-400">
                                        <span className="text-slate-500 block text-[9px] uppercase">Batch Hash SHA-256</span>
                                        {sweepResult.batch_hash_sha256}
                                    </div>
                                    <button
                                        onClick={() => setFormStep("form")}
                                        className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-lg text-white transition-colors"
                                    >
                                        Nova Requisição
                                    </button>
                                </div>
                            )}

                            {formStep === "form" && !isUnlocked ? (
                                <div className="space-y-4 py-2">
                                    <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-950/40 via-black to-blue-950/40 border border-cyan-500/40 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-950 text-[#00fff5] border border-cyan-500/40 font-bold">
                                                GHOST ENGINE PASS
                                            </span>
                                            <span className="text-xl font-black font-mono text-white">
                                                R$ 19,90
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-300 leading-relaxed">
                                            Desbloqueie o disparo massivo nos <strong className="text-[#00fff5]">54 Data Brokers</strong> com notificações legais aos DPOs (Art. 18 LGPD) e prova criptográfica com Hash SHA-256 no Livro Razão.
                                        </p>
                                        <ul className="text-[11px] text-slate-400 space-y-1 font-sans">
                                            <li className="flex items-center gap-1.5 text-emerald-400">✓ Varredura Completa nos 54 Alvos</li>
                                            <li className="flex items-center gap-1.5 text-emerald-400">✓ Emissão de Notificações DPO com Protocolo</li>
                                            <li className="flex items-center gap-1.5 text-emerald-400">✓ Download de Dossiê Criptográfico JSON</li>
                                        </ul>
                                        <button
                                            type="button"
                                            disabled={isStripeLoading}
                                            onClick={handleStripeUnlock}
                                            className="w-full py-3.5 px-4 rounded-xl font-extrabold text-xs uppercase tracking-wider bg-gradient-to-r from-[#00fff5] to-emerald-400 text-black shadow-lg shadow-[#00fff5]/20 hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                                        >
                                            <Zap size={14} className="fill-black" />
                                            <span>{isStripeLoading ? "INICIANDO STRIPE..." : "LIBERAR POR R$ 19,90 VIA STRIPE"}</span>
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-slate-500 text-center font-mono">
                                        🔒 Checkout seguro processado via Stripe • Acesso instantâneo
                                    </p>
                                </div>
                            ) : formStep === "form" && (
                                <form onSubmit={executeGhostSweep} className="space-y-4">
                                    <div>
                                        <label className="block text-[11px] uppercase tracking-wider text-slate-400 mb-1">
                                            Nome Completo do Titular
                                        </label>
                                        <input
                                            required
                                            type="text"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            className="w-full bg-black/60 border border-slate-800 focus:border-[#00fff5] text-white px-3 py-2.5 rounded-xl text-sm focus:outline-none transition-colors"
                                            placeholder="Ex: Rafael Machado"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
                                            <span>CPF do Requerente</span>
                                            <span className="text-emerald-400 text-[10px] lowercase flex items-center gap-1">
                                                <Lock size={10} /> ram encryption
                                            </span>
                                        </label>
                                        <input
                                            required
                                            type="text"
                                            value={cpf}
                                            onChange={(e) => handleCpfChange(e.target.value)}
                                            className="w-full bg-black/60 border border-slate-800 focus:border-[#00fff5] text-white px-3 py-2.5 rounded-xl text-sm focus:outline-none transition-colors font-mono tracking-wider"
                                            placeholder="000.000.000-00"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] uppercase tracking-wider text-slate-400 mb-1">
                                            E-mail do Titular (Para Resposta do DPO)
                                        </label>
                                        <input
                                            required
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full bg-black/60 border border-slate-800 focus:border-[#00fff5] text-white px-3 py-2.5 rounded-xl text-sm focus:outline-none transition-colors"
                                            placeholder="seu.email@dominio.com"
                                        />
                                        <span className="text-[10px] text-slate-500 mt-1 block">
                                            Inserido no Reply-To do cabeçalho SMTP legal da notificação.
                                        </span>
                                    </div>

                                    {/* Selection badge info */}
                                    <div className="bg-black/50 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                                        <span className="text-slate-400">Alvos Selecionados:</span>
                                        <span className="font-bold text-[#00fff5] font-mono">
                                            {selectedBrokers.length} / {brokersCatalogData.length} brokers
                                        </span>
                                    </div>

                                    {/* LGPD Consent */}
                                    <div className="bg-cyan-950/20 border border-cyan-500/20 rounded-xl p-3">
                                        <label className="flex items-start gap-2.5 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                required
                                                checked={acceptLgpd}
                                                onChange={(e) => setAcceptLgpd(e.target.checked)}
                                                className="mt-0.5 accent-[#00fff5]"
                                            />
                                            <span className="text-[11px] text-slate-300 leading-relaxed font-sans">
                                                Outorgo representação à <strong className="text-white">Orbe Systems</strong> para notificação formal e desindexação de registros pessoais com amparo no <strong className="text-[#00fff5]">Art. 18, IV e VI da Lei nº 13.709/2018 (LGPD)</strong>.
                                            </span>
                                        </label>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading || !acceptLgpd || selectedBrokers.length === 0}
                                        className="w-full py-3.5 px-4 rounded-xl font-extrabold text-sm uppercase tracking-wider bg-gradient-to-r from-[#00fff5] via-sky-400 to-emerald-400 text-black shadow-lg shadow-[#00fff5]/20 hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        <Zap size={16} className="fill-black" />
                                        <span>EXECUTAR GHOST ENGINE ({selectedBrokers.length})</span>
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>

                    {/* ── Right Column: Matriz 50+ Sites ou Livro Razão (8 cols) ───── */}
                    <div className="lg:col-span-8 space-y-4">
                        {activeTab === "matrix" && (
                            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 space-y-5">
                                {/* Search & Filters Header */}
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                                    <div className="relative flex-1">
                                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Buscar broker, domínio ou categoria..."
                                            className="w-full bg-black/60 border border-slate-800 pl-9 pr-4 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-[#00fff5] transition-colors"
                                        />
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={toggleSelectAll}
                                            className="px-3 py-2 rounded-xl text-xs font-mono font-bold border border-slate-700 bg-slate-900 text-slate-300 hover:text-white hover:border-[#00fff5] transition-colors flex items-center gap-1.5"
                                        >
                                            {selectedBrokers.length === brokersCatalogData.length ? (
                                                <>
                                                    <CheckSquare size={14} className="text-[#00fff5]" /> Desmarcar Todos
                                                </>
                                            ) : (
                                                <>
                                                    <Square size={14} /> Selecionar Todos ({brokersCatalogData.length})
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Category Pills */}
                                <div className="flex items-center gap-2 overflow-x-auto pb-2 text-xs scrollbar-thin">
                                    <button
                                        onClick={() => setSelectedCategory("all")}
                                        className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                                            selectedCategory === "all"
                                                ? "bg-[#00fff5]/20 text-[#00fff5] border border-[#00fff5]/40 font-bold"
                                                : "bg-slate-900 text-slate-400 hover:text-white"
                                        }`}
                                    >
                                        Todos ({brokersCatalogData.length})
                                    </button>
                                    {categories.map((cat) => {
                                        const count = brokersCatalogData.filter((b) => b.category === cat).length;
                                        return (
                                            <button
                                                key={cat}
                                                onClick={() => setSelectedCategory(cat)}
                                                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                                                    selectedCategory === cat
                                                        ? "bg-[#00fff5]/20 text-[#00fff5] border border-[#00fff5]/40 font-bold"
                                                        : "bg-slate-900 text-slate-400 hover:text-white"
                                                }`}
                                            >
                                                {cat} ({count})
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Interactive Broker Table */}
                                <div className="border border-slate-800/80 rounded-xl overflow-hidden">
                                    <div className="max-h-[520px] overflow-y-auto divide-y divide-slate-800/60">
                                        {filteredBrokers.map((broker) => {
                                            const isSelected = selectedBrokers.includes(broker.id);
                                            return (
                                                <div
                                                    key={broker.id}
                                                    onClick={() => toggleBroker(broker.id)}
                                                    className={`p-3.5 flex items-center justify-between gap-4 cursor-pointer transition-colors ${
                                                        isSelected
                                                            ? "bg-[#00fff5]/5 hover:bg-[#00fff5]/10"
                                                            : "bg-transparent hover:bg-slate-900/50 opacity-60"
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="text-[#00fff5]">
                                                            {isSelected ? (
                                                                <CheckSquare size={16} />
                                                            ) : (
                                                                <Square size={16} className="text-slate-600" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-white text-xs">
                                                                    {broker.name}
                                                                </span>
                                                                <span className="text-[10px] text-slate-500 font-mono">
                                                                    {broker.domain}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="text-[9px] px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                                                                    {broker.category}
                                                                </span>
                                                                <span className="text-[9px] text-slate-500">
                                                                    SLA: {broker.sla_days}d
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        {broker.method === "DPO_EMAIL" ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-mono bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                                                                <Mail size={10} /> DPO LEGAL
                                                            </span>
                                                        ) : broker.method === "PLAYWRIGHT_DOM" ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-mono bg-sky-950/60 text-sky-400 border border-sky-500/30">
                                                                <Globe size={10} /> PLAYWRIGHT
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-mono bg-purple-950/60 text-purple-400 border border-purple-500/30">
                                                                <Database size={10} /> REST API
                                                            </span>
                                                        )}

                                                        <span
                                                            className={`w-2 h-2 rounded-full ${
                                                                broker.status === "ONLINE"
                                                                    ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                                                                    : broker.status === "CLOUDFLARE_PROTECTED"
                                                                    ? "bg-amber-400 shadow-[0_0_8px_#fbbf24]"
                                                                    : "bg-slate-500"
                                                            }`}
                                                            title={`Status do conector: ${broker.status}`}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Evidence Ledger View ───────────────────────────────────────── */}
                        {activeTab === "ledger" && sweepResult && (
                            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 space-y-5">
                                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                                    <div>
                                        <h2 className="text-base font-bold text-white flex items-center gap-2">
                                            <Shield size={18} className="text-emerald-400" />
                                            Livro Razão de Auditoria Criptográfica
                                        </h2>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            Batch ID: <span className="font-mono text-[#00fff5]">{sweepResult.batch_id}</span>
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => {
                                            const blob = new Blob([JSON.stringify(sweepResult, null, 2)], { type: "application/json" });
                                            const url = URL.createObjectURL(blob);
                                            const a = document.createElement("a");
                                            a.href = url;
                                            a.download = `${sweepResult.batch_id}.json`;
                                            a.click();
                                        }}
                                        className="px-3.5 py-2 rounded-xl text-xs font-bold border border-emerald-500/40 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/50 flex items-center gap-1.5 transition-colors"
                                    >
                                        <Download size={13} /> Exportar Prova JSON
                                    </button>
                                </div>

                                <div className="border border-slate-800 rounded-xl overflow-hidden max-h-[500px] overflow-y-auto divide-y divide-slate-800/60">
                                    {sweepResult.evidence_ledger.map((item) => (
                                        <div key={item.broker_id} className="p-3.5 bg-black/40 hover:bg-slate-900/40 transition-colors space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-white">{item.broker_name}</span>
                                                    <span className="text-[10px] text-slate-500 font-mono">{item.domain}</span>
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                                                        {item.category}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                                                    {item.protocol}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between gap-4 text-[10px] font-mono text-slate-400">
                                                <div className="flex items-center gap-1 truncate max-w-md">
                                                    <span className="text-slate-600">SHA-256:</span>
                                                    <span className="truncate text-slate-300">{item.audit_hash}</span>
                                                </div>
                                                <button
                                                    onClick={() => copyToClipboard(item.audit_hash, item.broker_id)}
                                                    className="text-slate-500 hover:text-[#00fff5] transition-colors shrink-0"
                                                    title="Copiar Hash"
                                                >
                                                    {copiedHash === item.broker_id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
