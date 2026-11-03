'use client';

import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { WebGLErrorBoundary, isWebGLAvailable } from './WebGLErrorBoundary';

const StarCluster = () => {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const isVisibleRef = useRef(true);

  useEffect(() => {
    const handleVisibility = () => {
      isVisibleRef.current = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useFrame((state, delta) => {
    if (!isVisibleRef.current) return;
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.02;
      groupRef.current.rotation.x += delta * 0.005;
    }
    if (coreRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 1.5) * 0.08;
      coreRef.current.scale.set(scale, scale, scale);
    }
  });

  const particlePositions = useMemo(() => {
    const count = 900;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = Math.pow(Math.random(), 2) * 18;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }
    return positions;
  }, []);

  return (
    <group ref={groupRef} position={[0, 0, -25]}>
      <mesh ref={coreRef}>
        <sphereGeometry args={[1.5, 24, 24]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
      </mesh>
      <mesh>
        <sphereGeometry args={[4, 24, 24]} />
        <meshBasicMaterial color="#00fff5" transparent opacity={0.35} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[9, 24, 24]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.15} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[16, 24, 24]} />
        <meshBasicMaterial color="#8b5cf6" transparent opacity={0.05} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particlePositions.length / 3}
            array={particlePositions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.12}
          color="#e0f2fe"
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
      <Sparkles count={150} scale={12} size={3} speed={0.2} opacity={0.8} color="#ffffff" />
      <Sparkles count={220} scale={22} size={1.5} speed={0.1} opacity={0.5} color="#00fff5" />
    </group>
  );
};

const AnimatedSpace = () => {
  const spaceRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (document.hidden) return;
    if (spaceRef.current) {
      spaceRef.current.rotation.y -= delta * 0.003;
    }
  });

  return (
    <group ref={spaceRef}>
      <Stars radius={50} depth={50} count={2500} factor={4} saturation={0.5} fade speed={1} />
    </group>
  );
};

const StaticCssFallback = () => (
  <div
    className="w-full h-full pointer-events-none"
    style={{
      background:
        'radial-gradient(circle at 50% 45%, rgba(0, 255, 245, 0.14) 0%, rgba(59, 130, 246, 0.08) 28%, rgba(139, 92, 246, 0.04) 52%, rgba(2, 2, 5, 1) 80%)',
    }}
  />
);

const StarryCanvas = () => {
  const [webglOk, setWebglOk] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    const activate = () => {
      if (cancelled) return;
      setWebglOk(isWebGLAvailable());
    };

    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback;
    const cic = (window as unknown as { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback;

    if (typeof ric === 'function') {
      const id = ric(activate, { timeout: 600 });
      return () => {
        cancelled = true;
        if (typeof cic === 'function') cic(id);
      };
    }

    const timer = window.setTimeout(activate, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  if (!webglOk) {
    return <StaticCssFallback />;
  }

  return (
    <WebGLErrorBoundary fallback={<StaticCssFallback />}>
      <Canvas
        camera={{ position: [0, 0, 10], fov: 60 }}
        dpr={[1, 1.5]}
        gl={{
          powerPreference: 'low-power',
          antialias: false,
          alpha: true,
          failIfMajorPerformanceCaveat: false,
        }}
      >
        <ambientLight intensity={0.2} />
        <StarCluster />
        <AnimatedSpace />
      </Canvas>
    </WebGLErrorBoundary>
  );
};

export default function StarryBackground() {
  return (
    <div className="fixed inset-0 z-[-1] bg-[#020205] overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#020205_100%)] z-10 opacity-80" />
      <StarryCanvas />
    </div>
  );
}
