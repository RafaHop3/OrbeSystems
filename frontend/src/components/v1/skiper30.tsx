"use client";

import { useLayoutEffect, useEffect, useRef, useState, useCallback } from "react";
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
    Layers,
    Terminal,
    Music2
} from "lucide-react";

// ============================================================================
// METADADOS REAIS DAS 12 FERRAMENTAS DO ECOSSISTEMA ORBE SYSTEMS
// ============================================================================
type MiniVoidType =
    | "visual-studio"
    | "music-daw"
    | "ghost-engine"
    | "inho-erp"
    | "orbe-cleaner"
    | "astrowatch"
    | "orbe-knight"
    | "pdf-ever"
    | "imortal-z3"
    | "powershell-bot"
    | "nexus-core"
    | "workspace-bento";

interface ToolProject {
    id: string;
    title: string;
    category: string;
    tagline: string;
    url: string;
    accentColor: string;
    secondaryColor: string;
    telemetryTag: string;
    miniVoidType: MiniVoidType;
}

const ORBE_12_TOOLS: ToolProject[] = [
    // Coluna 1
    {
        id: "visual-studio",
        title: "Orbe Visual Studio",
        category: "Computação Gráfica WebGL",
        tagline: "Shaders em tempo real & grafos Bézier",
        url: "/ferramentas-premium/orbe-visual-studio",
        accentColor: "#00fff5",
        secondaryColor: "#a855f7",
        telemetryTag: "FFT · 60 FPS",
        miniVoidType: "visual-studio",
    },
    {
        id: "music-daw",
        title: "Orbe Music (DAW Engine)",
        category: "Processamento de Sinal Digital",
        tagline: "Sintetizador modular & sequenciador 48kHz",
        url: "/studio",
        accentColor: "#a855f7",
        secondaryColor: "#00fff5",
        telemetryTag: "DSP · 48kHz",
        miniVoidType: "music-daw",
    },
    {
        id: "ghost-engine",
        title: "Ghost Engine",
        category: "Privacidade & LGPD",
        tagline: "Remoção automatizada de dados e opt-out",
        url: "/ghost-engine",
        accentColor: "#06b6d4",
        secondaryColor: "#a855f7",
        telemetryTag: "ZERO TRUST · ART 18",
        miniVoidType: "ghost-engine",
    },

    // Coluna 2
    {
        id: "inho-erp",
        title: "INHO Business Engine",
        category: "ERP, IA Segura & CBM",
        tagline: "Árvore neural de gestão, PIX instantâneo & DRE",
        url: "https://inho.orbesystems.com.br",
        accentColor: "#10b981",
        secondaryColor: "#00fff5",
        telemetryTag: "PIX < 1s · MULTI-TENANT",
        miniVoidType: "inho-erp",
    },
    {
        id: "orbe-cleaner",
        title: "Orbe Cleaner V4",
        category: "Otimização de Hardware",
        tagline: "Desfragmentação lógica NVMe PCIe & Cache",
        url: "/orbe-cleaner",
        accentColor: "#f59e0b",
        secondaryColor: "#00fff5",
        telemetryTag: "-48.4 GB · TRIM I/O",
        miniVoidType: "orbe-cleaner",
    },
    {
        id: "astrowatch",
        title: "AstroWatch Space Tech",
        category: "Mapeamento Orbital 3D",
        tagline: "Rastreamento polar de satélites & telemetria",
        url: "https://astro-watch-chi.vercel.app/",
        accentColor: "#38bdf8",
        secondaryColor: "#818cf8",
        telemetryTag: "7.66 km/s · LEO LOCK",
        miniVoidType: "astrowatch",
    },

    // Coluna 3
    {
        id: "orbe-knight",
        title: "Orbe Knight",
        category: "Cibersegurança Ofensiva",
        tagline: "Firewall Zero-Trust & mitigação anti-DDoS",
        url: "/ferramentas-premium/orbe-knight",
        accentColor: "#3b82f6",
        secondaryColor: "#00fff5",
        telemetryTag: "0.02ms · ANTI-DDOS",
        miniVoidType: "orbe-knight",
    },
    {
        id: "pdf-ever",
        title: "PDF Ever",
        category: "Engenharia de Documentos",
        tagline: "Compressão vetorial e higienização de streams",
        url: "https://pdf-8-ever.vercel.app/",
        accentColor: "#22c55e",
        secondaryColor: "#00fff5",
        telemetryTag: "-97% · 142MB -> 4.2MB",
        miniVoidType: "pdf-ever",
    },
    {
        id: "imortal-z3",
        title: "Imortal Logic Engine",
        category: "Verificação Formal",
        tagline: "Solucionador de restrições Z3 & prova formal",
        url: "/imortal",
        accentColor: "#c084fc",
        secondaryColor: "#38bdf8",
        telemetryTag: "Q.E.D. // UNSAT",
        miniVoidType: "imortal-z3",
    },

    // Coluna 4
    {
        id: "powershell-bot",
        title: "PowerShell Bot SAST",
        category: "SecDevOps Automation",
        tagline: "Auditoria estática e correção automática de CVEs",
        url: "/software-engineering",
        accentColor: "#14b8a6",
        secondaryColor: "#38bdf8",
        telemetryTag: "PATCHED · CVE-0",
        miniVoidType: "powershell-bot",
    },
    {
        id: "nexus-core",
        title: "Nexus Core & YT Stream",
        category: "Decodificação de Mídia",
        tagline: "Extração direta e streaming 320kbps puro",
        url: "https://jovempanonews.vercel.app/",
        accentColor: "#f97316",
        secondaryColor: "#ec4899",
        telemetryTag: "320kbps · STREAM-SYNC",
        miniVoidType: "nexus-core",
    },
    {
        id: "workspace-bento",
        title: "Orbe Workspace HUD",
        category: "Comando Central",
        tagline: "Painel Bento, orquestração de bancos e métricas",
        url: "/workspace",
        accentColor: "#6366f1",
        secondaryColor: "#00fff5",
        telemetryTag: "SLA 99.99% · BENTO HUD",
        miniVoidType: "workspace-bento",
    },
];

// Configurações de Parallax Stagger
const OFFSETS = [0, -90, -40, -80];
const Y_DISTANCES = [-420, -880, -320, -720];

// ============================================================================
// GERADORES PROCEDURAIS 3D VOLUMÉTRICOS PARA CADA UM DOS 12 CARDS
// ============================================================================
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

function buildCardSculpture3D(type: MiniVoidType, count: number): Float32Array {
    const pos = new Float32Array(count * 3);
    let idx = 0;
    const put = (x: number, y: number, z: number) => {
        if (idx >= count) return;
        pos[idx * 3] = x;
        pos[idx * 3 + 1] = y;
        pos[idx * 3 + 2] = z;
        idx++;
    };

    if (type === "inho-erp") {
        // Árvore Neural 3D (Raízes orgânicas + Tronco em hélice + Galhos Bézier + Copa Filotática + Torres DRE)
        const rootBudget = Math.floor(count * 0.18);
        for (let i = 0; i < rootBudget; i++) {
            if (i % 3 === 0) {
                const r = i % 2 === 0 ? 0.95 : 1.38;
                const a = (i / rootBudget) * Math.PI * 2;
                put(Math.cos(a) * r, -1.28 + Math.sin(a * 6) * 0.03, Math.sin(a) * r * 0.8);
            } else {
                const rIdx = i % 8;
                const t = Math.random();
                const a = (rIdx / 8) * Math.PI * 2 + Math.sin(t * 4 + rIdx) * 0.18;
                const rad = 0.14 + Math.pow(t, 0.85) * 1.18;
                const y = -0.88 - Math.pow(t, 0.65) * 0.42;
                put(Math.cos(a) * rad, y, Math.sin(a) * rad * 0.85);
            }
        }
        const trunkBudget = Math.floor(count * 0.22);
        for (let i = 0; i < trunkBudget; i++) {
            const h = Math.random();
            const y = -0.95 + h * 1.22;
            const waist = 0.13 + Math.pow(Math.abs(h - 0.56), 1.7) * 0.38;
            const a = ((i % 7) / 7) * Math.PI * 2 + h * 2.2;
            put(Math.cos(a) * waist, y, Math.sin(a) * waist);
        }
        const bTargets = [
            [-1.12, 0.82, -0.15], [1.12, 0.82, 0.15], [-0.68, 1.18, 0.20],
            [0.68, 1.18, -0.18], [-0.36, 0.94, 0.48], [0.38, 0.94, -0.45], [0.0, 1.34, 0.0],
        ];
        const branchBudget = Math.floor(count * 0.20);
        for (let i = 0; i < branchBudget; i++) {
            const [tx, ty, tz] = bTargets[i % bTargets.length];
            const t = Math.random();
            const omt = 1 - t;
            put(
                2 * omt * t * (tx * 0.48) + t * t * tx + (Math.random() - 0.5) * 0.06,
                omt * omt * 0.12 + 2 * omt * t * (ty * 0.72) + t * t * ty,
                2 * omt * t * (tz * 0.48) + t * t * tz + (Math.random() - 0.5) * 0.06
            );
        }
        const domes = [
            { x: 0.0, y: 1.36, z: 0.0, rx: 0.62, ry: 0.40, rz: 0.55 },
            { x: -0.70, y: 1.16, z: 0.18, rx: 0.52, ry: 0.34, rz: 0.48 },
            { x: 0.70, y: 1.16, z: -0.16, rx: 0.52, ry: 0.34, rz: 0.48 },
            { x: -1.14, y: 0.80, z: -0.14, rx: 0.48, ry: 0.32, rz: 0.44 },
            { x: 1.14, y: 0.80, z: 0.14, rx: 0.48, ry: 0.32, rz: 0.44 },
            { x: -0.38, y: 0.95, z: 0.46, rx: 0.45, ry: 0.30, rz: 0.42 },
            { x: 0.40, y: 0.95, z: -0.44, rx: 0.45, ry: 0.30, rz: 0.42 },
        ];
        let k = 0;
        while (idx < count) {
            const d = domes[k % domes.length];
            k++;
            const v = Math.random();
            const phi = Math.acos(2 * v - 1);
            const theta = k * GOLDEN_ANGLE;
            const sh = 0.58 + 0.42 * Math.pow(Math.random(), 0.35);
            put(
                d.x + d.rx * sh * Math.sin(phi) * Math.cos(theta),
                d.y + d.ry * sh * Math.cos(phi),
                d.z + d.rz * sh * Math.sin(phi) * Math.sin(theta)
            );
        }
        return pos;
    }

    if (type === "visual-studio") {
        // TorusKnot 3D de Shaders + Grafo de Nós Bézier Flutuantes
        const knotBudget = Math.floor(count * 0.68);
        for (let i = 0; i < knotBudget; i++) {
            const t = (i / knotBudget) * Math.PI * 2 * 3;
            const p = 2, q = 3;
            const r = 0.68 + 0.28 * Math.cos(q * t);
            const cx = r * Math.cos(p * t);
            const cy = r * Math.sin(p * t) + 0.15;
            const cz = 0.38 * Math.sin(q * t);
            const tubeA = Math.random() * Math.PI * 2;
            const tubeR = 0.14 * Math.pow(Math.random(), 0.45);
            put(cx + Math.cos(tubeA) * tubeR, cy + Math.sin(tubeA) * tubeR, cz + (Math.random() - 0.5) * 0.12);
        }
        const nodes = [
            [-1.25, -0.85, 0.2], [-0.45, -1.10, -0.2], [0.45, -0.95, 0.25], [1.25, -0.80, -0.15],
        ];
        while (idx < count) {
            const nIdx = idx % nodes.length;
            const [nx, ny, nz] = nodes[nIdx];
            if (idx % 3 === 0) {
                const a = Math.random() * Math.PI * 2;
                const r = 0.13 * Math.random();
                put(nx + Math.cos(a) * r, ny + Math.sin(a) * r, nz);
            } else {
                const t = Math.random();
                const x = -1.35 + t * 2.70;
                const y = -0.95 + Math.sin(t * Math.PI * 3) * 0.18;
                put(x, y, Math.cos(t * Math.PI * 2) * 0.22);
            }
        }
        return pos;
    }

    if (type === "music-daw") {
        // Anfiteatro FFT 16 Bandas em Arco 3D + Ondas Senoidais + Console
        const heights = [0.48, 0.85, 1.28, 1.72, 2.08, 1.75, 1.32, 1.60, 2.02, 2.28, 1.85, 1.42, 1.10, 0.82, 0.58, 0.40];
        const fftBudget = Math.floor(count * 0.55);
        for (let i = 0; i < fftBudget; i++) {
            const b = i % heights.length;
            const h = heights[b];
            const ang = ((b / (heights.length - 1)) - 0.5) * Math.PI * 0.82;
            const bx = Math.sin(ang) * 1.42;
            const bz = -Math.cos(ang) * 0.58;
            const seg = Math.floor(Math.random() * 14) / 14;
            const y = -0.75 + seg * h;
            const a = Math.random() * Math.PI * 2;
            put(bx + Math.cos(a) * 0.075, y, bz + Math.sin(a) * 0.075);
        }
        while (idx < count) {
            const theta = Math.random() * Math.PI * 2;
            const arm = idx % 2 === 0 ? 1 : -1;
            const r = 1.38 + Math.sin(theta * 5) * 0.10;
            put(Math.cos(theta) * r, 0.15 + arm * Math.sin(theta * 4) * 0.35, Math.sin(theta) * r * 0.65);
        }
        return pos;
    }

    if (type === "ghost-engine") {
        // Domo Geodésico Esférico Zero-Trust + Dupla Hélice KMS MultiFernet
        const domeBudget = Math.floor(count * 0.58);
        for (let i = 0; i < domeBudget; i++) {
            const k = i / domeBudget;
            const phi = Math.acos(1 - 2 * k);
            const theta = i * GOLDEN_ANGLE;
            const r = 1.28 + (Math.random() - 0.5) * 0.04;
            put(r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi) + 0.12, r * Math.sin(phi) * Math.sin(theta));
        }
        while (idx < count) {
            const h = Math.random();
            const y = -0.82 + h * 1.85;
            const arm = idx % 2 === 0 ? 0 : Math.PI;
            const a = h * Math.PI * 5 + arm;
            const r = 0.48;
            put(Math.cos(a) * r + (Math.random() - 0.5) * 0.04, y, Math.sin(a) * r + (Math.random() - 0.5) * 0.04);
        }
        return pos;
    }

    if (type === "orbe-cleaner") {
        // Vórtice Ciclônico Triplo + Stacks V-NAND 3D + Cubos Ejetados
        const chipBudget = Math.floor(count * 0.34);
        for (let i = 0; i < chipBudget; i++) {
            const layer = i % 6;
            const y = -0.78 + layer * 0.055;
            const cx = (i % 2 === 0 ? -0.48 : 0.48) + (Math.random() - 0.5) * 0.65;
            const cz = (i % 4 < 2 ? -0.26 : 0.26) + (Math.random() - 0.5) * 0.38;
            put(cx, y, cz);
        }
        while (idx < count) {
            const h = Math.random();
            const y = -0.55 + h * 1.95;
            const arm = idx % 3;
            const a = h * Math.PI * 5.5 + (arm * Math.PI * 2) / 3;
            const r = 0.24 + Math.pow(h, 0.85) * 1.15;
            put(Math.cos(a) * r + (Math.random() - 0.5) * 0.08, y, Math.sin(a) * r * 0.78 + (Math.random() - 0.5) * 0.08);
        }
        return pos;
    }

    if (type === "astrowatch") {
        // Globo Planetário em Meridianos + 3 Anéis Orbitais LEO Inclinados + Satélites
        const globeBudget = Math.floor(count * 0.48);
        for (let i = 0; i < globeBudget; i++) {
            const k = i / globeBudget;
            const phi = Math.acos(1 - 2 * k);
            const theta = i * GOLDEN_ANGLE;
            const r = 0.78;
            put(r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi) + 0.12, r * Math.sin(phi) * Math.sin(theta));
        }
        const tilts = [
            { rx: 0.45, rz: 0.32, r: 1.28 },
            { rx: -0.52, rz: -0.28, r: 1.44 },
            { rx: 1.15, rz: 0.0, r: 1.15 },
        ];
        while (idx < count) {
            const orb = tilts[idx % tilts.length];
            const a = Math.random() * Math.PI * 2;
            const x0 = Math.cos(a) * orb.r;
            const z0 = Math.sin(a) * orb.r;
            const y1 = -z0 * Math.sin(orb.rx);
            const z1 = z0 * Math.cos(orb.rx);
            const x2 = x0 * Math.cos(orb.rz) - y1 * Math.sin(orb.rz);
            const y2 = x0 * Math.sin(orb.rz) + y1 * Math.cos(orb.rz);
            put(x2 + (Math.random() - 0.5) * 0.03, y2 + 0.12, z1 + (Math.random() - 0.5) * 0.03);
        }
        return pos;
    }

    if (type === "orbe-knight") {
        // Escudo Aegis Cibernético Octogonal + Núcleo Cristalina + Ondas Anti-DDoS
        const shieldBudget = Math.floor(count * 0.52);
        for (let i = 0; i < shieldBudget; i++) {
            const u = (Math.random() - 0.5) * 2.2;
            const v = (Math.random() - 0.5) * 2.4;
            // Silhueta de escudo heráldico curvado em Z
            const maxW = 1.15 * (1 - Math.max(0, -v - 0.1) * 0.65);
            if (Math.abs(u) <= maxW) {
                const zCurve = 0.38 - (u * u * 0.28 + v * v * 0.12);
                const isBorder = Math.abs(Math.abs(u) - maxW) < 0.12 || Math.abs(v - 1.1) < 0.12;
                if (isBorder || Math.random() < 0.35) {
                    put(u, v + 0.18, zCurve);
                }
            }
        }
        while (idx < count) {
            const ring = (idx % 3) + 1;
            const r = 0.45 * ring;
            const a = Math.random() * Math.PI * 2;
            put(Math.cos(a) * r, Math.sin(a) * r + 0.18, Math.cos(a * 6) * 0.18);
        }
        return pos;
    }

    if (type === "pdf-ever") {
        // Funil de Compressão Vetorial (-97%): Folhas amplas no topo convergindo num cristal denso na base
        const funnelBudget = Math.floor(count * 0.68);
        for (let i = 0; i < funnelBudget; i++) {
            const h = Math.random(); // 0 = base comprimida (-1.05), 1 = topo largo (+1.35)
            const y = -1.05 + h * 2.40;
            const radius = 0.12 + Math.pow(h, 1.65) * 1.28;
            const spiral = h * Math.PI * 6 + (i % 4) * (Math.PI / 2);
            put(
                Math.cos(spiral) * radius + (Math.random() - 0.5) * 0.05,
                y,
                Math.sin(spiral) * radius * 0.78 + (Math.random() - 0.5) * 0.05
            );
        }
        // Cristal compacto de 4.2MB na base
        while (idx < count) {
            const u = Math.random() * Math.PI * 2;
            const v = Math.acos(2 * Math.random() - 1);
            const r = 0.28 * Math.pow(Math.random(), 0.35);
            put(r * Math.sin(v) * Math.cos(u), -1.02 + r * Math.cos(v), r * Math.sin(v) * Math.sin(u));
        }
        return pos;
    }

    if (type === "imortal-z3") {
        // Hipercubo 4D (Tesseract: Cubo externo + Cubo interno + 8 Arestas Diagonais 4D + Anel Q.E.D.)
        const vertices: [number, number, number][] = [];
        [-1, 1].forEach((x) => {
            [-1, 1].forEach((y) => {
                [-1, 1].forEach((z) => {
                    vertices.push([x * 0.98, y * 0.98 + 0.15, z * 0.98]);
                    vertices.push([x * 0.46, y * 0.46 + 0.15, z * 0.46]);
                });
            });
        });
        const edges: [number, number][] = [];
        for (let i = 0; i < vertices.length; i++) {
            for (let j = i + 1; j < vertices.length; j++) {
                const a = vertices[i], b = vertices[j];
                const d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
                if (Math.abs(d - 1.96) < 0.05 || Math.abs(d - 0.92) < 0.05 || Math.abs(d - 0.90) < 0.08) {
                    edges.push([i, j]);
                }
            }
        }
        const edgeBudget = Math.floor(count * 0.75);
        for (let i = 0; i < edgeBudget; i++) {
            const [ia, ib] = edges[i % edges.length];
            const va = vertices[ia], vb = vertices[ib];
            const t = Math.random();
            put(
                va[0] + (vb[0] - va[0]) * t + (Math.random() - 0.5) * 0.04,
                va[1] + (vb[1] - va[1]) * t + (Math.random() - 0.5) * 0.04,
                va[2] + (vb[2] - va[2]) * t + (Math.random() - 0.5) * 0.04
            );
        }
        while (idx < count) {
            const a = Math.random() * Math.PI * 2;
            const r = 1.38;
            put(Math.cos(a) * r, 0.15 + Math.sin(a * 3) * 0.22, Math.sin(a) * r);
        }
        return pos;
    }

    if (type === "powershell-bot") {
        // Símbolo Prompt ">_" Esculpido em 3D + Pipeline SecDevOps Helicoidal
        const promptBudget = Math.floor(count * 0.46);
        for (let i = 0; i < promptBudget; i++) {
            if (i % 3 === 0) {
                // Barra underscore "_"
                const t = Math.random();
                put(0.15 + t * 0.95, -0.35 + (Math.random() - 0.5) * 0.10, (Math.random() - 0.5) * 0.18);
            } else {
                // Chevron ">"
                const upper = i % 2 === 0;
                const t = Math.random();
                const x = -1.05 + t * 0.95;
                const y = upper ? 0.85 - t * 0.55 : -0.25 + t * 0.55;
                put(x + (Math.random() - 0.5) * 0.08, y + (Math.random() - 0.5) * 0.08, (Math.random() - 0.5) * 0.22);
            }
        }
        while (idx < count) {
            const a = Math.random() * Math.PI * 2;
            const r = 1.32 + Math.sin(a * 6) * 0.08;
            put(Math.cos(a) * r, 0.18 + Math.sin(a * 2) * 0.65, Math.sin(a) * r * 0.72);
        }
        return pos;
    }

    if (type === "nexus-core") {
        // Pulsar Acústico Esférico + 4 Anéis de Onda de Choque 320kbps
        const coreBudget = Math.floor(count * 0.45);
        for (let i = 0; i < coreBudget; i++) {
            const k = i / coreBudget;
            const phi = Math.acos(1 - 2 * k);
            const theta = i * GOLDEN_ANGLE;
            const r = 0.58 + Math.sin(phi * 6) * 0.08;
            put(r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi) + 0.15, r * Math.sin(phi) * Math.sin(theta));
        }
        while (idx < count) {
            const ringIdx = idx % 4;
            const baseR = 0.85 + ringIdx * 0.22;
            const a = Math.random() * Math.PI * 2;
            const waveY = Math.sin(a * 8 + ringIdx) * 0.14;
            put(Math.cos(a) * baseR, 0.15 + waveY, Math.sin(a) * baseR * 0.82);
        }
        return pos;
    }

    // workspace-bento: Matriz Bento Holográfica 3D em 3 Camadas + Núcleo Central
    const bentoPanels = [
        { cx: -0.68, cy: 0.72, cz: 0.22, w: 0.95, h: 0.62 },
        { cx: 0.68, cy: 0.72, cz: -0.18, w: 0.95, h: 0.62 },
        { cx: -0.68, cy: -0.18, cz: -0.18, w: 0.95, h: 0.62 },
        { cx: 0.68, cy: -0.18, cz: 0.22, w: 0.95, h: 0.62 },
    ];
    const panelBudget = Math.floor(count * 0.64);
    for (let i = 0; i < panelBudget; i++) {
        const p = bentoPanels[i % bentoPanels.length];
        const edge = i % 4;
        const t = (Math.random() - 0.5);
        const x = edge < 2 ? p.cx + t * p.w : p.cx + (edge === 2 ? -p.w / 2 : p.w / 2);
        const y = edge >= 2 ? p.cy + t * p.h : p.cy + (edge === 0 ? p.h / 2 : -p.h / 2);
        put(x + (Math.random() - 0.5) * 0.04, y + (Math.random() - 0.5) * 0.04, p.cz + (Math.random() - 0.5) * 0.12);
    }
    while (idx < count) {
        const k = (idx - panelBudget) / Math.max(1, count - panelBudget);
        const phi = Math.acos(1 - 2 * k);
        const theta = idx * GOLDEN_ANGLE;
        const r = 0.42;
        put(r * Math.sin(phi) * Math.cos(theta), 0.26 + r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
    }
    return pos;
}

function hexToRgb(hex: string): [number, number, number] {
    const clean = hex.replace("#", "");
    const num = parseInt(clean, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function createGlowOrbSprite(r: number, g: number, b: number): HTMLCanvasElement {
    const size = 32;
    const off = document.createElement("canvas");
    off.width = size;
    off.height = size;
    const octx = off.getContext("2d");
    if (!octx) return off;
    const half = size / 2;
    const grad = octx.createRadialGradient(half, half, 0.5, half, half, half);
    grad.addColorStop(0.0, "rgba(255,255,255,1)");
    grad.addColorStop(0.24, `rgba(${r},${g},${b},0.92)`);
    grad.addColorStop(0.58, `rgba(${r},${g},${b},0.32)`);
    grad.addColorStop(1.0, `rgba(${r},${g},${b},0)`);
    octx.fillStyle = grad;
    octx.fillRect(0, 0, size, size);
    return off;
}

// ============================================================================
// MOTOR DE PARTÍCULAS 3D POR CARD (Sprites Radial-Glow + Pulso + Plexus 60 FPS)
// ============================================================================
function CardParticleVoidCanvas({
    type,
    accentColor,
    secondaryColor,
}: {
    type: MiniVoidType;
    accentColor: string;
    secondaryColor: string;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const PARTICLE_COUNT = 2200;
        const positions = buildCardSculpture3D(type, PARTICLE_COUNT);
        const seeds = new Float32Array(PARTICLE_COUNT);
        for (let i = 0; i < PARTICLE_COUNT; i++) seeds[i] = Math.random() * Math.PI * 2;

        const [r1, g1, b1] = hexToRgb(accentColor);
        const [r2, g2, b2] = hexToRgb(secondaryColor);
        const spriteLow = createGlowOrbSprite(r1, g1, b1);
        const spriteMid = createGlowOrbSprite(
            Math.round((r1 + r2) * 0.5),
            Math.round((g1 + g2) * 0.5),
            Math.round((b1 + b2) * 0.5)
        );
        const spriteHigh = createGlowOrbSprite(r2, g2, b2);

        let width = 1;
        let height = 1;
        const updateSize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            width = Math.max(1, canvas.clientWidth);
            height = Math.max(1, canvas.clientHeight);
            canvas.width = Math.floor(width * dpr);
            canvas.height = Math.floor(height * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        updateSize();

        const resizeObserver = new ResizeObserver(updateSize);
        resizeObserver.observe(canvas);

        let isVisible = true;
        const io = new IntersectionObserver(
            ([entry]) => {
                isVisible = entry.isIntersecting;
            },
            { threshold: 0.05 }
        );
        io.observe(canvas);

        const pointer = { x: 99, y: 99, tx: 99, ty: 99, hovered: false };
        const parentCard = canvas.parentElement?.parentElement;
        const onMove = (e: PointerEvent) => {
            const rect = canvas.getBoundingClientRect();
            pointer.tx = (((e.clientX - rect.left) / rect.width) * 2 - 1) * 1.8;
            pointer.ty = (-((e.clientY - rect.top) / rect.height) * 2 + 1) * 1.8;
            pointer.hovered = true;
        };
        const onLeave = () => {
            pointer.tx = 99;
            pointer.ty = 99;
            pointer.hovered = false;
        };
        parentCard?.addEventListener("pointermove", onMove);
        parentCard?.addEventListener("pointerleave", onLeave);

        const anchorSx = new Float32Array(42);
        const anchorSy = new Float32Array(42);
        let rafId = 0;
        const t0 = performance.now();

        const render = (now: number) => {
            rafId = requestAnimationFrame(render);
            if (!isVisible || document.hidden) return;

            const elapsed = (now - t0) * 0.001;
            pointer.x += (pointer.tx - pointer.x) * 0.12;
            pointer.y += (pointer.ty - pointer.y) * 0.12;

            ctx.clearRect(0, 0, width, height);
            ctx.globalCompositeOperation = "lighter";

            const rotY = elapsed * 0.34;
            const rotX = Math.cos(elapsed * 0.25) * 0.14;
            const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
            const cosX = Math.cos(rotX), sinX = Math.sin(rotX);

            const cx = width * 0.5;
            const cy = height * 0.42;
            const scaleBase = Math.min(width, height) * 0.42;
            const fov = 3.8;
            const waveY = ((elapsed * 0.85) % 3.2) - 1.5;

            let anchorCount = 0;

            for (let i = 0; i < PARTICLE_COUNT; i++) {
                const px = positions[i * 3];
                const py = positions[i * 3 + 1] + Math.sin(elapsed * 1.6 + seeds[i]) * 0.022;
                const pz = positions[i * 3 + 2];

                const x1 = px * cosY - pz * sinY;
                const z1 = px * sinY + pz * cosY;
                const y2 = py * cosX - z1 * sinX;
                let z2 = py * sinX + z1 * cosX;

                // Onda de pulso ascendente + reação magnética ao ponteiro
                const waveDist = Math.abs(py - waveY);
                const wavePulse = waveDist < 0.34 ? (0.34 - waveDist) / 0.34 : 0;

                const dx = x1 - pointer.x;
                const dy = y2 - pointer.y;
                const distSq = dx * dx + dy * dy;
                let boost = wavePulse * 0.55;
                if (distSq < 0.72) {
                    const dist = Math.sqrt(distSq);
                    const pForce = (0.85 - dist) / 0.85;
                    boost += pForce;
                    z2 += pForce * 0.32;
                }

                const depth = fov - z2;
                if (depth <= 0.2) continue;
                const persp = scaleBase / depth;

                const sx = cx + x1 * persp * 1.35;
                const sy = cy - y2 * persp * 1.35;
                if (sx < -12 || sx > width + 12 || sy < -12 || sy > height + 12) continue;

                if (i % 54 === 0 && anchorCount < 42) {
                    anchorSx[anchorCount] = sx;
                    anchorSy[anchorCount] = sy;
                    anchorCount++;
                }

                const mix = Math.max(0, Math.min(1, (py + 1.35) / 2.7));
                const sprite = mix < 0.36 ? spriteLow : mix < 0.72 ? spriteMid : spriteHigh;
                const radius = Math.max(2.2, (3.8 + boost * 2.8) * (2.6 / depth));
                ctx.globalAlpha = Math.min(1.0, (0.52 + boost * 0.42) * (2.8 / depth));
                ctx.drawImage(sprite, sx - radius, sy - radius, radius * 2, radius * 2);
            }

            // Feixes Sinápticos (Plexus 3D) conectando os nós estruturais próximos
            ctx.globalAlpha = pointer.hovered ? 0.28 : 0.14;
            ctx.strokeStyle = accentColor;
            ctx.lineWidth = 0.75;
            ctx.beginPath();
            for (let a = 0; a < anchorCount; a++) {
                const ax = anchorSx[a], ay = anchorSy[a];
                for (let b = a + 1; b < anchorCount; b++) {
                    const ddx = ax - anchorSx[b];
                    const ddy = ay - anchorSy[b];
                    if (ddx * ddx + ddy * ddy < 2600) {
                        ctx.moveTo(ax, ay);
                        ctx.lineTo(anchorSx[b], anchorSy[b]);
                    }
                }
            }
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        };

        rafId = requestAnimationFrame(render);

        return () => {
            cancelAnimationFrame(rafId);
            resizeObserver.disconnect();
            io.disconnect();
            parentCard?.removeEventListener("pointermove", onMove);
            parentCard?.removeEventListener("pointerleave", onLeave);
        };
    }, [type, accentColor, secondaryColor]);

    return (
        <canvas
            ref={canvasRef}
            aria-hidden="true"
            className="absolute inset-0 w-full h-full pointer-events-none"
        />
    );
}

// ============================================================================
// COMPONENTE MINI VOID (Micro-UI Vetorial Dinâmica para cada ferramenta)
// ============================================================================
function MiniVoidMicroUi({ type }: { type: ToolProject["miniVoidType"]; accent?: string }) {
    if (type === "visual-studio") {
        return (
            <div className="flex items-center justify-between gap-3 font-mono text-[10px]">
                <div className="flex items-center gap-1.5 text-cyan-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                    <span>Node: VertexShader.glsl</span>
                </div>
                <div className="flex items-end gap-0.5 h-3">
                    <span className="w-1 bg-cyan-400 h-2 animate-pulse"></span>
                    <span className="w-1 bg-cyan-400 h-3 animate-pulse" style={{ animationDelay: "150ms" }}></span>
                    <span className="w-1 bg-cyan-400 h-1.5 animate-pulse" style={{ animationDelay: "300ms" }}></span>
                    <span className="w-1 bg-cyan-300 h-2.5 animate-pulse" style={{ animationDelay: "450ms" }}></span>
                </div>
            </div>
        );
    }

    if (type === "music-daw") {
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

    if (type === "ghost-engine") {
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

    if (type === "inho-erp") {
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

    if (type === "orbe-cleaner") {
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

    if (type === "astrowatch") {
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

    if (type === "orbe-knight") {
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

    if (type === "pdf-ever") {
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

    if (type === "imortal-z3") {
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

    if (type === "powershell-bot") {
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

    if (type === "nexus-core") {
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
// CARD PARALLAX INDIVIDUAL (Escultura de Partículas 3D + Cursor Spotlight)
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

        const rotX = ((e.clientY - rect.top) / rect.height - 0.5) * -10;
        const rotY = ((e.clientX - rect.left) / rect.width - 0.5) * 10;
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
            className="group relative flex-1 min-h-[340px] md:min-h-[380px] rounded-2xl overflow-hidden border border-white/10 hover:border-white/25 transition-all duration-700 ease-out flex flex-col justify-end"
            style={{
                transform: `perspective(1000px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`,
                backgroundColor: "#04060A",
                boxShadow: `0 20px 50px rgba(0, 0, 0, 0.85), 0 0 35px ${tool.accentColor}1f`,
            }}
        >
            {/* 1. CURSOR SPOTLIGHT BORDER */}
            <div
                className="pointer-events-none absolute inset-0 z-30 transition-opacity duration-300 opacity-0 group-hover:opacity-100"
                style={{
                    background: `radial-gradient(380px circle at ${mousePos.x}% ${mousePos.y}%, ${tool.accentColor}28, transparent 60%)`,
                }}
            />

            {/* 2. QUADRO DE PARTÍCULAS 3D VOLUMÉTRICO DEDICADO A CADA FERRAMENTA */}
            <div className="absolute inset-0 z-0 overflow-hidden">
                <div
                    className="absolute inset-0 pointer-events-none opacity-65"
                    style={{
                        background: `radial-gradient(circle at 50% 38%, ${tool.accentColor}22 0%, ${tool.secondaryColor}10 42%, transparent 75%)`,
                    }}
                />
                <CardParticleVoidCanvas
                    type={tool.miniVoidType}
                    accentColor={tool.accentColor}
                    secondaryColor={tool.secondaryColor}
                />
                {/* Gradiente inferior para leitura cristalina da tipografia */}
                <div
                    className="absolute inset-0 z-10 pointer-events-none"
                    style={{
                        background: "linear-gradient(to top, rgba(4,6,10,0.97) 0%, rgba(4,6,10,0.68) 42%, rgba(4,6,10,0.08) 100%)",
                    }}
                />
            </div>

            {/* 3. CHIP DE TELEMETRIA SUPERIOR */}
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

            {/* 4. CORPO INFORMATIVO + MINI VOID OBSIDIANA */}
            <div className="relative z-20 p-5 space-y-3">
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

                <div
                    className="rounded-xl p-2.5 backdrop-blur-xl border border-white/10 transition-all duration-500"
                    style={{
                        backgroundColor: "rgba(5, 8, 14, 0.85)",
                        boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.15), 0 8px 20px rgba(0, 0, 0, 0.6)",
                    }}
                >
                    <MiniVoidMicroUi type={tool.miniVoidType} accent={tool.accentColor} />
                </div>

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
            <div className="text-center mb-16 px-6 max-w-4xl mx-auto">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-neon-cyan font-mono text-xs uppercase tracking-widest mb-4 shadow-neon-cyan">
                    <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-pulse"></span>
                    <span>12 Módulos Homologados · Particle Void Engine</span>
                </div>
                <h2 className="text-3xl sm:text-5xl md:text-6xl font-tilt-neon font-bold text-white tracking-tight leading-tight">
                    Arquiteturas Vivas da <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan via-sky-400 to-indigo-400" style={{ textShadow: "0 0 25px rgba(0, 255, 245, 0.4)" }}>OrbeSystems</span>
                </h2>
                <p className="mt-4 text-sm sm:text-base text-slate-300 font-sans max-w-2xl mx-auto leading-relaxed">
                    Navegue pelas 12 ferramentas de alta performance do ecossistema. Cada módulo integra esculturas de partículas 3D em tempo real, telemetria dedicada e micro-UIs de monitoramento.
                </p>
            </div>

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
