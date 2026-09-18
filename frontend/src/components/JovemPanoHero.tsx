'use client';

import Image from 'next/image';
import { CrowdCanvas } from '@/components/ui/skiper-ui/skiper39';

export default function JovemPanoHero() {
    return (
        <section className="relative w-full h-[600px] overflow-hidden my-20 border-y border-neon-cyan/20">
            {/* Dark Cyberpunk Night Sky Background */}
            <Image
                src="/jovem_pano_ny_night.png"
                alt="New York Cyberpunk Night"
                fill
                className="object-cover object-[center_30%]"
                priority
            />

            {/* Cinematic Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-blue-900/10 mix-blend-color pointer-events-none" />

            {/* Building Text Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
                <div className="text-center translate-y-[-80px] scale-[1.2]">
                    <h1
                        className="text-6xl md:text-8xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-br from-neon-cyan via-blue-400 to-purple-600 animate-pulse"
                        style={{ filter: "drop-shadow(0 0 30px rgba(0, 242, 254, 0.9))" }} // Using robust dropshadow for neon effect
                    >
                        JOVEM PANO
                    </h1>
                    <div className="flex items-center justify-center gap-4 mt-2">
                        <span className="w-12 h-[2px] bg-neon-cyan/50 shadow-[0_0_10px_#00f2fe]" />
                        <h2
                            className="text-2xl md:text-4xl font-mono text-white tracking-[0.5em]"
                            style={{ textShadow: "0 0 15px rgba(255, 255, 255, 0.8), 0 0 25px rgba(0, 242, 254, 0.5)" }}
                        >
                            NEW
                        </h2>
                        <span className="w-12 h-[2px] bg-neon-cyan/50 shadow-[0_0_10px_#00f2fe]" />
                    </div>
                </div>
            </div>

            {/* Fog at the bottom covering feet of the crowd */}
            <div className="absolute bottom-0 left-0 w-full h-[250px] bg-gradient-to-t from-[#020617] to-transparent z-10 pointer-events-none opacity-80" />

            {/* Crowd Canvas matching the user requirement */}
            <div className="absolute bottom-[-10px] left-0 w-full h-[200px] pointer-events-none mix-blend-screen opacity-100 z-30">
                <CrowdCanvas src="/images/peeps/all-peeps.png" rows={15} cols={7} />
            </div>

            {/* Terminal Scanline overlay */}
            <div className="absolute inset-0 pointer-events-none z-40 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] opacity-40 mix-blend-overlay" />
        </section>
    );
}
