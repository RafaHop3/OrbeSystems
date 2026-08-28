"use client";

import React, { useRef } from 'react';

export default function OrbeCleanerHero() {
    const cardRef = useRef<HTMLDivElement>(null);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current) return;
        const card = cardRef.current;

        // Remove transitions for real-time tracking
        card.style.transition = 'transform 0.1s ease-out, box-shadow 0.3s ease-out';

        // The container is the entire screen
        const rect = document.documentElement.getBoundingClientRect();
        // Calculate mouse position relative to center of screen (from -1 to 1)
        const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
        const y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);

        const maxTilt = 15;
        const rotateX = -y * maxTilt;
        const rotateY = x * maxTilt;

        card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`;
    };

    const handleMouseLeave = () => {
        if (!cardRef.current) return;
        const card = cardRef.current;
        card.style.transform = `rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
        card.style.transition = 'transform 0.5s ease-out, box-shadow 0.3s ease-out';
    };

    return (
        <div
            className="scene relative flex items-center justify-center min-h-screen bg-[#0b0d17] overflow-hidden"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ perspective: '2000px' }}
        >
            {/* Cyberpunk Grid Background */}
            <div
                className="absolute w-[200vw] h-[200vh] opacity-30 -z-10"
                style={{
                    backgroundImage: `linear-gradient(rgba(0, 255, 245, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 245, 0.1) 1px, transparent 1px)`,
                    backgroundSize: '50px 50px',
                    animation: 'gridMove 20s linear infinite',
                    transform: 'rotateX(60deg) translateY(-100px) translateZ(-500px)'
                }}
            />
            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes gridMove {
            0% { transform: rotateX(60deg) translateY(-100px) translateZ(-500px); }
            100% { transform: rotateX(60deg) translateY(100px) translateZ(-500px); }
        }
        @keyframes pulse-neon {
            from { text-shadow: 0 0 5px #00fff5, 0 0 10px #00fff5; }
            to { text-shadow: 0 0 20px #00fff5, 0 0 30px #00fff5; }
        }
        .pulse-text { animation: pulse-neon 2s infinite alternate; }
        .layer-1 { transform: translateZ(30px); }
        .layer-2 { transform: translateZ(60px); }
        .layer-3 { transform: translateZ(90px); }
      `}} />

            {/* 3D Card */}
            <div
                ref={cardRef}
                className="relative z-10 w-full max-w-lg p-10 flex flex-col items-center text-center rounded-[20px] bg-[#0b0d17]/70 border border-[#00fff5]/30 backdrop-blur-md transform-gpu group transition-all duration-300 hover:border-[#00fff5]/60 shadow-[0_0_30px_rgba(0,255,245,0.1),inset_0_0_20px_rgba(188,19,254,0.05)] hover:shadow-[0_0_50px_rgba(0,255,245,0.2),inset_0_0_30px_rgba(188,19,254,0.1)]"
                style={{ transformStyle: 'preserve-3d' }}
            >
                {/* Glowing aura behind card */}
                <div className="absolute -inset-1.5 -z-10 rounded-[24px] bg-gradient-to-tr from-[#00fff5] via-[#bc13fe] to-[#0066ff] blur-xl opacity-20 group-hover:opacity-50 transition-opacity duration-300 translate-z-[-1px]"></div>

                {/* Badges */}
                <div className="flex gap-3 mb-6 layer-3">
                    <span className="font-mono text-xs font-bold tracking-widest text-[#39ff14] bg-[#39ff14]/10 border border-[#39ff14]/30 px-3 py-1 rounded-full uppercase" style={{ boxShadow: '0 0 10px rgba(57,255,20,0.2)' }}>
                        [ 100% Free ]
                    </span>
                    <span className="font-mono text-xs font-bold tracking-widest text-[#bc13fe] bg-[#bc13fe]/10 border border-[#bc13fe]/30 px-3 py-1 rounded-full uppercase" style={{ boxShadow: '0 0 10px rgba(188,19,254,0.2)' }}>
                        [ No Login ]
                    </span>
                </div>

                {/* Title */}
                <div className="layer-2 mb-4 relative">
                    <h1 className="text-6xl font-black text-white tracking-tight uppercase font-sans" style={{ textShadow: '0 0 20px rgba(255,255,255,0.3)', fontFamily: "var(--font-outfit), sans-serif" }}>
                        Orbe <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00fff5] to-[#bc13fe] pulse-text">Cleaner</span>
                    </h1>

                    {/* Orbe Animated SVG Sphere Background Core */}
                    <div className="absolute -top-6 -right-6 text-[#00fff5] opacity-50 animate-[spin_8s_linear_infinite]">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                            <path d="M2 12h20"></path>
                        </svg>
                    </div>
                </div>

                {/* Description */}
                <p className="text-[#8b949e] font-mono text-sm leading-relaxed mb-10 layer-1 max-w-sm">
                    Deep system sterilization protocol. <br />
                    Purge dev caches, annihilate abandoned virtual disks, and reclaim your gigabytes. Run locally, securely, and insanely fast.
                </p>

                {/* Buttons */}
                <div className="flex flex-col md:flex-row gap-4 w-full layer-3">
                    <button className="bg-transparent border border-[#00fff5] text-[#00fff5] font-mono font-bold py-3 px-6 rounded w-full flex items-center justify-center gap-2 hover:bg-[#00fff5] hover:text-[#0b0d17] transition-all duration-300 uppercase shadow-[0_0_10px_rgba(0,255,245,0.2),inset_0_0_10px_rgba(0,255,245,0.1)] hover:shadow-[0_0_20px_rgba(0,255,245,0.6),inset_0_0_10px_rgba(0,255,245,0.8)] [text-shadow:0_0_0] hover:[text-shadow:0_0_5px_rgba(0,0,0,0.5)] group relative overflow-hidden">
                        <svg className="w-5 h-5 group-hover:animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                        Windows
                    </button>
                    <button className="bg-transparent border border-[#bc13fe] text-[#bc13fe] font-mono font-bold py-3 px-6 rounded w-full flex items-center justify-center gap-2 hover:bg-[#bc13fe] hover:text-[#0b0d17] transition-all duration-300 uppercase shadow-[0_0_10px_rgba(188,19,254,0.2),inset_0_0_10px_rgba(188,19,254,0.1)] hover:shadow-[0_0_20px_rgba(188,19,254,0.6),inset_0_0_10px_rgba(188,19,254,0.8)] [text-shadow:0_0_0] hover:[text-shadow:0_0_5px_rgba(0,0,0,0.5)] group relative overflow-hidden">
                        <svg className="w-3 h-4 group-hover:animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 384 512">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="48" d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
                        </svg>
                        Mac OS
                    </button>
                </div>

                <div className="mt-8 font-mono text-xs text-[#0066ff] layer-1 flex items-center gap-2 opacity-70">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0066ff] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0066ff]"></span>
                    </span>
                    SECURE SANDBOX ENVIRONMENT
                </div>
            </div>
        </div>
    );
}
