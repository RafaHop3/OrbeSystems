'use client';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import React, { useEffect, useState } from 'react';

export default function OrbeStudioPromo() {
    const [renderNodes, setRenderNodes] = useState<number[]>([]);

    useEffect(() => {
        setRenderNodes(Array.from({ length: 16 }).map(() => Math.random()));
        const interval = setInterval(() => {
            setRenderNodes(Array.from({ length: 16 }).map(() => Math.random()));
        }, 800);
        return () => clearInterval(interval);
    }, []);

    return (
        <section className="relative z-10 w-full min-h-screen pt-32 pb-40 px-6 border-b border-white/5 bg-[#0b0d17] overflow-hidden flex flex-col lg:flex-row items-center justify-center gap-16 group">

            {/* Background Voids */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-900/10 blur-[150px] rounded-full" />
                <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-900/10 blur-[120px] rounded-full" />
            </div>

            {/* Left Typography */}
            <div className="relative z-10 lg:w-1/2 max-w-2xl space-y-10 order-2 lg:order-1 pt-16 lg:pt-0">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs text-white/70 uppercase font-mono tracking-widest">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,1)] animate-pulse" />
                    Void Architecture
                </div>

                <h2 className="text-4xl md:text-7xl font-black font-sans text-white leading-[1.1] tracking-tight">
                    <span className="opacity-90">Cathode</span><br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 drop-shadow-[0_0_15px_rgba(34,211,238,0.2)]">Workstation</span>
                </h2>

                <p className="text-slate-400 font-mono leading-relaxed text-sm max-w-lg border-l border-white/10 pl-4">
                    O Orbe Visual Studio é o laboratório livre de arte generativa. Conecte áudio FFT em tempo real a polígonos, meshes e partículas isomórficas. Motor GLSL renderizado puramente no navegador.
                </p>

                <div className="flex pt-4">
                    <Link
                        href="/ferramentas-premium/orbe-visual-studio"
                        className="group relative inline-flex items-center gap-4 bg-white/5 hover:bg-cyan-950/40 text-cyan-50 border border-cyan-500/30 hover:border-cyan-400 font-mono font-bold uppercase tracking-widest text-sm px-10 py-5 transition-all duration-300 shadow-[0_0_30px_rgba(34,211,238,0.05)] hover:shadow-[0_0_50px_rgba(34,211,238,0.2)] hover:-translate-y-1 rounded"
                    >
                        Acessar a Ferramenta
                        <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform text-cyan-400" />
                    </Link>
                </div>
            </div>

            {/* Right: Isometric CSS Scene */}
            <div className="relative z-10 w-full lg:w-1/2 h-[500px] flex items-center justify-center order-1 lg:order-2">

                {/* Perspective Container */}
                <div
                    className="relative w-full max-w-[500px] aspect-square"
                    style={{ perspective: '2500px' }}
                >
                    {/* Isometric Rotation Wrapper */}
                    <div
                        className="absolute inset-0 mx-auto w-[400px] h-[400px] mt-10"
                        style={{
                            transformStyle: 'preserve-3d',
                            transform: 'rotateX(60deg) rotateY(0deg) rotateZ(-45deg)'
                        }}
                    >
                        {/* Floor blueprint Grid */}
                        <div className="absolute inset-0 -inset-x-20 -inset-y-20 border border-white/5 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] shadow-[0_0_100px_rgba(0,0,0,1)_inset]" />

                        <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-20 pointer-events-none">
                            <span className="w-px h-full bg-transparent border-l border-dashed border-white/20" />
                            <span className="w-full h-px bg-transparent border-t border-dashed border-white/20 absolute" />
                        </div>

                        {/* Monitor Stand Base */}
                        <div
                            className="absolute bottom-20 left-10 w-[80px] h-[60px] bg-black/40 border border-white/10 backdrop-blur"
                            style={{ transformStyle: 'preserve-3d' }}
                        >
                            {/* Stem */}
                            <div className="absolute top-1/2 left-1/2 w-[20px] h-[80px] bg-gray-900 border border-white/10 origin-bottom shadow-xl" style={{ transform: 'translate(-50%, -100%) rotateX(90deg)' }} />

                            {/* Screen */}
                            <div
                                className="absolute top-1/2 left-1/2 w-[180px] h-[110px] bg-[#07090f] border-2 border-slate-800 shadow-[0_0_40px_rgba(34,211,238,0.15)] origin-top-left"
                                style={{ transformStyle: 'preserve-3d', transform: 'rotateX(90deg) rotateY(180deg) translate(-50%, -80px) rotate(-45deg)' }}
                            >
                                {/* Screen content (Waveforms) */}
                                <div className="absolute inset-2 border border-white/5 rounded-sm flex flex-col p-2 gap-2 overflow-hidden bg-gradient-to-b from-[#0b101d] to-[#040608]">
                                    <div className="w-full h-2 bg-white/5 rounded-full" />
                                    <div className="flex-1 flex items-center justify-between gap-0.5 mt-2">
                                        {renderNodes.map((v, i) => (
                                            <div
                                                key={i}
                                                className="w-1.5 rounded-t-sm transition-all duration-300"
                                                style={{
                                                    height: `${(v * 100)}%`,
                                                    backgroundColor: v > 0.8 ? '#22d3ee' : '#334155'
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sequencer Matrix (The Launchpad) */}
                        <div
                            className="absolute top-16 right-16 w-[180px] h-[220px] bg-[#0c0e15] border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.8)] rounded-sm p-3 grid grid-cols-4 gap-2 grid-rows-6 hover:-translate-y-2 transition-transform duration-500"
                            style={{ transformStyle: 'preserve-3d', transform: 'translateZ(10px)' }}
                        >
                            {/* Top Knobs / Faders */}
                            <div className="col-span-4 grid grid-cols-4 gap-2 mb-2">
                                {[1, 2, 3, 4].map((_, i) => (
                                    <div key={i} className="flex justify-center h-8">
                                        <div className="w-1.5 h-full bg-white/5 rounded-full relative">
                                            <div className="absolute w-3 h-2 bg-slate-500 rounded-sm -left-[3px] shadow-lg" style={{ top: `${(i * 15) + 10}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {/* Pads */}
                            {Array.from({ length: 16 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="w-full h-full rounded-[3px] bg-slate-800/40 border border-black/50 shadow-inner group-hover:first:bg-cyan-500 transition-colors duration-1000"
                                    style={{
                                        boxShadow: (renderNodes[i] || 0) > 0.8 ? '0 0 10px rgba(34,211,238,0.5), inset 0 0 5px rgba(34,211,238,0.8)' : 'none',
                                        backgroundColor: (renderNodes[i] || 0) > 0.8 ? 'rgba(34,211,238,0.2)' : 'rgba(30,41,59,0.4)',
                                        borderColor: (renderNodes[i] || 0) > 0.8 ? 'rgba(34,211,238,0.5)' : 'rgba(0,0,0,0.5)'
                                    }}
                                />
                            ))}
                        </div>

                        {/* Modular Desktop Synths / Cylinders */}
                        <div className="absolute top-[260px] left-[70px] w-12 h-12 bg-black/60 border border-white/10 rounded-full flex items-center justify-center p-1" style={{ transformStyle: 'preserve-3d' }}>
                            <div className="w-full h-full rounded-full border-2 border-dashed border-cyan-900 animate-[spin_10s_linear_infinite]" />
                            {/* 3D Extrusion illusion */}
                            <div className="absolute inset-1 rounded-full bg-slate-900 border border-slate-700 shadow-xl" style={{ transform: 'translateZ(15px)' }}>
                                <div className="absolute top-1/2 left-1/2 w-4 h-1 bg-white/20 origin-left" style={{ transform: 'translate(-50%, -50%) rotate(45deg)' }} />
                            </div>
                        </div>

                        <div className="absolute top-[280px] left-[130px] w-10 h-10 bg-black/60 border border-white/10 rounded-full flex items-center justify-center p-1" style={{ transformStyle: 'preserve-3d' }}>
                            <div className="absolute inset-1 rounded-full bg-slate-900 border border-slate-700 shadow-xl" style={{ transform: 'translateZ(25px)' }}>
                                <div className="absolute top-1/2 left-1/2 w-3 h-1 bg-white/20 origin-left" style={{ transform: 'translate(-50%, -50%) rotate(-75deg)' }} />
                            </div>
                        </div>

                        {/* Geometric Lamp Wireframe */}
                        <div className="absolute bottom-10 right-40 w-[40px] h-[40px] rounded-sm border-2 border-white/5" style={{ transformStyle: 'preserve-3d' }}>
                            {/* Base glow */}
                            <div className="absolute inset-0 bg-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)]" />

                            {/* Stem Line 1 (Vertical) */}
                            <div className="absolute top-1/2 left-1/2 w-1 h-[200px] bg-gradient-to-t from-slate-800 to-slate-600 origin-bottom" style={{ transform: 'translate(-50%, -100%) rotateX(90deg)' }}>
                                {/* Stem Line 2 (Angled towards monitor) */}
                                <div className="absolute top-0 left-1/2 w-1 h-[140px] bg-slate-600 origin-bottom" style={{ transform: 'translate(-50%, -100%) rotateX(-115deg) rotateY(-45deg)' }}>
                                    {/* Lamp Head (Cylinder) */}
                                    <div className="absolute top-0 left-1/2 w-8 h-20 bg-black border border-white/10 origin-top shadow-2xl" style={{ transform: 'translate(-50%, -20%) rotateX(90deg)' }}>
                                        <div className="absolute bottom-2 left-1/2 w-6 h-6 bg-cyan-100/5 -translate-x-1/2 rounded-full blur-[2px] shadow-[0_50px_60px_rgba(34,211,238,0.3)]" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
