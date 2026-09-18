"use client";
import { InductionButton } from "@/shaders/neuform-isolated/NeuformIsolatedEffects";
import React from 'react';
import Link from 'next/link';
export default function VoidFieldPromo() {
    return (
        <section className="relative w-full py-24 flex items-center justify-center overflow-hidden bg-[#030305] border-y border-purple-500/10">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent"></div>

            <div className="container mx-auto px-6 relative z-10 grid lg:grid-cols-2 gap-12 items-center">

                {/* Left Side: Content */}
                <div className="flex flex-col items-start max-w-xl text-left">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6 font-mono text-xs uppercase tracking-widest text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
                        Void Protocol Enabled
                    </div>
                    <h2 className="text-4xl md:text-5xl font-extralight tracking-tight text-white mb-6 leading-tight">
                        Advanced Predictive <br />
                        <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-400 drop-shadow-[0_0_25px_rgba(192,132,252,0.3)]">
                            Quantum Intelligence
                        </span>
                    </h2>
                    <p className="text-slate-400 text-lg font-light leading-relaxed mb-8">
                        Harness the power of OrbeSystems' proprietary Void Field engine. Experience deterministic forecasting and sub-millisecond analysis rendered in real-time.
                    </p>
                    <Link href="/ferramentas-premium/orbe-visual-studio" className="relative group inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-purple-600/10 border border-purple-500/30 hover:bg-purple-600/20 hover:border-purple-500/50 transition-all duration-500 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <span className="text-sm font-semibold tracking-wide text-purple-200 relative z-10 uppercase">
                            Initialize Sequence
                        </span>
                        <svg className="w-4 h-4 text-purple-300 relative z-10 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </Link>
                </div>

                {/* Right Side: Void Field Visual */}
                <div className="relative w-full aspect-square md:aspect-video lg:aspect-square flex justify-center items-center rounded-[3rem] bg-[#08030c] border border-purple-500/10 overflow-hidden shadow-[inset_0_0_80px_rgba(0,0,0,0.8),0_0_50px_rgba(168,85,247,0.1)] group perspective-1000">
                    <div className="absolute inset-0 bg-gradient-to-tr from-purple-900/20 via-transparent to-fuchsia-900/10 opacity-50 group-hover:opacity-100 transition-opacity duration-700 z-0"></div>

                    {/* FUTURISTIC GEOMETRIC PATTERNS */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-40 group-hover:opacity-80 transition-opacity duration-1000 z-10 pointer-events-none">
                        {/* Perspective Grid Background */}
                        <div
                            className="absolute inset-0 opacity-30"
                            style={{
                                backgroundImage: 'linear-gradient(rgba(168, 85, 247, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(168, 85, 247, 0.2) 1px, transparent 1px)',
                                backgroundSize: '30px 30px',
                                transform: 'perspective(800px) rotateX(60deg) translateY(-50px) scale(2.5)',
                                transformOrigin: 'top'
                            }}>
                        </div>

                        {/* Rotating Concentric Circles */}
                        <div className="absolute w-[95%] h-[95%] rounded-full border border-purple-500/10 animate-[spin_40s_linear_infinite]"></div>
                        <div className="absolute w-[80%] h-[80%] border-[1px] border-purple-500/30 rounded-full animate-[spin_20s_linear_infinite]"></div>
                        <div className="absolute w-[85%] h-[85%] border-[1px] border-dashed border-fuchsia-500/40 rounded-full animate-[spin_30s_linear_reverse_infinite]"></div>
                        <div className="absolute w-[60%] h-[60%] border-[2px] border-dotted border-purple-400/50 rounded-full animate-[spin_15s_linear_infinite]"></div>
                        <div className="absolute w-[70%] h-[70%] rounded-full border-t border-l border-fuchsia-400/30 animate-[spin_10s_linear_infinite]"></div>

                        {/* Hexagon & Crosshair SVGs */}
                        <svg className="absolute w-[90%] h-[90%] animate-[pulse_4s_ease-in-out_infinite]" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                            {/* Rotating Outer Hexagon */}
                            <polygon points="50,5 89,27.5 89,72.5 50,95 11,72.5 11,27.5" stroke="rgba(192, 132, 252, 0.2)" strokeWidth="0.3" strokeDasharray="1 2" className="animate-[spin_40s_linear_infinite] origin-center" />
                            {/* Rotating Inner Hexagon */}
                            <polygon points="50,15 80,32 80,68 50,85 20,68 20,32" stroke="rgba(217, 70, 239, 0.3)" strokeWidth="0.4" className="animate-[spin_25s_linear_reverse_infinite] origin-center" />

                            {/* Radar Lines */}
                            <line x1="50" y1="0" x2="50" y2="100" stroke="rgba(168,85,247,0.2)" strokeWidth="0.2" />
                            <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(168,85,247,0.2)" strokeWidth="0.2" />
                            <line x1="15" y1="15" x2="85" y2="85" stroke="rgba(168,85,247,0.1)" strokeWidth="0.2" />
                            <line x1="15" y1="85" x2="85" y2="15" stroke="rgba(168,85,247,0.1)" strokeWidth="0.2" />

                            {/* Inner Target Ring */}
                            <circle cx="50" cy="50" r="25" stroke="rgba(217, 70, 239, 0.2)" strokeWidth="0.2" strokeDasharray="2 4" />
                        </svg>

                        {/* Outer Glow Ring */}
                        <div className="absolute w-[90%] h-[90%] rounded-full shadow-[0_0_80px_rgba(168,85,247,0.15)]"></div>
                    </div>

                    <div className="absolute inset-0 mix-blend-screen overflow-hidden group-hover:scale-105 transition-transform duration-1000 ease-out z-20">
                        <InductionButton mode="dark" saturation={1.0} brightness={1.0} />
                    </div>

                    {/* Decorative Corner Borders */}
                    <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-purple-500/50 z-30 opacity-70 group-hover:opacity-100 transition-opacity"></div>
                    <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-purple-500/50 z-30 opacity-70 group-hover:opacity-100 transition-opacity"></div>
                    <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-purple-500/50 z-30 opacity-70 group-hover:opacity-100 transition-opacity"></div>
                    <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-purple-500/50 z-30 opacity-70 group-hover:opacity-100 transition-opacity"></div>

                    {/* Telemetry Overlays */}
                    <div className="absolute top-6 right-8 text-[9px] font-mono text-purple-300/60 tracking-widest uppercase z-30 flex flex-col items-end gap-1">
                        <span>Sector 7G // Active</span>
                        <span className="text-purple-400/40">GEO-TARGET: LOCKED</span>
                    </div>
                    <div className="absolute bottom-6 left-8 text-[9px] font-mono text-purple-300/60 tracking-widest uppercase flex items-center gap-2 z-30">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping shadow-[0_0_5px_theme(colors.purple.400)]"></span>
                        <div className="flex flex-col">
                            <span>Sync Rate 99.9%</span>
                            <span className="text-purple-400/40">LATENCY: 0.04ms</span>
                        </div>
                    </div>
                </div>

            </div>

            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent"></div>
        </section>
    );
}
