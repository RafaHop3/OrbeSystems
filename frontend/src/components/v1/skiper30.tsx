"use client";

import { useLayoutEffect, useRef, useState, useCallback } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { 
    Activity, 
    Cpu, 
    Shield, 
    Zap, 
    Radio, 
    FileText, 
    Boxes, 
    Sliders, 
    Database, 
    Layers, 
    Terminal, 
    Music2 
} from "lucide-react";

// ============================================================================
// METADADOS REAIS DAS 12 FERRAMENTAS DO ECOSSISTEMA ORBE SYSTEMS (Sem Repetições)
// ============================================================================
interface ToolProject {
    id: string;
    title: string;
    category: string;
    tagline: string;
    image: string;
    url: string;
    accentColor: string;
    telemetryTag: string;
    miniVoidType: 
        | 'visual-studio' 
        | 'music-daw' 
        | 'ghost-engine' 
        | 'inho-erp' 
        | 'orbe-cleaner' 
        | 'astrowatch' 
        | 'orbe-knight' 
        | 'pdf-ever' 
        | 'imortal-z3' 
        | 'powershell-bot' 
        | 'nexus-core' 
        | 'workspace-bento';
}

const ORBE_12_TOOLS: ToolProject[] = [
    // Coluna 1
    {
        id: "visual-studio",
        title: "Orbe Visual Studio",
        category: "Computação Gráfica WebGL",
        tagline: "Shaders em tempo real & grafos Bézier",
        image: "/hero_orbe_studio.png",
        url: "/ferramentas-premium/orbe-visual-studio",
        accentColor: "#00fff5",
        telemetryTag: "FFT · 60 FPS",
        miniVoidType: "visual-studio",
    },
    {
        id: "music-daw",
        title: "Orbe Music (DAW Engine)",
        category: "Processamento de Sinal Digital",
        tagline: "Sintetizador modular & sequenciador 48kHz",
        image: "/featured-nexuscore.png",
        url: "/studio",
        accentColor: "#a855f7",
        telemetryTag: "DSP · 48kHz",
        miniVoidType: "music-daw",
    },
    {
        id: "ghost-engine",
        title: "Ghost Engine",
        category: "Privacidade & LGPD",
        tagline: "Remoção automatizada de dados e opt-out",
        image: "/featured-ghostengine.png",
        url: "/ghost-engine",
        accentColor: "#06b6d4",
        telemetryTag: "ZERO TRUST · ART 18",
        miniVoidType: "ghost-engine",
    },

    // Coluna 2
    {
        id: "inho-erp",
        title: "INHO Business Engine",
        category: "ERP & Automação Fiscal",
        tagline: "Conciliação PIX instantânea & DRE em tempo real",
        image: "/featured-inho.png",
        url: "https://inho.orbesystems.com.br",
        accentColor: "#10b981",
        telemetryTag: "PIX < 1s · MULTI-TENANT",
        miniVoidType: "inho-erp",
    },
    {
        id: "orbe-cleaner",
        title: "Orbe Cleaner V4",
        category: "Otimização de Hardware",
        tagline: "Desfragmentação lógica NVMe PCIe & Cache",
        image: "/featured-orbecleaner.png",
        url: "/orbe-cleaner",
        accentColor: "#f59e0b",
        telemetryTag: "-48.4 GB · TRIM I/O",
        miniVoidType: "orbe-cleaner",
    },
    {
        id: "astrowatch",
        title: "AstroWatch Space Tech",
        category: "Mapeamento Orbital 3D",
        tagline: "Rastreamento polar de satélites & telemetria",
        image: "/featured-astrowatch.png",
        url: "https://astro-watch-chi.vercel.app/",
        accentColor: "#38bdf8",
        telemetryTag: "7.66 km/s · LEO LOCK",
        miniVoidType: "astrowatch",
    },

    // Coluna 3
    {
        id: "orbe-knight",
        title: "Orbe Knight",
        category: "Cibersegurança Ofensiva",
        tagline: "Firewall Zero-Trust & mitigação anti-DDoS",
        image: "/featured-orbeknight.png",
        url: "/ferramentas-premium/orbe-knight",
        accentColor: "#3b82f6",
        telemetryTag: "0.02ms · ANTI-DDOS",
        miniVoidType: "orbe-knight",
    },
    {
        id: "pdf-ever",
        title: "PDF Ever",
        category: "Engenharia de Documentos",
        tagline: "Compressão vetorial e higienização de streams",
        image: "/featured-pdfever.png",
        url: "https://pdf-8-ever.vercel.app/",
        accentColor: "#22c55e",
        telemetryTag: "-97% · 142MB -> 4.2MB",
        miniVoidType: "pdf-ever",
    },
    {
        id: "imortal-z3",
        title: "Imortal Logic Engine",
        category: "Verificação Formal",
        tagline: "Solucionador de restrições Z3 & prova formal",
        image: "/featured-imortal.png",
        url: "/imortal",
        accentColor: "#c084fc",
        telemetryTag: "Q.E.D. // UNSAT",
        miniVoidType: "imortal-z3",
    },

    // Coluna 4
    {
        id: "powershell-bot",
        title: "PowerShell Bot SAST",
        category: "SecDevOps Automation",
        tagline: "Auditoria estática e correção automática de CVEs",
        image: "/featured-powershellbot.png",
        url: "/software-engineering",
        accentColor: "#14b8a6",
        telemetryTag: "PATCHED · CVE-0",
        miniVoidType: "powershell-bot",
    },
    {
        id: "nexus-core",
        title: "Nexus Core & YT Stream",
        category: "Decodificação de Mídia",
        tagline: "Extração direta e streaming 320kbps puro",
        image: "/featured-jovempanonews.png",
        url: "https://jovempanonews.vercel.app/",
        accentColor: "#f97316",
        telemetryTag: "320kbps · STREAM-SYNC",
        miniVoidType: "nexus-core",
    },
    {
        id: "workspace-bento",
        title: "Orbe Workspace HUD",
        category: "Comando Central",
        tagline: "Painel Bento, orquestração de bancos e métricas",
        image: "/featured-workspace.png",
        url: "/workspace",
        accentColor: "#6366f1",
        telemetryTag: "SLA 99.99% · BENTO HUD",
        miniVoidType: "workspace-bento",
    },
];

// Configurações de Parallax Stagger
const OFFSETS = [0, -90, -40, -80];
const Y_DISTANCES = [-420, -880, -320, -720];

// ============================================================================
// COMPONENTE MINI VOID (Micro-UI Vetorial Dinâmica para cada ferramenta)
// ============================================================================
function MiniVoidMicroUi({ type, accent }: { type: ToolProject['miniVoidType']; accent: string }) {
    if (type === 'visual-studio') {
        return (
            <div className="flex items-center justify-between gap-3 font-mono text-[10px]">
                {/* Grafo de nós Bézier */}
                <div className="flex items-center gap-1.5 text-cyan-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                    <span>Node: VertexShader.glsl</span>
                </div>
                {/* Mini FFT Spectrum */}
                <div className="flex items-end gap-0.5 h-3">
                    <span className="w-1 bg-cyan-400 h-2 animate-pulse"></span>
                    <span className="w-1 bg-cyan-400 h-3 animate-pulse" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1 bg-cyan-400 h-1.5 animate-pulse" style={{ animationDelay: '300ms' }}></span>
                    <span className="w-1 bg-cyan-300 h-2.5 animate-pulse" style={{ animationDelay: '450ms' }}></span>
                </div>
            </div>
        );
    }

    if (type === 'music-daw') {
        return (
            <div className="flex items-center justify-between font-mono text-[10px] text-purple-300">
                <div className="flex items-center gap-1">
                    <Music2 size={11} className="text-purple-400" />
                    <span>4x8 Step Seq: 128 BPM</span>
                </div>
                <div className="flex gap-1">
                    {[0, 1, 2, 3].map((step) => (
                        <span key={step} className="w-1.5 h-1.5 rounded-sm bg-purple-400/80 animate-pulse" style={{ animationDelay: `${step * 200}ms` }} />
                    ))}
                </div>
            </div>
        );
    }

    if (type === 'ghost-engine') {
        return (
            <div className="flex items-center justify-between font-mono text-[10px]">
                <div className="flex items-center gap-1.5 text-cyan-300">
                    <Shield size={11} className="text-cyan-400" />
                    <span>DATA BROKER OPT-OUT</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-500/30">
                    SHREDDED [0x00]
                </span>
            </div>
        );
    }

    if (type === 'inho-erp') {
        return (
            <div className="flex items-center justify-between font-mono text-[10px] text-emerald-300">
                <div className="flex items-center gap-1.5">
                    <Boxes size={11} className="text-emerald-400" />
                    <span>PIX WEBHOOK</span>
                </div>
                <div className="flex items-center gap-1 text-[9px] text-emerald-400">
                    <span>DRE SPARK: ▲ +34.8%</span>
                </div>
            </div>
        );
    }

    if (type === 'orbe-cleaner') {
        return (
            <div className="flex items-center justify-between font-mono text-[10px] text-amber-300">
                <div className="flex items-center gap-1.5">
                    <Zap size={11} className="text-amber-400" />
                    <span>TRIM NVMe Gen4</span>
                </div>
                <span className="font-bold text-amber-400">-48.4 GB PURGED</span>
            </div>
        );
    }

    if (type === 'astrowatch') {
        return (
            <div className="flex items-center justify-between font-mono text-[10px] text-sky-300">
                <div className="flex items-center gap-1.5">
                    <Radio size={11} className="text-sky-400 animate-spin" />
                    <span>POLAR RADAR</span>
                </div>
                <span className="text-[9px] text-sky-400">ALT: 540km · 7.66km/s</span>
            </div>
        );
    }

    if (type === 'orbe-knight') {
        return (
            <div className="flex items-center justify-between font-mono text-[10px] text-blue-300">
                <div className="flex items-center gap-1.5">
                    <Activity size={11} className="text-blue-400" />
                    <span>ZERO-TRUST GATEWAY</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-500/40">
                    0.02ms LATENCY
                </span>
            </div>
        );
    }

    if (type === 'pdf-ever') {
        return (
            <div className="flex items-center justify-between font-mono text-[10px] text-green-300">
                <div className="flex items-center gap-1.5">
                    <FileText size={11} className="text-green-400" />
                    <span>STREAM COMPRESS</span>
                </div>
                <span className="text-[9px] font-bold text-green-400">142MB ➔ 4.2MB (-97%)</span>
            </div>
        );
    }

    if (type === 'imortal-z3') {
        return (
            <div className="flex items-center justify-between font-mono text-[10px] text-purple-300">
                <div className="flex items-center gap-1.5">
                    <Cpu size={11} className="text-purple-400" />
                    <span>Z3 FORMAL PROOF</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-950 text-purple-200 border border-purple-500/40">
                    Q.E.D. // UNSAT
                </span>
            </div>
        );
    }

    if (type === 'powershell-bot') {
        return (
            <div className="flex items-center justify-between font-mono text-[10px] text-teal-300">
                <div className="flex items-center gap-1.5">
                    <Terminal size={11} className="text-teal-400" />
                    <span>SAST PIPELINE</span>
                </div>
                <span className="text-[9px] font-bold text-teal-300">CVE-0 · AUTO-PATCH</span>
            </div>
        );
    }

    if (type === 'nexus-core') {
        return (
            <div className="flex items-center justify-between font-mono text-[10px] text-orange-300">
                <div className="flex items-center gap-1.5">
                    <Sliders size={11} className="text-orange-400" />
                    <span>AUDIO DECODER</span>
                </div>
                <span className="text-[9px] text-orange-400">320kbps STREAM</span>
            </div>
        );
    }

    // workspace-bento
    return (
        <div className="flex items-center justify-between font-mono text-[10px] text-indigo-300">
            <div className="flex items-center gap-1.5">
                <Layers size={11} className="text-indigo-400" />
                <span>BENTO HUD</span>
            </div>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/40">
                SLA 99.99% ONLINE
            </span>
        </div>
    );
}

// ============================================================================
// CARD PARALLAX INDIVIDUAL (Inner Parallax + Cursor Spotlight + Super Bloom)
// ============================================================================
function ParallaxToolCard({ tool }: { tool: ToolProject }) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
    const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setMousePos({ x, y });

        // Cálculo de Tilt 3D suave (amplitude máxima de 7 graus)
        const rotX = ((e.clientY - rect.top) / rect.height - 0.5) * -12;
        const rotY = ((e.clientX - rect.left) / rect.width - 0.5) * 12;
        setTilt({ rotateX: rotX, rotateY: rotY });
    }, []);

    const handleMouseLeave = useCallback(() => {
        setMousePos({ x: 50, y: 50 });
        setTilt({ rotateX: 0, rotateY: 0 });
    }, []);

    return (
        <div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="group relative flex-1 min-h-[340px] md:min-h-[380px] rounded-2xl overflow-hidden border border-white/10 transition-all duration-700 ease-out flex flex-col justify-end"
            style={{
                transform: `perspective(1000px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`,
                backgroundColor: "#04060A",
                boxShadow: `0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px ${tool.accentColor}15`,
            }}
        >
            {/* 1. CURSOR SPOTLIGHT BORDER: Gradiente radial seguindo o mouse */}
            <div
                className="pointer-events-none absolute inset-0 z-30 transition-opacity duration-300 opacity-0 group-hover:opacity-100"
                style={{
                    background: `radial-gradient(400px circle at ${mousePos.x}% ${mousePos.y}%, ${tool.accentColor}25, transparent 60%)`,
                }}
            />

            {/* 2. WINDOWED INNER-PARALLAX CONTAINER (Imagem com 118% de altura e translação oposta) */}
            <div className="absolute inset-0 z-0 overflow-hidden">
                {/* Camada Base: Alto Contraste */}
                <img
                    src={tool.image}
                    alt={`${tool.title} — ${tool.tagline}`}
                    className="absolute inset-0 w-full h-[118%] object-cover object-center transform-gpu transition-transform duration-700 ease-out group-hover:scale-105 pointer-events-none"
                    style={{
                        filter: "contrast(1.35) brightness(1.15)",
                    }}
                />

                {/* 3. PIPELINE DE SUPER-BLOOM ADITIVO (Selective Glow): Duplicação com blend-mode screen */}
                <img
                    src={tool.image}
                    aria-hidden="true"
                    alt=""
                    className="absolute inset-0 w-full h-[118%] object-cover object-center transform-gpu transition-opacity duration-700 ease-out opacity-40 group-hover:opacity-85 pointer-events-none"
                    style={{
                        mixBlendMode: "screen",
                        filter: "brightness(1.75) contrast(1.85) blur(10px)",
                    }}
                />

                {/* Gradiente escuro para legibilidade da tipografia */}
                <div
                    className="absolute inset-0 z-10 pointer-events-none"
                    style={{
                        background: "linear-gradient(to top, rgba(4,6,10,0.96) 0%, rgba(4,6,10,0.65) 45%, rgba(4,6,10,0.15) 100%)",
                    }}
                />
            </div>

            {/* 4. CHIP DE TELEMETRIA SUPERIOR */}
            <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
                <span
                    className="text-[9px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-full backdrop-blur-md border"
                    style={{
                        backgroundColor: `${tool.accentColor}18`,
                        borderColor: `${tool.accentColor}55`,
                        color: tool.accentColor,
                        textShadow: `0 0 10px ${tool.accentColor}`,
                    }}
                >
                    {tool.telemetryTag}
                </span>

                <span
                    className="w-2 h-2 rounded-full animate-ping"
                    style={{ backgroundColor: tool.accentColor }}
                />
            </div>

            {/* 5. CORPO INFORMATIVO + MINI VOID OBSIDIANA */}
            <div className="relative z-20 p-5 space-y-3">
                {/* Título e Categoria */}
                <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-0.5">
                        {tool.category}
                    </span>
                    <h3
                        className="text-lg font-bold font-tilt-neon text-white tracking-tight transition-colors duration-300"
                        style={{ textShadow: `0 0 15px ${tool.accentColor}60` }}
                    >
                        {tool.title}
                    </h3>
                    <p className="text-xs text-slate-300 font-sans line-clamp-1 leading-relaxed mt-0.5">
                        {tool.tagline}
                    </p>
                </div>

                {/* MINI VOID: Cavidade dimensional em vidro obsidiana com Micro-UI vetorial */}
                <div
                    className="rounded-xl p-2.5 backdrop-blur-xl border border-white/10 transition-all duration-500"
                    style={{
                        backgroundColor: "rgba(5, 8, 14, 0.85)",
                        boxShadow: `inset 0 1px 0 rgba(255, 255, 255, 0.15), 0 8px 20px rgba(0, 0, 0, 0.6)`,
                    }}
                >
                    <MiniVoidMicroUi type={tool.miniVoidType} accent={tool.accentColor} />
                </div>

                {/* Link de Acesso com Feixe Especular */}
                <Link
                    href={tool.url}
                    className="inline-flex items-center justify-between w-full pt-1 text-[11px] font-mono uppercase tracking-widest transition-colors duration-200"
                    style={{ color: tool.accentColor }}
                >
                    <span>Inicializar Engine</span>
                    <span className="font-bold transform group-hover:translate-x-1 transition-transform">➔</span>
                </Link>
            </div>
        </div>
    );
}

// ============================================================================
// COMPONENTE PRINCIPAL SKIPER30 / PARALLAX HUB
// ============================================================================
const Skiper30 = () => {
    const sectionRef = useRef<HTMLElement>(null);
    const colRefs = useRef<(HTMLDivElement | null)[]>([]);

    useLayoutEffect(() => {
        gsap.registerPlugin(ScrollTrigger);

        if (!sectionRef.current) return;

        const ctx = gsap.context(() => {
            colRefs.current.forEach((el, i) => {
                if (!el) return;

                // Native GSAP ScrollTrigger para efeito parallax escalonado
                gsap.to(el, {
                    y: Y_DISTANCES[i],
                    ease: "none",
                    scrollTrigger: {
                        trigger: sectionRef.current,
                        start: "top bottom",
                        end: "bottom top",
                        scrub: 1.2,
                    }
                });
            });
        }, sectionRef);

        return () => ctx.revert();
    }, []);

    // Separa as 12 ferramentas em 4 colunas verticais com 3 itens cada
    const columns = [
        [ORBE_12_TOOLS[0], ORBE_12_TOOLS[1], ORBE_12_TOOLS[2]],
        [ORBE_12_TOOLS[3], ORBE_12_TOOLS[4], ORBE_12_TOOLS[5]],
        [ORBE_12_TOOLS[6], ORBE_12_TOOLS[7], ORBE_12_TOOLS[8]],
        [ORBE_12_TOOLS[9], ORBE_12_TOOLS[10], ORBE_12_TOOLS[11]],
    ];

    return (
        <section
            ref={sectionRef}
            className="relative z-10 w-full bg-[#030508] text-[#c8d6e3] py-24 overflow-hidden border-b border-cyan-500/15"
        >
            {/* Header da Seção */}
            <div className="text-center mb-16 px-6 max-w-4xl mx-auto">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-neon-cyan font-mono text-xs uppercase tracking-widest mb-4 shadow-neon-cyan">
                    <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-pulse"></span>
                    <span>12 Módulos Homologados · Parallax Engine</span>
                </div>
                <h2 className="text-3xl sm:text-5xl md:text-6xl font-tilt-neon font-bold text-white tracking-tight leading-tight">
                    Arquiteturas Vivas da <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan via-sky-400 to-indigo-400" style={{ textShadow: "0 0 25px rgba(0, 255, 245, 0.4)" }}>OrbeSystems</span>
                </h2>
                <p className="mt-4 text-sm sm:text-base text-slate-300 font-sans max-w-2xl mx-auto leading-relaxed">
                    Navegue pelas 12 ferramentas de alta performance do ecossistema. Cada módulo integra telemetria dedicada, shaders gráficos e micro-UIs de monitoramento em tempo real.
                </p>
            </div>

            {/* Grid Parallax Multidimensional (4 Colunas x 3 Ferramentas) */}
            <div className="relative box-border flex h-[240vh] gap-[2vw] bg-transparent px-[2vw] overflow-hidden">
                {columns.map((colTools, colIdx) => (
                    <div
                        key={colIdx}
                        ref={(el) => { colRefs.current[colIdx] = el; }}
                        className="relative flex h-full w-1/4 min-w-[240px] flex-col gap-[2.5vw]"
                        style={{ marginTop: `${OFFSETS[colIdx]}px` }}
                    >
                        {colTools.map((tool) => (
                            <ParallaxToolCard key={tool.id} tool={tool} />
                        ))}
                    </div>
                ))}
            </div>
        </section>
    );
};

export { Skiper30 };
