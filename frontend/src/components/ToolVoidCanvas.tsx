'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

// ============================================================================
// MOTOR DE VOIDS 3D (formas fiéis a cada ferramenta da Orbe)
// Portado de orbe_systems_home_void_engine.tsx — somente a parte dos voids.
// ============================================================================
export type VoidToolShape =
  | 'server-cluster' // Infraestrutura: cluster de servidores blade
  | 'inho-pix-dre' // INHO Business: marcadores de QR Code PIX + barras DRE
  | 'inho-growth-tree' // INHO Manifesto: árvore com folhas de chat e frutos CBM
  | 'lgpd-shield' // Void Telemetry / Ghost Engine: escudo Zero Trust + documento
  | 'nvme-cleaner' // Orbe Cleaner: SSD M.2 NVMe com blocos de cache ejetados
  | 'daw-spectrum'; // Orbe Music / Visual Studio: mesa de mixagem + FFT

interface ToolVoidCanvasProps {
  activeShape: VoidToolShape;
  accentColor?: string;
  secondaryColor?: string;
  particleCount?: number;
  highlightBand?: [number, number] | null;
  className?: string;
}

const PARTICLE_COUNT_DEFAULT = 9000;

/**
 * Amostrador de superfície ponderado pela área dos triângulos das malhas 3D.
 * Gera os pontos exatamente sobre a geometria de cada ferramenta.
 */
function sampleGeometriesSurface(geometries: THREE.BufferGeometry[], count: number): Float32Array {
  const triangles: { a: THREE.Vector3; b: THREE.Vector3; c: THREE.Vector3; area: number }[] = [];
  let totalArea = 0;

  geometries.forEach((geo) => {
    const nonIndexed = geo.index ? geo.toNonIndexed() : geo.clone();
    const pos = nonIndexed.getAttribute('position');
    if (!pos) return;

    for (let i = 0; i < pos.count; i += 3) {
      const a = new THREE.Vector3().fromBufferAttribute(pos, i);
      const b = new THREE.Vector3().fromBufferAttribute(pos, i + 1);
      const c = new THREE.Vector3().fromBufferAttribute(pos, i + 2);
      const area = new THREE.Triangle(a, b, c).getArea();
      if (area > 0) {
        triangles.push({ a, b, c, area });
        totalArea += area;
      }
    }
    nonIndexed.dispose();
  });

  const cumulativeAreas = new Float32Array(triangles.length);
  let acc = 0;
  for (let i = 0; i < triangles.length; i++) {
    acc += triangles[i].area;
    cumulativeAreas[i] = acc;
  }

  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = Math.random() * totalArea;
    let low = 0;
    let high = cumulativeAreas.length - 1;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (r > cumulativeAreas[mid]) low = mid + 1;
      else high = mid;
    }

    const tri = triangles[low] || triangles[0];
    let u = Math.random();
    let v = Math.random();
    if (u + v > 1) {
      u = 1 - u;
      v = 1 - v;
    }
    const w = 1 - u - v;

    positions[i * 3] = tri.a.x * u + tri.b.x * v + tri.c.x * w;
    positions[i * 3 + 1] = tri.a.y * u + tri.b.y * v + tri.c.y * w;
    positions[i * 3 + 2] = tri.a.z * u + tri.b.z * v + tri.c.z * w;
  }

  geometries.forEach((g) => g.dispose());
  return positions;
}

/** 1. Infraestrutura Orbe Cloud & Mesh P2P: Núcleo Quântico, 3 Anéis de Racks Blade e Constelação P2P em 3D */
function buildServerClusterPositions(count: number): Float32Array {
  const positions = new Float32Array(count * 3);
  let idx = 0;

  const put = (x: number, y: number, z: number) => {
    if (idx >= count) return;
    positions[idx * 3] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;
    idx++;
  };

  // 1. Três Anéis Cilíndricos de Racks Blade + Baias Luminosas (40% das partículas)
  const rackBudget = Math.floor(count * 0.40);
  const tiers = [-0.92, 0.0, 0.92];
  const baysPerTier = 12;
  for (let i = 0; i < rackBudget; i++) {
    const tierY = tiers[i % tiers.length];
    const bayIdx = Math.floor(i / 3) % baysPerTier;
    const bayCenterAngle = (bayIdx / baysPerTier) * Math.PI * 2;
    const angle = bayCenterAngle + (Math.random() - 0.5) * 0.36;
    const isOuterRing = i % 5 === 0;
    const r = isOuterRing ? 1.12 + (Math.random() - 0.5) * 0.05 : 0.72 + Math.random() * 0.36;
    const y = tierY + (Math.random() - 0.5) * 0.28;
    put(Math.cos(angle) * r, y, Math.sin(angle) * r);
  }

  // 2. Coluna Central de Fibra Óptica & Dupla Hélice de Barramento (24% das partículas)
  const coreBudget = Math.floor(count * 0.24);
  for (let i = 0; i < coreBudget; i++) {
    const hNorm = Math.random();
    const y = -1.35 + hNorm * 2.70;
    if (i % 3 === 0) {
      const helixAngle = hNorm * Math.PI * 6.0 + (i % 2) * Math.PI;
      const hr = 0.34;
      put(
        Math.cos(helixAngle) * hr + (Math.random() - 0.5) * 0.03,
        y,
        Math.sin(helixAngle) * hr + (Math.random() - 0.5) * 0.03
      );
    } else {
      const angle = Math.random() * Math.PI * 2;
      const r = 0.18 * Math.pow(Math.random(), 0.45);
      put(Math.cos(angle) * r, y, Math.sin(angle) * r);
    }
  }

  // 3. Constelação de Satélites P2P Mesh + Arcos de Telemetria 3D (36% restantes)
  const satellites = [
    [-1.52, 0.75, 0.45],
    [1.52, 0.75, -0.45],
    [-1.48, -0.65, -0.52],
    [1.48, -0.65, 0.52],
    [0.0, 1.48, 0.65],
    [0.0, -1.42, -0.65],
    [-1.15, 1.25, -0.55],
    [1.15, 1.25, 0.55],
  ];

  const remaining = count - idx;
  const nodeBudget = Math.floor(remaining * 0.48);
  for (let i = 0; i < nodeBudget; i++) {
    const [sx, sy, sz] = satellites[i % satellites.length];
    const u = Math.random();
    const v = Math.random();
    const theta = u * Math.PI * 2;
    const phi = Math.acos(2 * v - 1);
    const r = 0.15 * Math.pow(Math.random(), 0.35);
    put(
      sx + r * Math.sin(phi) * Math.cos(theta),
      sy + r * Math.sin(phi) * Math.sin(theta),
      sz + r * Math.cos(phi)
    );
  }

  while (idx < count) {
    const sIdx = idx % satellites.length;
    const [sx, sy, sz] = satellites[sIdx];
    const tierY = tiers[sIdx % tiers.length];
    const t = Math.random();
    const omt = 1 - t;
    const cx = sx * 0.65;
    const cy = (tierY + sy) * 0.5 + 0.35;
    const cz = sz * 0.65;
    put(
      omt * omt * (sx * 0.45) + 2 * omt * t * cx + t * t * sx + (Math.random() - 0.5) * 0.04,
      omt * omt * tierY + 2 * omt * t * cy + t * t * sy + (Math.random() - 0.5) * 0.04,
      omt * omt * (sz * 0.45) + 2 * omt * t * cz + t * t * sz + (Math.random() - 0.5) * 0.04
    );
  }

  return positions;
}

/** 2. INHO PIX + DRE: Cubo Holográfico QR PIX em 3D + Torres Cilíndricas DRE & Espiral de Crescimento */
function buildInhoPixDrePositions(count: number): Float32Array {
  const positions = new Float32Array(count * 3);
  let idx = 0;

  const put = (x: number, y: number, z: number) => {
    if (idx >= count) return;
    positions[idx * 3] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;
    idx++;
  };

  // 1. Três Finder Patterns QR PIX Volumétricos em 3D + Matriz de Voxels (38% das partículas)
  const qrFinders = [
    { cx: -1.28, cy: 0.72, cz: 0.18 },
    { cx: -0.32, cy: 0.72, cz: -0.12 },
    { cx: -1.28, cy: -0.24, cz: -0.12 },
  ];
  const finderBudget = Math.floor(count * 0.26);
  for (let i = 0; i < finderBudget; i++) {
    const f = qrFinders[i % qrFinders.length];
    const isInnerCore = i % 3 === 0;
    if (isInnerCore) {
      // Núcleo cúbico denso 3D do finder QR
      put(
        f.cx + (Math.random() - 0.5) * 0.26,
        f.cy + (Math.random() - 0.5) * 0.26,
        f.cz + (Math.random() - 0.5) * 0.26
      );
    } else {
      // Moldura quadrada externa 3D do finder QR
      const side = i % 4;
      const span = (Math.random() - 0.5) * 0.68;
      const thick = (Math.random() - 0.5) * 0.08;
      const depth = (Math.random() - 0.5) * 0.22;
      const dx = side < 2 ? span : (side === 2 ? -0.34 : 0.34) + thick;
      const dy = side >= 2 ? span : (side === 0 ? 0.34 : -0.34) + thick;
      put(f.cx + dx, f.cy + dy, f.cz + depth);
    }
  }

  const qrVoxels = [
    [-0.38, -0.18, 0.15],
    [-0.12, -0.38, -0.10],
    [-0.68, -0.45, 0.22],
    [-0.82, 0.24, 0.12],
    [-0.32, 0.20, -0.18],
    [-1.28, -0.82, 0.10],
    [-0.82, -0.82, -0.14],
    [-0.36, -0.82, 0.18],
  ];
  const voxelBudget = Math.floor(count * 0.12);
  for (let i = 0; i < voxelBudget; i++) {
    const [vx, vy, vz] = qrVoxels[i % qrVoxels.length];
    const r = 0.11 * Math.pow(Math.random(), 0.4);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    put(
      vx + r * Math.sin(phi) * Math.cos(theta),
      vy + r * Math.sin(phi) * Math.sin(theta),
      vz + r * Math.cos(phi)
    );
  }

  // 2. Cinco Torres Financeiras DRE 3D + Esferas de Topo (42% das partículas)
  const dreBars = [
    { x: 0.18, h: 0.78, z: 0.22 },
    { x: 0.56, h: 1.18, z: 0.10 },
    { x: 0.94, h: 1.62, z: -0.04 },
    { x: 1.32, h: 2.08, z: -0.16 },
    { x: 1.68, h: 2.52, z: -0.28 },
  ];
  const baseY = -1.22;
  const barBudget = Math.floor(count * 0.42);
  for (let i = 0; i < barBudget; i++) {
    const bar = dreBars[i % dreBars.length];
    const isPeakNode = i % 5 === 0;
    if (isPeakNode) {
      // Esfera luminosa de meta/KPI no topo da barra DRE
      const u = Math.random();
      const v = Math.random();
      const theta = u * Math.PI * 2;
      const phi = Math.acos(2 * v - 1);
      const r = 0.13 * Math.pow(Math.random(), 0.35);
      put(
        bar.x + r * Math.sin(phi) * Math.cos(theta),
        baseY + bar.h + 0.12 + r * Math.sin(phi) * Math.sin(theta),
        bar.z + r * Math.cos(phi)
      );
    } else {
      // Coluna cilíndrica/hexagonal estriada
      const hNorm = Math.random();
      const y = baseY + hNorm * bar.h;
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.145 * (0.82 + 0.18 * Math.sin(hNorm * Math.PI * 8));
      put(bar.x + Math.cos(angle) * radius, y, bar.z + Math.sin(angle) * radius);
    }
  }

  // 3. Fita Ascendente de Fluxo de Caixa + Anel Base Concêntrico (20% restantes)
  const remaining = count - idx;
  const curveBudget = Math.floor(remaining * 0.55);
  for (let i = 0; i < curveBudget; i++) {
    const t = Math.random();
    const x = -1.45 + t * 3.20;
    const y = -0.95 + Math.pow(t, 1.35) * 2.35 + Math.sin(t * Math.PI * 3) * 0.08;
    const z = Math.cos(t * Math.PI * 2) * 0.38;
    put(
      x + (Math.random() - 0.5) * 0.05,
      y + (Math.random() - 0.5) * 0.05,
      z + (Math.random() - 0.5) * 0.05
    );
  }

  while (idx < count) {
    const theta = Math.random() * Math.PI * 2;
    const ringR = idx % 2 === 0 ? 1.55 : 1.05;
    put(
      Math.cos(theta) * ringR + (Math.random() - 0.5) * 0.06,
      -1.26 + (Math.random() - 0.5) * 0.03,
      Math.sin(theta) * ringR * 0.55 + (Math.random() - 0.5) * 0.06
    );
  }

  return positions;
}

/** 3. Orbe Cleaner V4: Arquitetura M.2 NVMe 3D + Vórtice Ciclônico de Ejeção de Cache */
function buildNvmeCleanerPositions(count: number): Float32Array {
  const positions = new Float32Array(count * 3);
  let idx = 0;

  const put = (x: number, y: number, z: number) => {
    if (idx >= count) return;
    positions[idx * 3] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;
    idx++;
  };

  // 1. Chassi Perimetral M.2 NVMe + Pinos Gold-Finger + Trilhas de Circuito (26% das partículas)
  const boardBudget = Math.floor(count * 0.26);
  for (let i = 0; i < boardBudget; i++) {
    const mode = i % 3;
    if (mode === 0) {
      // Moldura perimetral dupla do SSD M.2 (sem desperdiçar partículas em placa sólida)
      const t = Math.random();
      const isLongEdge = i % 2 === 0;
      const x = isLongEdge ? (t - 0.5) * 3.4 : (i % 4 === 0 ? -1.7 : 1.7) + (Math.random() - 0.5) * 0.06;
      const z = isLongEdge ? (i % 4 === 0 ? -0.58 : 0.58) + (Math.random() - 0.5) * 0.06 : (t - 0.5) * 1.16;
      put(x, -0.52 + (Math.random() - 0.5) * 0.05, z);
    } else if (mode === 1) {
      // Pinos conectores M-Key à esquerda
      const pinIdx = i % 10;
      const z = -0.45 + (pinIdx / 9) * 0.90;
      put(-1.82 + (Math.random() - 0.5) * 0.22, -0.52 + (Math.random() - 0.5) * 0.06, z);
    } else {
      // Trilhas condutoras longitudinais de alta velocidade
      const lane = (i % 7) - 3;
      const x = -1.65 + Math.random() * 3.30;
      const z = lane * 0.14 + Math.sin(x * 3.0) * 0.03;
      put(x, -0.50, z);
    }
  }

  // 2. Controlador Neural Multicadas + 4 Stacks 3D V-NAND em Camadas (30% das partículas)
  const chipBudget = Math.floor(count * 0.30);
  const nandCenters = [
    [-0.25, -0.28],
    [-0.25, 0.28],
    [0.65, -0.28],
    [0.65, 0.28],
  ];
  for (let i = 0; i < chipBudget; i++) {
    if (i % 4 === 0) {
      // Núcleo do controlador NVMe com anel dissipador
      const angle = Math.random() * Math.PI * 2;
      const r = 0.28 * Math.pow(Math.random(), 0.45);
      put(-1.12 + Math.cos(angle) * r, -0.34 + (Math.random() - 0.5) * 0.18, Math.sin(angle) * r);
    } else {
      // Wafers empilhados em 3D (6 camadas de memória V-NAND)
      const [nx, nz] = nandCenters[i % nandCenters.length];
      const layer = i % 6;
      const y = -0.44 + layer * 0.048;
      put(
        nx + (Math.random() - 0.5) * 0.62,
        y,
        nz + (Math.random() - 0.5) * 0.38
      );
    }
  }

  // 3. Vórtice Ciclônico de Limpeza + Cubos de Cache Ejetados em Espiral (44% restantes)
  const ejectedCubes = [
    [-0.55, 0.42, 0.28, 0.16],
    [0.12, 0.68, -0.24, 0.18],
    [0.72, 0.92, 0.26, 0.17],
    [-0.28, 1.08, -0.20, 0.15],
    [1.18, 0.62, -0.18, 0.19],
    [0.32, 1.32, 0.14, 0.15],
    [1.38, 1.18, 0.20, 0.14],
    [-0.85, 0.88, -0.22, 0.14],
  ];

  const remaining = count - idx;
  const cubeBudget = Math.floor(remaining * 0.42);
  for (let i = 0; i < cubeBudget; i++) {
    const [cx, cy, cz, size] = ejectedCubes[i % ejectedCubes.length];
    // Arestas octaedrais/cúbicas nítidas de blocos de cache ejetados
    const edge = i % 12;
    const t = (Math.random() - 0.5) * size * 1.4;
    const s = size * 0.7;
    let dx = 0, dy = 0, dz = 0;
    if (edge < 4) { dx = t; dy = (edge & 1 ? s : -s); dz = (edge & 2 ? s : -s); }
    else if (edge < 8) { dy = t; dx = (edge & 1 ? s : -s); dz = (edge & 2 ? s : -s); }
    else { dz = t; dx = (edge & 1 ? s : -s); dy = (edge & 2 ? s : -s); }
    put(cx + dx, cy + dy, cz + dz);
  }

  // Dupla espiral ciclônica ascendente varrendo os resíduos
  while (idx < count) {
    const hNorm = Math.random();
    const y = -0.35 + hNorm * 1.78;
    const arm = idx % 3;
    const spiralAngle = hNorm * Math.PI * 5.2 + (arm * Math.PI * 2) / 3;
    const radius = 0.28 + Math.pow(hNorm, 0.85) * 1.18;
    const spread = (Math.random() - 0.5) * 0.09;
    put(
      0.15 + Math.cos(spiralAngle) * radius + spread,
      y + (Math.random() - 0.5) * 0.05,
      Math.sin(spiralAngle) * radius * 0.72 + spread
    );
  }

  return positions;
}

/** 4. Orbe Music Studio: Anfiteatro FFT 3D de 16 Bandas + Console Curvo & Ondas Harmônicas */
function buildDawSpectrumPositions(count: number): Float32Array {
  const positions = new Float32Array(count * 3);
  let idx = 0;

  const put = (x: number, y: number, z: number) => {
    if (idx >= count) return;
    positions[idx * 3] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;
    idx++;
  };

  // 1. Analisador de Espectro FFT de 16 Bandas em Arco Semicircular 3D (44% das partículas)
  const spectrumHeights = [
    0.52, 0.88, 1.32, 1.78, 2.15, 1.82, 1.38, 1.64,
    2.08, 2.38, 1.92, 1.48, 1.15, 0.86, 0.62, 0.44,
  ];
  const fftBudget = Math.floor(count * 0.44);
  const bandCount = spectrumHeights.length;
  for (let i = 0; i < fftBudget; i++) {
    const bIdx = i % bandCount;
    const h = spectrumHeights[bIdx];
    const arcAngle = ((bIdx / (bandCount - 1)) - 0.5) * Math.PI * 0.78;
    const arcRadius = 1.45;
    const bx = Math.sin(arcAngle) * arcRadius * 1.15;
    const bz = -Math.cos(arcAngle) * arcRadius * 0.55 - 0.15;
    const baseY = -0.58;

    const isPeakDot = i % 7 === 0;
    if (isPeakDot) {
      // Ponto Peak-Hold flutuando acima da coluna de frequência
      const r = 0.08 * Math.pow(Math.random(), 0.4);
      const a = Math.random() * Math.PI * 2;
      put(bx + Math.cos(a) * r, baseY + h + 0.16 + (Math.random() - 0.5) * 0.05, bz + Math.sin(a) * r);
    } else {
      // Coluna segmentada de LEDs/partículas
      const seg = Math.floor(Math.random() * 14) / 14;
      const y = baseY + seg * h + (Math.random() - 0.5) * 0.04;
      const r = 0.085;
      const a = Math.random() * Math.PI * 2;
      put(bx + Math.cos(a) * r, y, bz + Math.sin(a) * r);
    }
  }

  // 2. Console de Mixagem Curvo com 8 Faders Motorizados e Knobs (30% das partículas)
  const faderCount = 8;
  const faderLevels = [0.25, 0.62, 0.48, 0.82, 0.74, 0.38, 0.58, 0.70];
  const consoleBudget = Math.floor(count * 0.30);
  for (let i = 0; i < consoleBudget; i++) {
    const ch = i % faderCount;
    const normX = (ch / (faderCount - 1)) * 2 - 1;
    const x = normX * 1.38;
    const t = Math.random(); // ao longo do curso do fader
    const y = -1.25 + (1 - t) * 0.48;
    const z = 0.85 - (1 - t) * 0.65;

    const isCap = i % 3 === 0;
    if (isCap) {
      const lvl = faderLevels[ch];
      const capY = -1.25 + lvl * 0.48 + 0.05;
      const capZ = 0.85 - lvl * 0.65;
      put(
        x + (Math.random() - 0.5) * 0.18,
        capY + (Math.random() - 0.5) * 0.06,
        capZ + (Math.random() - 0.5) * 0.10
      );
    } else {
      put(x + (Math.random() - 0.5) * 0.03, y, z + (Math.random() - 0.5) * 0.03);
    }
  }

  // 3. Onda Sonora Harmônica 3D (Senoide Dupla Envolvente) (26% restantes)
  while (idx < count) {
    const theta = Math.random() * Math.PI * 2;
    const waveArm = idx % 2 === 0 ? 1 : -1;
    const r = 1.52 + Math.sin(theta * 5) * 0.12;
    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r * 0.62;
    const y = 0.15 + waveArm * Math.sin(theta * 4) * 0.36 + (Math.random() - 0.5) * 0.04;
    put(x, y, z);
  }

  return positions;
}

/** 5. Void Telemetry & Ghost Engine: Domo Geodésico Zero-Trust 3D, Cofre Criptográfico & Scanner Orbital */
function buildLgpdShieldPositions(count: number): Float32Array {
  const positions = new Float32Array(count * 3);
  let idx = 0;

  const put = (x: number, y: number, z: number) => {
    if (idx >= count) return;
    positions[idx * 3] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;
    idx++;
  };

  // 1. Escudo Geodésico Esférico em Meridianos + Casca Fibonacci (42% das partículas)
  const shieldBudget = Math.floor(count * 0.42);
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < shieldBudget; i++) {
    if (i % 3 === 0) {
      // Meridianos e paralelos do domo Zero-Trust
      const ringIdx = i % 6;
      const theta = Math.random() * Math.PI * 2;
      const r = 1.42;
      if (ringIdx < 3) {
        const meridAngle = (ringIdx / 3) * Math.PI;
        put(
          Math.sin(theta) * Math.cos(meridAngle) * r,
          Math.cos(theta) * r,
          Math.sin(theta) * Math.sin(meridAngle) * r
        );
      } else {
        const lat = ((ringIdx - 3) - 1) * 0.62;
        const latR = Math.sqrt(Math.max(0.1, r * r - lat * lat));
        put(Math.cos(theta) * latR, lat, Math.sin(theta) * latR);
      }
    } else {
      // Pontos geodésicos de Fibonacci sobre a esfera protetora
      const k = i / shieldBudget;
      const phi = Math.acos(1 - 2 * k);
      const theta = i * goldenAngle;
      const r = 1.40 + (Math.random() - 0.5) * 0.04;
      put(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
      );
    }
  }

  // 2. Cofre Criptográfico Central (Dupla Hélice MultiFernet + Registros Protegidos) (36% das partículas)
  const vaultBudget = Math.floor(count * 0.36);
  for (let i = 0; i < vaultBudget; i++) {
    const hNorm = Math.random();
    const y = -0.88 + hNorm * 1.76;
    if (i % 2 === 0) {
      // Dupla Hélice KMS MultiFernet protegendo o núcleo
      const arm = i % 4 === 0 ? 0 : Math.PI;
      const angle = hNorm * Math.PI * 5.0 + arm;
      const r = 0.54;
      put(
        Math.cos(angle) * r + (Math.random() - 0.5) * 0.03,
        y,
        Math.sin(angle) * r + (Math.random() - 0.5) * 0.03
      );
    } else {
      // 5 anéis internos de registros LGPD anonimizados
      const row = ((i % 5) - 2) * 0.34;
      const a = Math.random() * Math.PI * 2;
      const r = 0.36 * Math.pow(Math.random(), 0.5);
      put(Math.cos(a) * r, row + (Math.random() - 0.5) * 0.04, Math.sin(a) * r);
    }
  }

  // 3. Anel Scanner Orbital Inclinado + 6 Sentinelas Zero-Trust (22% restantes)
  const sentinels = 6;
  while (idx < count) {
    const isSentinel = idx % 4 === 0;
    const tilt = 0.42;
    if (isSentinel) {
      const sIdx = idx % sentinels;
      const baseA = (sIdx / sentinels) * Math.PI * 2;
      const ox = Math.cos(baseA) * 1.62;
      const oy = Math.sin(baseA) * Math.sin(tilt) * 1.62;
      const oz = Math.sin(baseA) * Math.cos(tilt) * 1.62;
      const r = 0.11 * Math.pow(Math.random(), 0.35);
      const u = Math.random() * Math.PI * 2;
      const v = Math.acos(2 * Math.random() - 1);
      put(
        ox + r * Math.sin(v) * Math.cos(u),
        oy + r * Math.sin(v) * Math.sin(u),
        oz + r * Math.cos(v)
      );
    } else {
      const a = Math.random() * Math.PI * 2;
      const r = 1.62 + (Math.random() - 0.5) * 0.06;
      put(
        Math.cos(a) * r,
        Math.sin(a) * Math.sin(tilt) * r + (Math.random() - 0.5) * 0.03,
        Math.sin(a) * Math.cos(tilt) * r
      );
    }
  }

  return positions;
}

/** 6. INHO Manifesto: Árvore Neural 3D (raízes orgânicas, tronco espiralado, galhos fractais, copa volumétrica e frutos CBM) */
function buildInhoGrowthTreePositions(count: number): Float32Array {
  const positions = new Float32Array(count * 3);
  let idx = 0;

  const put = (x: number, y: number, z: number) => {
    if (idx >= count) return;
    positions[idx * 3] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;
    idx++;
  };

  // 1. Terra & Raízes Orgânicas (18% das partículas)
  const rootBudget = Math.floor(count * 0.18);
  const ringBudget = Math.floor(rootBudget * 0.28);
  for (let i = 0; i < ringBudget; i++) {
    const ringRadius = i % 2 === 0 ? 0.92 : 1.42;
    const theta = (i / ringBudget) * Math.PI * 2 + (Math.random() - 0.5) * 0.08;
    const r = ringRadius + (Math.random() - 0.5) * 0.09;
    const ripple = Math.sin(theta * 6) * 0.025;
    put(
      Math.cos(theta) * r,
      -1.36 + ripple + (Math.random() - 0.5) * 0.02,
      Math.sin(theta) * r * 0.78
    );
  }

  const rootCount = 8;
  const tendrilBudget = rootBudget - ringBudget;
  for (let i = 0; i < tendrilBudget; i++) {
    const rootIdx = i % rootCount;
    const t = Math.random();
    const baseAngle = (rootIdx / rootCount) * Math.PI * 2 + 0.25;
    const curl = Math.sin(t * Math.PI * 1.5 + rootIdx) * 0.18;
    const angle = baseAngle + curl;
    const radialDist = 0.14 + Math.pow(t, 0.85) * 1.22;
    const y = -0.92 - Math.pow(t, 0.65) * 0.45 + Math.sin(t * Math.PI) * 0.05;
    const thickness = (1 - t * 0.78) * 0.095;
    const phi = Math.random() * Math.PI * 2;
    put(
      Math.cos(angle) * radialDist + Math.cos(phi) * thickness,
      y + Math.sin(phi) * thickness * 0.6,
      Math.sin(angle) * radialDist * 0.82 + Math.sin(phi) * thickness
    );
  }

  // 2. Tronco Esculpido em Feixes Torcidos + Dupla Hélice de Seiva (22% das partículas)
  const trunkBudget = Math.floor(count * 0.22);
  const strandCount = 7;
  for (let i = 0; i < trunkBudget; i++) {
    const hNorm = Math.random(); // 0 na base (-1.02), 1 no topo do tronco (+0.26)
    const y = -1.02 + hNorm * 1.28;
    const waist = 0.135 + Math.pow(Math.abs(hNorm - 0.58), 1.7) * 0.42;
    const isSapSpiral = i % 6 === 0;
    if (isSapSpiral) {
      const spiralAngle = hNorm * Math.PI * 4.5 + (i % 2) * Math.PI;
      const sr = waist * 1.08;
      put(
        Math.cos(spiralAngle) * sr + (Math.random() - 0.5) * 0.025,
        y,
        Math.sin(spiralAngle) * sr + (Math.random() - 0.5) * 0.025
      );
    } else {
      const strand = i % strandCount;
      const angle = (strand / strandCount) * Math.PI * 2 + hNorm * 1.55;
      const r = waist * (0.78 + 0.28 * Math.random());
      const jitter = (Math.random() - 0.5) * 0.04;
      put(Math.cos(angle) * r + jitter, y, Math.sin(angle) * r + jitter);
    }
  }

  // 3. Galhos Fractais Primários e Secundários em 3D (22% das partículas)
  const branchTargets = [
    [-1.18, 0.84, -0.16],
    [1.18, 0.84, 0.16],
    [-0.72, 1.22, 0.22],
    [0.72, 1.22, -0.18],
    [-0.38, 0.98, 0.52],
    [0.42, 0.98, -0.48],
    [0.0, 1.38, 0.0],
    [-0.95, 0.52, 0.30],
    [0.95, 0.52, -0.28],
  ];
  const branchBudget = Math.floor(count * 0.22);
  for (let i = 0; i < branchBudget; i++) {
    const bIdx = i % branchTargets.length;
    const [tx, ty, tz] = branchTargets[bIdx];
    const t = Math.random();
    const startY = 0.08 + (bIdx % 3) * 0.07;
    // Curva Bézier quadrática suave do topo do tronco até o domo da copa
    const cx = tx * 0.48;
    const cy = startY + (ty - startY) * 0.68 + 0.14;
    const cz = tz * 0.48;
    const omt = 1 - t;
    const bx = omt * omt * 0 + 2 * omt * t * cx + t * t * tx;
    const by = omt * omt * startY + 2 * omt * t * cy + t * t * ty;
    const bz = omt * omt * 0 + 2 * omt * t * cz + t * t * tz;
    const radius = (1 - t * 0.72) * 0.085;
    const a = Math.random() * Math.PI * 2;
    put(
      bx + Math.cos(a) * radius,
      by + (Math.random() - 0.5) * radius,
      bz + Math.sin(a) * radius
    );
  }

  // 4. Copa Volumétrica (Domos de Folhagem Filotática) + Frutos Luminosos CBM (38% restantes)
  const canopyDomes = [
    { x: 0.0, y: 1.42, z: 0.0, rx: 0.64, ry: 0.42, rz: 0.58 },
    { x: -0.72, y: 1.22, z: 0.18, rx: 0.56, ry: 0.36, rz: 0.50 },
    { x: 0.72, y: 1.22, z: -0.16, rx: 0.56, ry: 0.36, rz: 0.50 },
    { x: -1.20, y: 0.84, z: -0.14, rx: 0.52, ry: 0.34, rz: 0.46 },
    { x: 1.20, y: 0.84, z: 0.14, rx: 0.52, ry: 0.34, rz: 0.46 },
    { x: -0.40, y: 1.00, z: 0.48, rx: 0.48, ry: 0.32, rz: 0.44 },
    { x: 0.42, y: 1.00, z: -0.46, rx: 0.48, ry: 0.32, rz: 0.44 },
    { x: -0.96, y: 0.54, z: 0.28, rx: 0.42, ry: 0.28, rz: 0.38 },
    { x: 0.96, y: 0.54, z: -0.26, rx: 0.42, ry: 0.28, rz: 0.38 },
  ];

  const fruitNodes = [
    [-1.12, 0.58, 0.18],
    [-0.64, 0.94, 0.34],
    [0.0, 1.12, 0.42],
    [0.64, 0.92, 0.30],
    [1.12, 0.60, -0.12],
    [-0.36, 1.34, 0.24],
    [0.38, 1.32, -0.22],
    [0.0, 0.74, -0.38],
  ];

  const remaining = count - idx;
  const fruitBudget = Math.floor(remaining * 0.22);
  for (let i = 0; i < fruitBudget; i++) {
    const [fx, fy, fz] = fruitNodes[i % fruitNodes.length];
    // Esfera densa brilhante (Fruto CBM / Nó OrBrick)
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);
    const r = 0.115 * Math.pow(Math.random(), 0.35);
    put(
      fx + r * Math.sin(phi) * Math.cos(theta),
      fy + r * Math.sin(phi) * Math.sin(theta),
      fz + r * Math.cos(phi)
    );
  }

  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  let foliageIdx = 0;
  while (idx < count) {
    const dome = canopyDomes[foliageIdx % canopyDomes.length];
    foliageIdx++;
    const u = Math.random();
    const v = Math.random();
    const theta = foliageIdx * goldenAngle + (Math.random() - 0.5) * 0.2;
    const phi = Math.acos(2.0 * v - 1.0);
    const shellBias = 0.55 + 0.45 * Math.pow(u, 0.35);
    put(
      dome.x + dome.rx * shellBias * Math.sin(phi) * Math.cos(theta),
      dome.y + dome.ry * shellBias * Math.cos(phi),
      dome.z + dome.rz * shellBias * Math.sin(phi) * Math.sin(theta)
    );
  }

  return positions;
}

const BUILDERS: Record<VoidToolShape, (count: number) => Float32Array> = {
  'server-cluster': buildServerClusterPositions,
  'inho-pix-dre': buildInhoPixDrePositions,
  'inho-growth-tree': buildInhoGrowthTreePositions,
  'nvme-cleaner': buildNvmeCleanerPositions,
  'daw-spectrum': buildDawSpectrumPositions,
  'lgpd-shield': buildLgpdShieldPositions,
};

const VERTEX_SHADER = `
  uniform float uTime;
  uniform vec2 uPointer;
  uniform vec2 uHighlightBand;
  uniform float uHighlightActive;

  attribute float aRandomSeed;

  varying float vElevation;
  varying float vDistToPointer;
  varying float vBandFocus;
  varying float vWavePulse;

  void main() {
    vec3 mixedPos = position;
    mixedPos.y += sin(uTime * 1.6 + aRandomSeed * 6.28) * 0.018;

    // Onda de seiva/energia ascendente contínua
    float waveY = mod(uTime * 0.78, 3.3) - 1.55;
    float wavePulse = smoothstep(0.38, 0.0, abs(mixedPos.y - waveY));
    vWavePulse = wavePulse;

    // Destaque anatômico por faixa de elevação (quando usuário interage com as 8 estações)
    float inBand = step(uHighlightBand.x, mixedPos.y) * step(mixedPos.y, uHighlightBand.y);
    float bandMargin = smoothstep(uHighlightBand.x - 0.18, uHighlightBand.x + 0.06, mixedPos.y) *
                       (1.0 - smoothstep(uHighlightBand.y - 0.06, uHighlightBand.y + 0.18, mixedPos.y));
    vBandFocus = mix(inBand, bandMargin, 0.5) * uHighlightActive;

    if (vBandFocus > 0.1) {
      mixedPos.xz *= 1.0 + sin(uTime * 5.0 + aRandomSeed * 6.28) * 0.035 * vBandFocus;
    }

    vec2 pointerWorld = uPointer * 2.2;
    float dist = distance(mixedPos.xy, pointerWorld);
    vDistToPointer = dist;

    if (dist < 0.85) {
      float force = (0.85 - dist) / 0.85;
      mixedPos.z += force * 0.28;
    }

    vElevation = mixedPos.y;

    vec4 mvPosition = modelViewMatrix * vec4(mixedPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    float highlightBoost = smoothstep(0.85, 0.0, dist) * 2.2 + wavePulse * 1.15 + vBandFocus * 2.6;
    gl_PointSize = (3.4 + highlightBoost) * (4.2 / -mvPosition.z);
  }
`;

const FRAGMENT_SHADER = `
  uniform vec3 uPrimaryColor;
  uniform vec3 uSecondaryColor;
  uniform float uHighlightActive;

  varying float vElevation;
  varying float vDistToPointer;
  varying float vBandFocus;
  varying float vWavePulse;

  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;

    float coreGlow = smoothstep(0.5, 0.06, d);
    float mixFactor = clamp((vElevation + 1.5) / 3.0, 0.0, 1.0);
    vec3 baseColor = mix(uPrimaryColor, uSecondaryColor, mixFactor);

    float cursorHighlight = smoothstep(0.85, 0.0, vDistToPointer);
    float energyGlow = clamp(cursorHighlight * 0.55 + vWavePulse * 0.35 + vBandFocus * 0.65, 0.0, 1.0);
    vec3 finalColor = mix(baseColor, vec3(0.96, 1.0, 1.0), energyGlow);

    float dimFactor = uHighlightActive > 0.5 ? mix(0.32, 1.0, vBandFocus) : 1.0;
    float alpha = coreGlow * (0.68 + cursorHighlight * 0.32 + vWavePulse * 0.22 + vBandFocus * 0.30) * dimFactor;
    gl_FragColor = vec4(finalColor, clamp(alpha, 0.0, 1.0));
  }
`;

/**
 * Void WebGL (Three.js puro): nuvem de partículas amostrada sobre a geometria
 * da ferramenta, com reação ao ponteiro, economia de GPU e blindagem anti-crash.
 */
export default function ToolVoidCanvas({
  activeShape,
  accentColor = '#00fff5',
  secondaryColor = '#3b82f6',
  particleCount = PARTICLE_COUNT_DEFAULT,
  highlightBand = null,
  className = '',
}: ToolVoidCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const highlightBandRef = useRef<[number, number] | null>(highlightBand);
  highlightBandRef.current = highlightBand;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: true,
        powerPreference: 'low-power',
        failIfMajorPerformanceCaveat: false,
      });
    } catch {
      // WebGL indisponível ou contexto estourado: contêiner silencioso e seguro
      return;
    }

    let isContextLost = false;
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      isContextLost = true;
    };
    const handleContextRestored = () => {
      isContextLost = false;
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost, false);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored, false);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / Math.max(container.clientHeight, 1),
      0.1,
      100
    );
    camera.position.set(0, 0.2, 4.6);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const positions = BUILDERS[activeShape](particleCount);
    const seeds = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) seeds[i] = Math.random();

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aRandomSeed', new THREE.BufferAttribute(seeds, 1));

    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uPointer: { value: new THREE.Vector2(99, 99) },
        uPrimaryColor: { value: new THREE.Color(accentColor) },
        uSecondaryColor: { value: new THREE.Color(secondaryColor) },
        uHighlightBand: { value: new THREE.Vector2(-1.6, 1.7) },
        uHighlightActive: { value: 0.0 },
      },
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const targetPointer = new THREE.Vector2(99, 99);
    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      targetPointer.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
    };
    const handlePointerLeave = () => targetPointer.set(99, 99);
    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerleave', handlePointerLeave);

    let isVisible = true;
    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
      },
      { threshold: 0.05 }
    );
    visibilityObserver.observe(container);

    const resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = Math.max(container.clientHeight, 1);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      if (!isContextLost) {
        try {
          renderer.setSize(w, h);
        } catch {
          // ignore transient resize error
        }
      }
    });
    resizeObserver.observe(container);

    let frameId = 0;
    const clock = new THREE.Clock();
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      if (!isVisible || document.hidden || isContextLost) return;

      const elapsed = clock.getElapsedTime();
      material.uniforms.uTime.value = elapsed;
      material.uniforms.uPointer.value.lerp(targetPointer, 0.12);

      const hb = highlightBandRef.current;
      if (hb) {
        material.uniforms.uHighlightBand.value.set(hb[0], hb[1]);
        material.uniforms.uHighlightActive.value += (1.0 - material.uniforms.uHighlightActive.value) * 0.15;
      } else {
        material.uniforms.uHighlightActive.value += (0.0 - material.uniforms.uHighlightActive.value) * 0.15;
      }

      points.rotation.y = elapsed * 0.22;
      points.rotation.x = Math.cos(elapsed * 0.25) * 0.08;

      try {
        renderer.render(scene, camera);
      } catch {
        // Safe catch on GPU context recovery
      }
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      visibilityObserver.disconnect();
      resizeObserver.disconnect();
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerleave', handlePointerLeave);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeShape, particleCount, accentColor, secondaryColor]);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className={`relative w-full h-full select-none pointer-events-auto ${className}`}
    />
  );
}
