// @ts-nocheck
"use client";

import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, Environment, MeshDistortMaterial, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { globalAudioEngine } from "./AudioEngine";
import { EffectComposer, Bloom, Glitch, Noise, Pixelation } from "@react-three/postprocessing";
import { GlitchMode } from "postprocessing";

// Routing Interface
export interface RouteRule {
    id: string;
    source: string;
    target: string;
    amount: number;
    smooth: 'linear' | 'fast_decay' | 'slow_decay';
    invert: boolean;
    active: boolean;
}

// ── Geometria Reativa ────────────────────────────────────────────────────────
const ReactivePrimitive = ({ sensitivity = 1.0, color = "#00ffcc", form = "icosahedron", routings = [] as RouteRule[] }) => {
    const groupRef = useRef<THREE.Group>(null);
    const outerMaterialRef = useRef<any>(null); // MeshDistortMaterial reference
    const innerMaterialRef = useRef<THREE.MeshPhysicalMaterial>(null);

    const ring1Ref = useRef<THREE.Mesh>(null);
    const ring2Ref = useRef<THREE.Mesh>(null);

    // Armazena as escalas / cores para lerp suave
    const uniforms = useMemo(() => ({ currentBass: 0, currentTreble: 0, vertexDistortion: 0 }), []);

    useFrame((state, delta) => {
        // 1. Coleta FFT do AudioEngine
        const freq = globalAudioEngine.getFrequencyData() as any;

        // Routing Parser Engine
        let targets: Record<string, number> = {
            meshScale: 1.0,
            rotationSpeed: 1.0,
            wireframeThickness: 1.0,
            vertexNoise: 0.0,
            bloomIntensity: 1.5,
            chromaticAberration: 0.0
        };

        // Calcula as rotas
        routings.filter(r => r.active).forEach(route => {
            let sourceVal = freq[route.source] || 0;
            // Smooth algorithms poderiam aplicar LERP aqui baseado num ref de state anterior,
            // mas para MVP o mapeamento direto já causa vida
            if (route.invert) sourceVal = 1.0 - sourceVal;

            // Amount é de -100 a +100
            const mod = sourceVal * (route.amount / 100);

            if (targets[route.target] !== undefined) {
                targets[route.target] += mod;
            }
        });

        // Aplica curva de suavização matemática nas próprias saídas globais
        uniforms.currentBass = THREE.MathUtils.lerp(uniforms.currentBass, targets.meshScale, 0.15);
        uniforms.currentTreble = THREE.MathUtils.lerp(uniforms.currentTreble, targets.rotationSpeed, 0.2);
        uniforms.vertexDistortion = THREE.MathUtils.lerp(uniforms.vertexDistortion, targets.vertexNoise, 0.15);

        if (groupRef.current) {
            // Escala Modulada
            const scale = uniforms.currentBass * sensitivity;
            const safeScale = Math.max(0.1, scale);
            groupRef.current.scale.set(safeScale, safeScale, safeScale);

            // Rotação Modulada Base
            groupRef.current.rotation.x += delta * 0.5 * uniforms.currentTreble;
            groupRef.current.rotation.y += delta * 0.8 * uniforms.currentTreble;

            // Parallax do Mouse em cima da Rotação
            const parallaxX = (state.pointer.y * Math.PI) * 0.15;
            const parallaxY = (state.pointer.x * Math.PI) * 0.15;
            groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, groupRef.current.rotation.x + parallaxX, 0.05);
            groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, groupRef.current.rotation.y + parallaxY, 0.05);
        }

        // Anéis Orbitais Reativos (Accretion Disks)
        if (ring1Ref.current) ring1Ref.current.rotation.x -= delta * 1.5 * uniforms.currentTreble;
        if (ring2Ref.current) ring2Ref.current.rotation.y += delta * 2.0 * uniforms.currentTreble;

        if (outerMaterialRef.current) {
            // Ajusta MeshDistortMaterial properties
            outerMaterialRef.current.emissiveIntensity = targets.bloomIntensity * sensitivity;
            outerMaterialRef.current.distort = uniforms.vertexDistortion * sensitivity * 1.2;
            outerMaterialRef.current.speed = 1.0 + (uniforms.currentTreble * 4.0);
        }

        if (innerMaterialRef.current) {
            // Núcleo escuro pode reanimar pequenos highlights no transient
            innerMaterialRef.current.emissiveIntensity = (targets.bloomIntensity * 0.2);
        }
    });

    const BaseGeometry = () => {
        if (form === "sphere") return <sphereGeometry args={[2, 64, 64]} />;
        if (form === "box") return <boxGeometry args={[2.5, 2.5, 2.5, 8, 8, 8]} />;
        if (form === "torus") return <torusKnotGeometry args={[1.2, 0.4, 128, 32]} />;
        return <icosahedronGeometry args={[2, 24]} />; // high subdivision to handle distortion curves
    };

    return (
        <group ref={groupRef}>
            {/* Núcleo Interno (Solid Core) */}
            <mesh scale={0.97}>
                <BaseGeometry />
                <meshPhysicalMaterial
                    ref={innerMaterialRef}
                    color="#030305"
                    emissive={color}
                    emissiveIntensity={0.1}
                    roughness={0.2}
                    metalness={0.9}
                    clearcoat={1.0}
                    clearcoatRoughness={0.1}
                />
            </mesh>

            {/* O Invólucro de Plasma Reativo (Outer Layer) */}
            <mesh>
                <BaseGeometry />
                <MeshDistortMaterial
                    ref={outerMaterialRef}
                    color={color}
                    emissive={color}
                    emissiveIntensity={1.5}
                    wireframe={true}
                    transparent={true}
                    opacity={0.8}
                    distort={0.0}
                    speed={2.0}
                />
            </mesh>

            {/* Disco de Acreção 1 */}
            <mesh ref={ring1Ref} rotation={[Math.PI / 3, 0, 0]}>
                <torusGeometry args={[3.2, 0.015, 16, 128]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.5} />
            </mesh>

            {/* Disco de Acreção 2 */}
            <mesh ref={ring2Ref} rotation={[-Math.PI / 4, Math.PI / 6, 0]}>
                <torusGeometry args={[4.5, 0.008, 16, 128]} />
                <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.5} transparent opacity={0.6} />
            </mesh>

            {/* Poeira Magnética (Stardust) */}
            <Sparkles count={800} scale={12} size={1.5} speed={0.5} opacity={0.4} color={color} />
        </group>
    );
};


// ── Instância Principal da Stage / Viewport ────────────────────────────────
export interface VisualizerProps {
    bloomColor?: string;
    sensitivity?: number;
    geometry?: 'icosahedron' | 'sphere' | 'box' | 'torus';
    postFX?: {
        noise: boolean;
        glitch: boolean;
        pixelate: boolean;
    };
    routings?: RouteRule[];
}

export const OrbeVisualizer: React.FC<VisualizerProps> = ({
    bloomColor = "#00ffcc",
    sensitivity = 1.0,
    geometry = "icosahedron",
    postFX = { noise: false, glitch: false, pixelate: false },
    routings = []
}) => {
    return (
        <Canvas camera={{ position: [0, 0, 10], fov: 60 }} gl={{ antialias: false, powerPreference: "high-performance" }}>
            <color attach="background" args={["#000000"]} />

            {/* Ambiente Espacial HDR e Iluminação */}
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} color={bloomColor} />
            <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />

            {/* Container Modular de Efeitos */}
            <ReactivePrimitive color={bloomColor} sensitivity={sensitivity} form={geometry} routings={routings} />

            {/* Sistema Lógico de Post-Processing (Phase 4.3) */}
            <EffectComposer disableNormalPass>
                {/* O Bloom sempre fica ativo para manter o neon, mas os outros reagem via props */}
                <Bloom luminanceThreshold={0.2} mipmapBlur luminanceSmoothing={0.9} intensity={1.5} />

                {postFX.noise ? <Noise opacity={0.15} /> : <React.Fragment />}
                {postFX.pixelate ? <Pixelation granularity={12} /> : <React.Fragment />}
                {postFX.glitch ? (
                    <Glitch
                        delay={[1.5, 3.5] as any} // min, max delay
                        duration={[0.6, 1.0] as any} // min, max duration
                        strength={[0.2, 0.4] as any} // min, max strength
                        mode={GlitchMode.SPORADIC} // Sporadic is usually what gives the Cyberpunk vibe
                        active
                    />
                ) : <React.Fragment />}
            </EffectComposer>

            {/* Controles de Câmera */}
            <OrbitControls autoRotate autoRotateSpeed={0.5} enablePan={false} enableZoom={true} />
        </Canvas>
    );
};
