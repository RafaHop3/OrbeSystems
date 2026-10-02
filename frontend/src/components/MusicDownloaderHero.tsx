'use client';

import { Suspense, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { Float, Stars, Torus } from '@react-three/drei';
import { motion } from 'framer-motion';
import { DownloadCloud, Activity } from 'lucide-react';
import Link from 'next/link';
import * as THREE from 'three';

function NeonRings() {
    const ref = useRef<THREE.Group>(null);
    useFrame((state) => {
        if (ref.current) {
            ref.current.rotation.y = state.clock.getElapsedTime() * 0.15;
            ref.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.3) * 0.2;
        }
    });

    return (
        <group ref={ref} position={[3, 0, -2]}>
            <Float speed={2} rotationIntensity={1} floatIntensity={1}>
                <Torus args={[4, 0.05, 16, 100]} rotation={[Math.PI / 2, 0, 0]}>
                    <meshBasicMaterial color="#bc13fe" transparent opacity={0.4} />
                </Torus>
            </Float>
            <Float speed={3} rotationIntensity={2} floatIntensity={1.5}>
                <Torus args={[3, 0.02, 16, 100]} rotation={[Math.PI / 3, Math.PI / 4, 0]}>
                    <meshBasicMaterial color="#00fff5" transparent opacity={0.6} />
                </Torus>
            </Float>
        </group>
    );
}

export default function MusicDownloaderHero() {
    return (
        <section className="relative w-full min-h-[85vh] flex items-center justify-center overflow-hidden border-b border-purple-500/10">

            {/* R3F WebGL Background Canvas */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <Canvas gl={{ antialias: false }}>
                    <color attach="background" args={['#05020a']} />
                    <ambientLight intensity={0.5} />
                    <Suspense fallback={null}>
                        <Stars radius={100} depth={50} count={3000} factor={4} saturation={1} fade speed={1} />
                        <NeonRings />
                        <EffectComposer multisampling={4}>
                            <Bloom luminanceThreshold={0.5} luminanceSmoothing={0.9} intensity={2.0} />
                        </EffectComposer>
                    </Suspense>
                </Canvas>
            </div>

            {/* Foreground UI */}
            <div className="relative z-10 max-w-7xl mx-auto px-6 w-full flex flex-col lg:flex-row items-center gap-12 pt-20">

                {/* Text Content */}
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="lg:w-1/2 space-y-8"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-purple-500/10 border border-purple-500/30 rounded-full text-xs text-neon-purple uppercase font-bold tracking-widest shadow-[0_0_15px_rgba(188,19,254,0.3)] backdrop-blur-md">
                        <Activity size={16} className="animate-pulse" /> YT Extract Protocol
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold font-tilt-neon text-white leading-tight mb-4 drop-shadow-2xl">
                        Desbloqueie <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-cyan-400 to-blue-400 animate-gradient-x text-shimmer">
                            Suas Tracks
                        </span>
                    </h1>

                    <p className="text-slate-300 font-sans leading-relaxed text-lg max-w-xl backdrop-blur-sm bg-black/20 p-4 rounded-xl border border-white/5">
                        Baixe coleções completas em formato MP3 de alta qualidade. Informe o artista e o som, e nossa ferramenta conecta diretamente ao ecossistema musical para extração.
                    </p>
                </motion.div>

                {/* Extractor Card */}
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                    className="lg:w-1/2 w-full max-w-md mx-auto"
                >
                    <div className="glass-magnetic relative rounded-3xl border border-white/10 p-8 shadow-[0_0_50px_rgba(188,19,254,0.15)] overflow-hidden flex flex-col items-center text-center justify-center min-h-[300px]">

                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 rounded-full blur-[60px] pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyan-500/20 rounded-full blur-[60px] pointer-events-none"></div>

                        <div className="relative z-10 space-y-4">
                            <h3 className="text-2xl font-tilt-neon tracking-widest text-[#00fff5] mb-2 text-shimmer" style={{ textShadow: '0 0 10px #00fff5' }}>YT MP3 Extractor</h3>
                            <p className="text-sm text-slate-300">Acesse a aplicação dedicada para buscar artistas, pré-visualizar tracks e fazer o download de coleções completas em alta qualidade.</p>

                            <Link
                                href="/youtube-mp3"
                                className="mt-6 w-full group relative inline-flex items-center justify-center gap-3 bg-neon-purple hover:bg-neon-cyan text-white hover:text-black font-bold uppercase tracking-widest text-sm px-8 py-4 transition-all duration-300 overflow-hidden shadow-[0_0_20px_rgba(188,19,254,0.4)] hover:shadow-[0_0_40px_rgba(6,182,212,0.8)] rounded-lg"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                                <DownloadCloud size={18} fill="currentColor" /> Acessar Ferramenta
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
