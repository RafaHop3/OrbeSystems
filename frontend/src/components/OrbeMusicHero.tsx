'use client';

import { Suspense, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Bloom, EffectComposer, Noise, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { Environment, Float, OrthographicCamera, ContactShadows, Stars, Torus, Box } from '@react-three/drei';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Play, Activity, Cpu, Disc3 } from 'lucide-react';
import * as THREE from 'three';

// --------------------------------------------------------
// Audio Visualizer / Isometric Grid Scene in Three.js
// --------------------------------------------------------

function InteractiveAudioGrid() {
    const group = useRef<THREE.Group>(null);

    // Create a 10x10 isometric grid of floating glowing keys/synths
    const instances = useMemo(() => {
        const list = [];
        for (let x = -5; x < 5; x++) {
            for (let z = -5; z < 5; z++) {
                list.push({
                    x: x * 1.5,
                    z: z * 1.5,
                    y: Math.random() * -2,
                    speed: 0.5 + Math.random() * 2,
                    offset: Math.random() * Math.PI * 2,
                });
            }
        }
        return list;
    }, []);

    useFrame((state) => {
        if (!group.current) return;
        const time = state.clock.getElapsedTime();
        group.current.children.forEach((child, i) => {
            const data = instances[i];
            if (child && data) {
                // Parametric wave motion (like an EQ visualizer)
                const wave = Math.sin(data.x * 0.5 + time * 1.2) * Math.cos(data.z * 0.5 + time * 1.5);
                child.position.y = data.y + wave * 1.5 + Math.abs(Math.sin(time * data.speed + data.offset)) * 0.5;

                // Dynamic glowing color response
                const mesh = child as THREE.Mesh;
                const mat = mesh.material as THREE.MeshStandardMaterial;
                mat.emissiveIntensity = 0.5 + Math.max(0, wave * 2);
            }
        });
    });

    return (
        <group ref={group} position={[0, -2, 0]}>
            {instances.map((data, i) => (
                <Box key={i} args={[1, 1, 1]} position={[data.x, data.y, data.z]}>
                    <meshStandardMaterial
                        color="#0b1324"
                        emissive={new THREE.Color(
                            i % 3 === 0 ? "#1e40af" : (i % 5 === 0 ? "#06b6d4" : "#4338ca")
                        )}
                        emissiveIntensity={1}
                        roughness={0.1}
                        metalness={0.8}
                    />
                </Box>
            ))}
        </group>
    );
}

function SynthNodes() {
    const ref = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (ref.current) {
            ref.current.rotation.y = state.clock.getElapsedTime() * 0.2;
            ref.current.position.y = Math.sin(state.clock.getElapsedTime() * 0.5) * 0.5 + 1;
        }
    });

    return (
        <group ref={ref}>
            <Float speed={2} rotationIntensity={1} floatIntensity={2}>
                <Torus args={[12, 0.05, 16, 100]} rotation={[Math.PI / 2, 0, 0]}>
                    <meshBasicMaterial color="#3b82f6" transparent opacity={0.3} />
                </Torus>
            </Float>
            <Float speed={3} rotationIntensity={2} floatIntensity={1.5}>
                <Torus args={[10, 0.1, 16, 100]} rotation={[Math.PI / 3, Math.PI / 4, 0]}>
                    <meshBasicMaterial color="#06b6d4" transparent opacity={0.2} />
                </Torus>
            </Float>

            {/* Floating Audio Nodes */}
            {Array.from({ length: 8 }).map((_, i) => (
                <Float key={i} speed={2 + i} floatIntensity={3} position={[
                    Math.sin((i / 8) * Math.PI * 2) * 5,
                    Math.cos((i / 8) * Math.PI * 2) * 2,
                    Math.cos((i / 8) * Math.PI * 2) * 5,
                ]}>
                    <mesh>
                        <octahedronGeometry args={[0.5]} />
                        <meshStandardMaterial color="#60a5fa" emissive="#2563eb" emissiveIntensity={3} wireframe />
                    </mesh>
                </Float>
            ))}
        </group>
    );
}

// --------------------------------------------------------
// Layout Component
// --------------------------------------------------------

export default function OrbeMusicHero() {
    return (
        <section className="relative w-full min-h-[90vh] flex items-center justify-center overflow-hidden border-b border-blue-500/10">

            {/* R3F WebGL Background Canvas */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <Canvas>
                    <color attach="background" args={['#030712']} />
                    <ambientLight intensity={0.5} />
                    <spotLight position={[10, 10, 10]} penumbra={1} intensity={2} color="#0ea5e9" />
                    <spotLight position={[-10, 10, -10]} penumbra={1} intensity={2} color="#4f46e5" />

                    <OrthographicCamera makeDefault position={[20, 15, 20]} zoom={25} near={-100} far={100} />

                    <Suspense fallback={null}>
                        <Stars radius={100} depth={50} count={5000} factor={4} saturation={1} fade speed={1} />
                        <InteractiveAudioGrid />
                        <SynthNodes />

                        {/* Ground shadows and reflection illusion */}
                        <ContactShadows position={[0, -4, 0]} opacity={0.5} scale={50} blur={2.5} far={10} color="#0ea5e9" />

                        {/* Cyberpunk Post-Processing */}
                        <EffectComposer multisampling={4}>
                            <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} intensity={2.0} />
                            <Noise opacity={0.04} blendFunction={BlendFunction.OVERLAY} />
                            <Vignette eskil={false} offset={0.1} darkness={1.1} />
                        </EffectComposer>
                    </Suspense>
                </Canvas>
            </div>

            {/* Foreground Hero UI */}
            <div className="relative z-10 max-w-7xl mx-auto px-6 w-full flex flex-col lg:flex-row items-center gap-12 pt-20">

                {/* Left Typography */}
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="lg:w-1/2 space-y-8"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-full text-xs text-neon-cyan uppercase font-bold tracking-widest shadow-[0_0_15px_rgba(6,182,212,0.3)] backdrop-blur-md">
                        <Activity size={16} className="animate-pulse" /> Advanced Audio Engine (Beta)
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold font-grotesk text-white leading-tight drop-shadow-2xl">
                        Bem-vindo ao <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-400 animate-gradient-x">
                            Orbe Music
                        </span>
                    </h1>

                    <p className="text-slate-300 font-sans leading-relaxed text-lg max-w-xl backdrop-blur-sm bg-black/20 p-4 rounded-xl border border-white/5">
                        O estúdio paramétrico completo. Síntese generativa nativa, sequenciadores isométricos no VDOM e renderização de áudio em tempo real diretamente no seu navegador.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                        <Link
                            href="/studio"
                            className="group relative inline-flex items-center justify-center gap-3 bg-neon-blue hover:bg-neon-cyan text-white hover:text-black font-bold uppercase tracking-widest text-sm px-8 py-5 transition-all duration-300 overflow-hidden shadow-[0_0_20px_rgba(59,130,246,0.5)] hover:shadow-[0_0_40px_rgba(6,182,212,0.8)] rounded-lg"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                            <Play size={18} fill="currentColor" /> Acessar Daw Engine
                        </Link>
                    </div>
                </motion.div>

                {/* Right Floating Display Card (Glassmorphism Isometric Illusion) */}
                <motion.div
                    initial={{ opacity: 0, y: 50, rotateX: 20, rotateY: -20 }}
                    animate={{ opacity: 1, y: 0, rotateX: 0, rotateY: 0 }}
                    transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                    className="lg:w-1/2 perspective-[1000px]"
                >
                    <div className="relative w-full max-w-md mx-auto aspect-square rounded-3xl glass-magnetic border-2 border-white/10 shadow-2xl p-8 transform-gpu hover:rotate-x-12 hover:-rotate-y-12 transition-transform duration-700 ease-out flex flex-col justify-between overflow-hidden group">

                        {/* Animated Card BG FX */}
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-transparent to-cyan-400/20 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                        <div className="absolute -top-32 -right-32 w-64 h-64 bg-neon-cyan rounded-full mix-blend-screen filter blur-[100px] animate-pulse-neon"></div>

                        <div className="relative z-10 flex justify-between items-start">
                            <div className="p-4 bg-black/50 backdrop-blur-xl rounded-2xl border border-white/10 shadow-inner">
                                <Disc3 size={32} className="text-neon-cyan animate-spin-slow" />
                            </div>
                            <div className="flex gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            </div>
                        </div>

                        <div className="relative z-10 space-y-4">
                            <h3 className="font-mono text-xl text-white font-bold tracking-tight">Audio_Context_Engine</h3>

                            {/* Fake EQ Bars */}
                            <div className="flex items-end gap-2 h-24 pt-4">
                                {Array.from({ length: 12 }).map((_, i) => (
                                    <div key={i} className="w-full bg-blue-900/50 rounded-t-sm overflow-hidden relative">
                                        <motion.div
                                            animate={{ height: ['20%', '90%', '30%', '100%'] }}
                                            transition={{
                                                duration: 0.5 + Math.random() * 0.5,
                                                repeat: Infinity,
                                                repeatType: "mirror",
                                                ease: "easeOut"
                                            }}
                                            className="absolute bottom-0 w-full bg-gradient-to-t from-blue-600 to-cyan-300"
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center gap-3 font-mono text-xs text-slate-400 pt-4 border-t border-white/10">
                                <Cpu size={14} className="text-neon-cyan" />
                                <span>Renderizando em Tempo Real / 48kHz</span>
                            </div>
                        </div>
                    </div>
                </motion.div>

            </div>
        </section>
    );
}
