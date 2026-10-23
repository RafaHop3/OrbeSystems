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
  | 'lgpd-shield' // Void Telemetry / Ghost Engine: escudo Zero Trust + documento
  | 'nvme-cleaner' // Orbe Cleaner: SSD M.2 NVMe com blocos de cache ejetados
  | 'daw-spectrum'; // Orbe Music / Visual Studio: mesa de mixagem + FFT

interface ToolVoidCanvasProps {
  activeShape: VoidToolShape;
  accentColor?: string;
  secondaryColor?: string;
  particleCount?: number;
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

/** 1. Cluster de servidores blade (infraestrutura Orbe) */
function buildServerClusterPositions(count: number): Float32Array {
  const geos: THREE.BufferGeometry[] = [];
  [-1.05, 0.0, 1.05].forEach((y) => {
    const blade = new THREE.BoxGeometry(3.1, 0.42, 2.0);
    blade.translate(0, y, 0);
    geos.push(blade);

    for (let b = -1.2; b <= 1.2; b += 0.6) {
      const bay = new THREE.BoxGeometry(0.4, 0.26, 0.14);
      bay.translate(b, y, 1.05);
      geos.push(bay);
    }
  });

  const busLeft = new THREE.CylinderGeometry(0.08, 0.08, 2.6, 12);
  busLeft.translate(-1.65, 0, -0.75);
  geos.push(busLeft);

  const busRight = new THREE.CylinderGeometry(0.08, 0.08, 2.6, 12);
  busRight.translate(1.65, 0, -0.75);
  geos.push(busRight);

  return sampleGeometriesSurface(geos, count);
}

/** 2. INHO: 3 marcadores de QR Code PIX + 4 barras DRE */
function buildInhoPixDrePositions(count: number): Float32Array {
  const geos: THREE.BufferGeometry[] = [];

  const addQrFinderPattern = (cx: number, cy: number) => {
    const size = 0.76;
    const thickness = 0.12;
    const depth = 0.16;

    const top = new THREE.BoxGeometry(size, thickness, depth);
    top.translate(cx, cy + size / 2 - thickness / 2, 0);
    const bottom = new THREE.BoxGeometry(size, thickness, depth);
    bottom.translate(cx, cy - size / 2 + thickness / 2, 0);
    const left = new THREE.BoxGeometry(thickness, size, depth);
    left.translate(cx - size / 2 + thickness / 2, cy, 0);
    const right = new THREE.BoxGeometry(thickness, size, depth);
    right.translate(cx + size / 2 - thickness / 2, cy, 0);
    const center = new THREE.BoxGeometry(0.3, 0.3, depth * 1.2);
    center.translate(cx, cy, 0);

    geos.push(top, bottom, left, right, center);
  };

  addQrFinderPattern(-1.4, 0.8);
  addQrFinderPattern(-0.35, 0.8);
  addQrFinderPattern(-1.4, -0.25);

  const cells = [
    [-0.45, -0.15],
    [-0.2, -0.35],
    [-0.65, -0.45],
    [-0.9, 0.3],
    [-0.35, 0.25],
    [-1.4, -0.9],
    [-0.9, -0.9],
    [-0.4, -0.9],
  ];
  cells.forEach(([x, y]) => {
    const cell = new THREE.BoxGeometry(0.2, 0.2, 0.14);
    cell.translate(x, y, 0);
    geos.push(cell);
  });

  [0.85, 1.35, 1.9, 2.5].forEach((h, idx) => {
    const bar = new THREE.BoxGeometry(0.35, h, 0.35);
    bar.translate(0.42 + idx * 0.5, -1.2 + h / 2, 0);
    geos.push(bar);
  });

  const basePlate = new THREE.BoxGeometry(4.0, 0.08, 1.1);
  basePlate.translate(0.1, -1.28, 0);
  geos.push(basePlate);

  return sampleGeometriesSurface(geos, count);
}

/** 3. Orbe Cleaner: SSD M.2 NVMe com blocos de cache ejetados */
function buildNvmeCleanerPositions(count: number): Float32Array {
  const geos: THREE.BufferGeometry[] = [];

  const pcb = new THREE.BoxGeometry(3.7, 0.1, 1.3);
  pcb.translate(0, -0.25, 0);
  geos.push(pcb);

  for (let z = -0.45; z <= 0.45; z += 0.18) {
    const pin = new THREE.BoxGeometry(0.32, 0.14, 0.09);
    pin.translate(-2.0, -0.25, z);
    geos.push(pin);
  }

  const controller = new THREE.BoxGeometry(0.62, 0.22, 0.62);
  controller.translate(-1.05, -0.1, 0);
  geos.push(controller);

  [
    [-0.1, -0.3],
    [-0.1, 0.3],
    [0.85, -0.3],
    [0.85, 0.3],
  ].forEach(([x, z]) => {
    const nand = new THREE.BoxGeometry(0.72, 0.18, 0.46);
    nand.translate(x, -0.11, z);
    geos.push(nand);
  });

  [
    [0.1, 0.65, -0.2, 0.26],
    [0.65, 0.95, 0.25, 0.22],
    [1.3, 0.55, -0.15, 0.28],
    [-0.45, 0.85, 0.3, 0.22],
    [1.5, 1.1, 0.1, 0.2],
    [0.35, 1.25, -0.1, 0.18],
  ].forEach(([x, y, z, s]) => {
    const cube = new THREE.BoxGeometry(s, s, s);
    cube.rotateX(0.4);
    cube.rotateZ(0.6);
    cube.translate(x, y, z);
    geos.push(cube);
  });

  return sampleGeometriesSurface(geos, count);
}

/** 4. Orbe Music: mesa de mixagem com 6 faders + analisador FFT de 12 bandas */
function buildDawSpectrumPositions(count: number): Float32Array {
  const geos: THREE.BufferGeometry[] = [];

  const consoleBase = new THREE.BoxGeometry(3.7, 0.14, 1.65);
  consoleBase.rotateX(0.32);
  consoleBase.translate(0, -0.72, 0.2);
  geos.push(consoleBase);

  const faderPositions = [-1.35, -0.81, -0.27, 0.27, 0.81, 1.35];
  const faderValues = [0.2, 0.55, -0.1, 0.45, 0.15, 0.65];

  faderPositions.forEach((x, idx) => {
    const track = new THREE.BoxGeometry(0.06, 0.08, 1.2);
    track.rotateX(0.32);
    track.translate(x, -0.65, 0.2);
    geos.push(track);

    const zOffset = faderValues[idx] * 0.42;
    const cap = new THREE.BoxGeometry(0.26, 0.18, 0.2);
    cap.rotateX(0.32);
    cap.translate(x, -0.55 - zOffset * 0.32, 0.2 + zOffset);
    geos.push(cap);
  });

  [0.5, 0.95, 1.5, 2.05, 1.65, 1.2, 1.8, 2.3, 1.55, 1.1, 0.8, 0.45].forEach((h, i) => {
    const bar = new THREE.BoxGeometry(0.18, h, 0.18);
    bar.translate(-1.6 + i * 0.29, -0.35 + h / 2, -0.65);
    geos.push(bar);
  });

  return sampleGeometriesSurface(geos, count);
}

/** 5. Escudo Zero Trust protegendo um registro de dados (LGPD / Ghost Engine) */
function buildLgpdShieldPositions(count: number): Float32Array {
  const geos: THREE.BufferGeometry[] = [];

  const shieldRing = new THREE.TorusGeometry(1.4, 0.12, 12, 8);
  shieldRing.rotateZ(Math.PI / 8);
  geos.push(shieldRing);

  geos.push(new THREE.BoxGeometry(1.35, 1.8, 0.12));

  for (let row = -0.6; row <= 0.6; row += 0.3) {
    const dataLine = new THREE.BoxGeometry(0.92, 0.09, 0.2);
    dataLine.translate(0, row, 0);
    geos.push(dataLine);
  }

  const scannerBar = new THREE.BoxGeometry(2.4, 0.12, 0.34);
  scannerBar.translate(0, 0.15, 0.15);
  geos.push(scannerBar);

  return sampleGeometriesSurface(geos, count);
}

const BUILDERS: Record<VoidToolShape, (count: number) => Float32Array> = {
  'server-cluster': buildServerClusterPositions,
  'inho-pix-dre': buildInhoPixDrePositions,
  'nvme-cleaner': buildNvmeCleanerPositions,
  'daw-spectrum': buildDawSpectrumPositions,
  'lgpd-shield': buildLgpdShieldPositions,
};

const VERTEX_SHADER = `
  uniform float uTime;
  uniform vec2 uPointer;

  attribute float aRandomSeed;

  varying float vElevation;
  varying float vDistToPointer;

  void main() {
    vec3 mixedPos = position;
    mixedPos.y += sin(uTime * 1.6 + aRandomSeed * 6.28) * 0.018;

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

    float highlightBoost = smoothstep(0.85, 0.0, dist) * 2.2;
    gl_PointSize = (3.3 + highlightBoost) * (4.2 / -mvPosition.z);
  }
`;

const FRAGMENT_SHADER = `
  uniform vec3 uPrimaryColor;
  uniform vec3 uSecondaryColor;

  varying float vElevation;
  varying float vDistToPointer;

  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;

    float coreGlow = smoothstep(0.5, 0.08, d);
    float mixFactor = clamp((vElevation + 1.5) / 3.0, 0.0, 1.0);
    vec3 baseColor = mix(uPrimaryColor, uSecondaryColor, mixFactor);

    float cursorHighlight = smoothstep(0.85, 0.0, vDistToPointer);
    vec3 finalColor = mix(baseColor, vec3(0.95, 0.99, 1.0), cursorHighlight * 0.55);

    float alpha = coreGlow * (0.68 + cursorHighlight * 0.32);
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

/**
 * Void WebGL (Three.js puro): nuvem de partículas amostrada sobre a geometria
 * da ferramenta, com reação ao ponteiro e pausa quando fora da tela.
 */
export default function ToolVoidCanvas({
  activeShape,
  accentColor = '#00fff5',
  secondaryColor = '#3b82f6',
  particleCount = PARTICLE_COUNT_DEFAULT,
  className = '',
}: ToolVoidCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      // WebGL indisponível: o contêiner permanece vazio sem quebrar a página.
      return;
    }

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
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    let frameId = 0;
    const clock = new THREE.Clock();
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      if (!isVisible || document.hidden) return;

      const elapsed = clock.getElapsedTime();
      material.uniforms.uTime.value = elapsed;
      material.uniforms.uPointer.value.lerp(targetPointer, 0.12);

      points.rotation.y = Math.sin(elapsed * 0.35) * 0.28;
      points.rotation.x = Math.cos(elapsed * 0.25) * 0.08;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      visibilityObserver.disconnect();
      resizeObserver.disconnect();
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerleave', handlePointerLeave);
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
