"use client";
import PredictiveArcCanvas from './VoidFieldCanvas';
import React from 'react';

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
                    <button className="relative group inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-purple-600/10 border border-purple-500/30 hover:bg-purple-600/20 hover:border-purple-500/50 transition-all duration-500 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <span className="text-sm font-semibold tracking-wide text-purple-200 relative z-10 uppercase">
                            Initialize Sequence
                        </span>
                        <svg className="w-4 h-4 text-purple-300 relative z-10 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </button>
                </div>

                {/* Right Side: Void Field Visual */}
                <div className="relative w-full aspect-square md:aspect-video lg:aspect-square flex justify-center items-center rounded-[3rem] bg-[#08030c] border border-purple-500/10 overflow-hidden shadow-[inset_0_0_80px_rgba(0,0,0,0.8),0_0_50px_rgba(168,85,247,0.1)] group">
                    <div className="absolute inset-0 bg-gradient-to-tr from-purple-900/20 via-transparent to-fuchsia-900/10 opacity-50 group-hover:opacity-100 transition-opacity duration-700"></div>

                    <div className="absolute inset-0 mix-blend-screen overflow-hidden group-hover:scale-105 transition-transform duration-1000 ease-out">
                        <PredictiveArcCanvas />
                    </div>

                    {/* Decorative Corner Borders */}
                    <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-purple-500/30 z-20"></div>
                    <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-purple-500/30 z-20"></div>
                    <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-purple-500/30 z-20"></div>
                    <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-purple-500/30 z-20"></div>

                    {/* Telemetry Overlays */}
                    <div className="absolute top-6 right-8 text-[10px] font-mono text-purple-300/50 tracking-widest uppercase z-20">
                        Sector 7G // Active
                    </div>
                    <div className="absolute bottom-6 left-8 text-[10px] font-mono text-purple-300/50 tracking-widest uppercase flex items-center gap-2 z-20">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-ping"></span>
                        Sync Rate 99.9%
                    </div>
                </div>

            </div>

            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent"></div>
        </section>
    );
}
