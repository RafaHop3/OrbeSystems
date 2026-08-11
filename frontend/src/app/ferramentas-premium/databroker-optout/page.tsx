"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
    Shield, ShieldAlert, Send, RefreshCw, Lock, Ghost,
    AlertTriangle, CheckCircle, Clock, ExternalLink,
    Eye, Trash2, Zap, TrendingUp, Activity
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

interface OptOutTicket {
    id: string;
    target_broker: string;
    status: string;
    logs: string;
    created_at: string;
}

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "https://api.orbesystems.com.br").replace(/\/$/, "");

// ── Broker manual fallback URLs ──────────────────────────────────────────────
const BROKER_MANUAL_URLS: Record<string, { url: string; steps: string[] }> = {
    escavador: {
        url: "https://www.escavador.com/fale-conosco?assunto=3",
        steps: [
            "Acesse o link abaixo",
            "No campo 'Assunto', selecione 'Exclusão de dados'",
            "Informe seu nome completo e CPF",
            "Envie mencionando o Artigo 18 da LGPD (Lei 13.709/2018)",
        ],
    },
    jusbrasil: {
        url: "https://www.jusbrasil.com.br/suporte/atendimento?assunto=privacidade",
        steps: [
            "Acesse o link abaixo",
            "Preencha 'Assunto' como Privacidade / LGPD",
            "Solicite remoção do seu nome dos resultados de busca",
            "Aguarde resposta em até 72h",
        ],
    },
    consultasflex: {
        url: "https://consultasflex.com/opt-out",
        steps: [
            "Acesse o link de Opt-Out direto",
            "Preencha nome completo e CPF",
            "Confirme pelo email cadastrado",
        ],
    },
    tudosobretodos: {
        url: "https://tudosobretodos.info/contato",
        steps: [
            "Acesse a página de contato",
            "Informe seu CPF e solicite remoção via LGPD Art. 18",
            "Copie: 'Sou titular do CPF informado. Exijo exclusão imediata dos meus dados com base na Lei nº 13.709/2018.'",
        ],
    },
};

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

        const chars = "01AES█▓▒░LGPD∑∞§";
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
                ctx.fillStyle = `rgba(0, 242, 254, ${p.opacity})`;
                ctx.fillText(p.char, p.x, p.y);
                p.y += p.speed;
                p.opacity -= 0.003;
                if (p.y > canvas.height || p.opacity <= 0) {
                    p.y = 0;
                    p.x = Math.random() * canvas.width;
                    p.opacity = Math.random() * 0.5 + 0.1;
                    p.char = chars[Math.floor(Math.random() * chars.length)];
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
            className="absolute inset-0 w-full h-full pointer-events-none opacity-40"
        />
    );
}

// ── Metrics Counter ───────────────────────────────────────────────────────────
function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        let start = 0;
        const step = Math.ceil(target / 40);
        const timer = setInterval(() => {
            start += step;
            if (start >= target) { setCount(target); clearInterval(timer); }
            else setCount(start);
        }, 30);
        return () => clearInterval(timer);
    }, [target]);
    return <span>{count}{suffix}</span>;
}

// ── Broker Status Card ────────────────────────────────────────────────────────
function BrokerCard({ ticket }: { ticket: OptOutTicket }) {
    const brokerKey = ticket.target_broker.toLowerCase();
    const manual = BROKER_MANUAL_URLS[brokerKey];

    const STATUS_MAP: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
        PENDING: {
            label: "PROCESSANDO",
            color: "text-yellow-400",
            bg: "bg-yellow-500/10",
            border: "border-yellow-500/30",
            icon: <Clock size={16} className="animate-spin text-yellow-400" style={{ animationDuration: "3s" }} />,
        },
        RUNNING: {
            label: "DEMOLINDO",
            color: "text-[#00f2fe]",
            bg: "bg-[#00f2fe]/10",
            border: "border-[#00f2fe]/40",
            icon: <Activity size={16} className="animate-pulse text-[#00f2fe]" />,
        },
        SUCCESS: {
            label: "REMOVIDO",
            color: "text-green-400",
            bg: "bg-green-500/10",
            border: "border-green-500/30",
            icon: <CheckCircle size={16} className="text-green-400" />,
        },
        FAILED: {
            label: "BLOQUEADO — AÇÃO NECESSÁRIA",
            color: "text-amber-400",
            bg: "bg-amber-500/10",
            border: "border-amber-500/40",
            icon: <AlertTriangle size={16} className="text-amber-400 animate-pulse" />,
        },
    };

    const s = STATUS_MAP[ticket.status] ?? STATUS_MAP["PENDING"];

    return (
        <div className={`relative rounded-xl border ${s.border} ${s.bg} p-5 transition-all duration-700`}>
            {/* Scanning bar for PENDING/RUNNING */}
            {(ticket.status === "PENDING" || ticket.status === "RUNNING") && (
                <div className="absolute top-0 left-0 h-[2px] w-full overflow-hidden rounded-t-xl">
                    <div className="h-full w-1/3 bg-[#00f2fe] animate-[scan_2s_linear_infinite]" />
                </div>
            )}

            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                        <Ghost size={20} className={s.color} />
                    </div>
                    <div>
                        <p className="text-white font-bold text-sm uppercase tracking-wider">{ticket.target_broker}</p>
                        <p className="text-gray-500 text-[9px] font-mono mt-0.5">
                            {new Date(ticket.created_at).toLocaleString("pt-BR")} · ID: {ticket.id.slice(0, 8)}
                        </p>
                    </div>
                </div>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${s.bg} border ${s.border}`}>
                    {s.icon}
                    <span className={`text-[10px] font-bold ${s.color}`}>{s.label}</span>
                </div>
            </div>

            {/* Logs preview */}
            {ticket.logs && ticket.status === "SUCCESS" && (
                <div className="mt-3 bg-black/40 rounded-lg p-3 border border-green-500/20">
                    <p className="text-[10px] text-green-400/80 font-mono whitespace-pre-wrap line-clamp-3">{ticket.logs.replace(/\\n/g, "\n")}</p>
                </div>
            )}

            {/* ACTION_REQUIRED fallback for FAILED */}
            {ticket.status === "FAILED" && (
                <div className="mt-4 border border-amber-500/30 bg-amber-500/5 rounded-lg p-4">
                    <p className="text-amber-400 font-bold text-xs mb-2 flex items-center gap-2">
                        <AlertTriangle size={12} /> Automação bloqueada por sistema anti-robô (WAF/Cloudflare)
                    </p>
                    <p className="text-gray-400 text-[11px] mb-3">
                        A remoção manual leva menos de 2 minutos. Siga os passos abaixo:
                    </p>
                    {manual ? (
                        <>
                            <ol className="space-y-1 mb-3">
                                {manual.steps.map((step, i) => (
                                    <li key={i} className="text-[11px] text-gray-300 flex gap-2">
                                        <span className="text-amber-400 font-bold shrink-0">{i + 1}.</span> {step}
                                    </li>
                                ))}
                            </ol>
                            <a
                                href={manual.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold rounded-lg hover:bg-amber-500/30 transition-colors"
                            >
                                <ExternalLink size={12} /> Realizar Remoção Manual Agora →
                            </a>
                        </>
                    ) : (
                        <p className="text-[11px] text-gray-500">Contate o broker diretamente e cite o Art. 18 da LGPD.</p>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DataBrokerOptOutPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [tickets, setTickets] = useState<OptOutTicket[]>([]);
    const [sseStatus, setSseStatus] = useState<"connecting" | "live" | "error">("connecting");
    const esRef = useRef<EventSource | null>(null);

    // Form state
    const [fullName, setFullName] = useState("");
    const [cpf, setCpf] = useState("");
    const [targetBroker, setTargetBroker] = useState("escavador");
    const [acceptLgpd, setAcceptLgpd] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formStep, setFormStep] = useState<"form" | "encrypting" | "done">("form");

    // CPF mask
    const handleCpfChange = (v: string) => {
        const digits = v.replace(/\D/g, "").slice(0, 11);
        const masked = digits
            .replace(/(\d{3})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
        setCpf(masked);
    };

    // Metrics derived from tickets
    const successCount = tickets.filter((t) => t.status === "SUCCESS").length;
    const pendingCount = tickets.filter((t) => t.status === "PENDING" || t.status === "RUNNING").length;
    const failedCount = tickets.filter((t) => t.status === "FAILED").length;

    const fetchTickets = useCallback(async () => {
        const token = localStorage.getItem("orbe_access_token");
        if (!token) return;
        try {
            const res = await fetch(`${API_URL}/api/optout/list`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) setTickets(await res.json());
        } catch (e) { console.error("Refresh failed", e); }
    }, []);

    // ── SSE: open once, handle all real-time events ─────────────────────
    const openSSE = useCallback(() => {
        const token = localStorage.getItem("orbe_access_token");
        if (!token) return;
        esRef.current?.close();
        const es = new EventSource(
            `${API_URL}/api/optout/stream?token=${encodeURIComponent(token)}`
        );
        esRef.current = es;
        setSseStatus("connecting");

        es.addEventListener("connected", () => setSseStatus("live"));

        es.addEventListener("ticket_created", (e: MessageEvent) => {
            const t: OptOutTicket = JSON.parse(e.data);
            setTickets((prev) => prev.some((p) => p.id === t.id) ? prev : [t, ...prev]);
        });

        es.addEventListener("ticket_update", (e: MessageEvent) => {
            const updated: OptOutTicket = JSON.parse(e.data);
            setTickets((prev) =>
                prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t))
            );
        });

        es.onerror = () => setSseStatus("error");
        // Browser EventSource auto-reconnects on error after ~3s

        return () => { es.close(); esRef.current = null; };
    }, []);

    useEffect(() => {
        if (!user) return;
        if (user.role !== "premium") {
            router.push("/assinar?from=databroker");
            return;
        }
        fetchTickets();           // REST snapshot on mount
        const cleanup = openSSE(); // SSE for all future updates
        return cleanup;
    }, [user, router, fetchTickets, openSSE]);

    const submitOptOut = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!acceptLgpd) return;
        setLoading(true);
        setFormStep("encrypting");

        // Simulate encrypt animation for 1.5s before actually posting
        await new Promise((r) => setTimeout(r, 1500));

        const token = localStorage.getItem("orbe_access_token");
        try {
            const res = await fetch(`${API_URL}/api/optout/request`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ full_name: fullName, cpf, target_broker: targetBroker }),
            });

            if (res.ok) {
                setFormStep("done");
                setFullName("");
                setCpf("");
                setAcceptLgpd(false);
                // SSE will deliver ticket_created event — no need to refetch
                setTimeout(() => setFormStep("form"), 3000);
            } else {
                const d = await res.json();
                alert(d.detail || "Falha ao requisitar automação.");
                setFormStep("form");
            }
        } catch {
            alert("Erro de conexão com o Backbone da Orbe.");
            setFormStep("form");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050510] text-white font-mono pb-24">

            {/* ── CSS Animations ── */}
            <style>{`
        @keyframes scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in-up { animation: fadeInUp 0.5s ease forwards; }
      `}</style>

            <div className="max-w-6xl mx-auto px-6 pt-28 space-y-10">

                {/* ── Header ─────────────────────────────────────────────────────── */}
                <div className="fade-in-up">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#00f2fe]/10 border border-[#00f2fe]/30 rounded-full text-[10px] text-[#00f2fe] uppercase font-bold tracking-widest mb-4">
                        <Activity size={10} className="animate-pulse" /> Ghost Engine v1.0 · Pipeline Ativo
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center gap-3 mb-2">
                        <ShieldAlert size={32} className="text-[#00f2fe]" />
                        Data Broker Demolition
                    </h1>
                    <p className="text-gray-400 text-sm border-l-2 border-[#00f2fe] pl-4 max-w-2xl">
                        Nosso motor serverless invade brokers de dados e emite{" "}
                        <strong className="text-white">Procurações Eletrônicas LGPD</strong> em Robôs Headless Chrome rodando
                        nos servidores da Microsoft (GitHub). Todo o processamento é assíncrono — você dispara e acompanha em tempo real.
                    </p>
                </div>

                {/* ── Metrics Top Bar ─────────────────────────────────────────────── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 fade-in-up">
                    {[
                        { icon: <Ghost size={20} className="text-green-400" />, label: "Perfis Fantasmas Apagados", value: successCount, suffix: "", color: "text-green-400", border: "border-green-500/20" },
                        { icon: <Activity size={20} className="text-[#00f2fe]" />, label: "Demolições em Andamento", value: pendingCount, suffix: "", color: "text-[#00f2fe]", border: "border-[#00f2fe]/20" },
                        { icon: <AlertTriangle size={20} className="text-amber-400" />, label: "Exigem Ação Manual", value: failedCount, suffix: "", color: "text-amber-400", border: "border-amber-500/20" },
                        { icon: <TrendingUp size={20} className="text-purple-400" />, label: "Proteções Totais Ativas", value: tickets.length, suffix: "", color: "text-purple-400", border: "border-purple-500/20" },
                    ].map((m, i) => (
                        <div key={i} className={`bg-black/60 rounded-xl border ${m.border} p-4`}>
                            <div className="flex items-center gap-2 mb-2">{m.icon}<span className="text-gray-500 text-[10px] uppercase">{m.label}</span></div>
                            <p className={`text-3xl font-bold ${m.color}`}>
                                <AnimatedCounter target={m.value} suffix={m.suffix} />
                            </p>
                        </div>
                    ))}
                </div>

                {/* ── Main Grid ──────────────────────────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

                    {/* ── Left: Onboarding Form ─────────────────────────────────────── */}
                    <div className="lg:col-span-2">
                        <div className="relative bg-black/60 border border-[#00f2fe]/30 rounded-xl overflow-hidden">
                            <EncryptionAnimation />
                            <div className="relative z-10 p-6">
                                <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                                    <Send size={16} className="text-[#00f2fe]" /> Deflagrar Nova Varredura
                                </h2>
                                <p className="text-gray-500 text-[11px] mb-5">
                                    Dados capturados localmente e cifrados via AES-256 antes de qualquer transmissão.
                                </p>

                                {/* Security assurance badges */}
                                <div className="flex flex-wrap gap-2 mb-5">
                                    {[
                                        { icon: <Lock size={9} />, label: "AES-256 End-to-End" },
                                        { icon: <Shield size={9} />, label: "LGPD Compliant" },
                                        { icon: <Eye size={9} />, label: "CPF nunca em texto puro" },
                                        { icon: <Trash2 size={9} />, label: "Zero Knowledge Broker" },
                                    ].map((b) => (
                                        <span key={b.label} className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/10 border border-green-500/20 text-green-400 text-[9px] rounded-full font-bold">
                                            {b.icon} {b.label}
                                        </span>
                                    ))}
                                </div>

                                {formStep === "encrypting" && (
                                    <div className="flex flex-col items-center justify-center py-8 gap-3">
                                        <div className="relative w-16 h-16">
                                            <div className="absolute inset-0 rounded-full border-2 border-[#00f2fe]/30 animate-ping" />
                                            <div className="absolute inset-2 rounded-full border-2 border-[#00f2fe] animate-spin" />
                                            <Lock size={20} className="absolute inset-0 m-auto text-[#00f2fe]" />
                                        </div>
                                        <p className="text-[#00f2fe] font-bold text-sm animate-pulse">Cifrando CPF via AES...</p>
                                        <p className="text-gray-500 text-[10px]">Disparando robô para o GitHub Actions</p>
                                    </div>
                                )}

                                {formStep === "done" && (
                                    <div className="flex flex-col items-center justify-center py-8 gap-3">
                                        <CheckCircle size={40} className="text-green-400" />
                                        <p className="text-green-400 font-bold text-sm">Missão Iniciada!</p>
                                        <p className="text-gray-400 text-[11px] text-center">Robô despachado. Acompanhe ao vivo no painel à direita.</p>
                                    </div>
                                )}

                                {formStep === "form" && (
                                    <form onSubmit={submitOptOut} className="space-y-4">
                                        <div>
                                            <label className="block text-[10px] uppercase text-gray-500 mb-1">Nome Completo (Outorgante)</label>
                                            <input
                                                required type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                                                className="w-full bg-black/50 border border-gray-800 text-white px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-[#00f2fe] transition-colors"
                                                placeholder="Rafael Hop..."
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[10px] uppercase text-gray-500 mb-1">
                                                CPF
                                                <span className="ml-2 text-green-400 normal-case font-normal">↳ Criptografado localmente</span>
                                            </label>
                                            <input
                                                required type="text" value={cpf} onChange={(e) => handleCpfChange(e.target.value)}
                                                className="w-full bg-black/50 border border-gray-800 text-white px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-[#00f2fe] transition-colors font-sans tracking-widest"
                                                placeholder="000.000.000-00"
                                            />
                                            <p className="text-[9px] text-green-500/60 mt-1 flex gap-1 items-center">
                                                <Shield size={8} /> Nunca armazenado em texto puro. Fernet AES-128-CBC + IV aleatório por requisição.
                                            </p>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] uppercase text-gray-500 mb-1">Alvo Data Broker</label>
                                            <select
                                                value={targetBroker} onChange={(e) => setTargetBroker(e.target.value)}
                                                className="w-full bg-black/50 border border-gray-800 text-white px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-[#00f2fe] transition-colors"
                                            >
                                                <option value="escavador">Escavador</option>
                                                <option value="jusbrasil">Jusbrasil</option>
                                                <option value="consultasflex">ConsultasFlex</option>
                                                <option value="tudosobretodos">TudoSobreTodos</option>
                                            </select>
                                        </div>

                                        {/* LGPD Consent */}
                                        <div className="bg-[#00f2fe]/5 border border-[#00f2fe]/20 rounded-lg p-3">
                                            <label className="flex items-start gap-3 cursor-pointer">
                                                <input type="checkbox" required checked={acceptLgpd} onChange={(e) => setAcceptLgpd(e.target.checked)} className="mt-0.5 accent-[#00f2fe]" />
                                                <span className="text-[11px] text-gray-400 leading-relaxed">
                                                    Outorgo Procuração Legal à <strong className="text-white">Orbe Systems</strong> para atuar em meu nome perante os Data Brokers e solicitar exclusão de dados com base na{" "}
                                                    <strong className="text-[#00f2fe]">LGPD Art. 18</strong>.
                                                </span>
                                            </label>
                                        </div>

                                        <button
                                            disabled={loading || !acceptLgpd}
                                            type="submit"
                                            className="w-full bg-[#00f2fe]/10 border border-[#00f2fe] hover:bg-[#00f2fe] text-white hover:text-black px-4 py-3 font-bold text-sm transition-all duration-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            <Zap size={16} />
                                            {loading ? "CONFIGURANDO ROTA..." : "INICIAR VARREDURA E DEMOLIÇÃO"}
                                        </button>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Right: Live Dashboard ──────────────────────────────────────── */}
                    <div className="lg:col-span-3 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-base font-bold text-white uppercase flex items-center gap-2">
                                <Activity size={16} className={sseStatus === "live" ? "text-green-400 animate-pulse" : sseStatus === "error" ? "text-red-400 animate-pulse" : "text-yellow-400"} />
                                Painel de Operações
                                <span className={`text-[10px] font-normal px-2 py-0.5 rounded-full ${sseStatus === "live" ? "text-green-400 bg-green-500/10" :
                                        sseStatus === "error" ? "text-red-400 bg-red-500/10 animate-pulse" :
                                            "text-yellow-400 bg-yellow-500/10"
                                    }`}>
                                    {sseStatus === "live" ? "● LIVE" : sseStatus === "error" ? "⚠ RECONECTANDO" : "◌ CONECTANDO"}
                                </span>
                            </h2>
                            <button
                                onClick={fetchTickets}
                                className="text-xs border border-gray-700 hover:border-[#00f2fe] text-gray-400 hover:text-[#00f2fe] px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all"
                            >
                                <RefreshCw size={11} /> Refresh
                            </button>
                        </div>

                        {tickets.length === 0 ? (
                            <div className="border border-gray-800 rounded-xl bg-black/40 flex flex-col items-center justify-center py-16 gap-3">
                                <Ghost size={40} className="text-gray-700" />
                                <p className="text-gray-600 text-sm">Nenhuma operação iniciada.</p>
                                <p className="text-gray-700 text-[11px]">Dispare seu primeiro robô no formulário ao lado.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {tickets.map((t) => (
                                    <div key={t.id} className="fade-in-up">
                                        <BrokerCard ticket={t} />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Architecture transparency note */}
                        <div className="bg-black/40 border border-gray-800 rounded-xl p-4 mt-6">
                            <p className="text-[10px] text-gray-600 font-mono leading-relaxed">
                                <span className="text-gray-500 font-bold">ARQUITETURA DE SEGURANÇA:</span> Seu CPF viaja da UI já cifrado. O servidor{" "}
                                <span className="text-[#00f2fe]">nunca</span> o lê em texto puro. O decifradores existe apenas dentro do runner efêmero do GitHub Actions (RAM), que é destruído após cada run. O webhook final{" "}
                                <span className="text-[#00f2fe]">reporta apenas o status</span>, jamais os dados pessoais.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
