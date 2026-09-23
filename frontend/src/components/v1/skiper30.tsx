"use client";

import { useEffect, useRef } from "react";

const images = [
    "/featured-ghostengine.png",
    "/featured-inho.png",
    "/featured-astrowatch.png",
    "/featured-nexuscore.png",
    "/featured-pdfever.png",
    "/featured-jovempanonews.png",
    "/featured-orbecleaner.png",
    "/featured-orbeknight.png",
    "/featured-ghostengine.png",
    "/featured-inho.png",
    "/featured-astrowatch.png",
    "/featured-nexuscore.png",
];

// Parallax speeds (how many px each column moves per scroll px)
const SPEEDS = [0.18, 0.36, 0.12, 0.28];
// Vertical stagger offsets so columns start at different positions
const OFFSETS = [0, -80, -30, -60];

const Skiper30 = () => {
    const colRefs = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        let rafId: number;

        const onScroll = () => {
            rafId = requestAnimationFrame(() => {
                const sy = window.scrollY;
                colRefs.current.forEach((el, i) => {
                    if (!el) return;
                    const translateY = -sy * SPEEDS[i];
                    el.style.transform = `translateY(${translateY}px)`;
                });
            });
        };

        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll(); // apply initial position

        return () => {
            window.removeEventListener("scroll", onScroll);
            cancelAnimationFrame(rafId);
        };
    }, []);

    // Split images into 4 columns
    const columns = [
        [images[0], images[1], images[2]],
        [images[3], images[4], images[5]],
        [images[6], images[7], images[8]],
        [images[9], images[10], images[11]],
    ];

    return (
        <section className="relative z-10 w-full bg-[#050505] text-[#c8d6e3] py-24">
            {/* Title */}
            <div className="text-center mb-12 px-6">
                <p className="text-xs font-mono uppercase tracking-widest text-[#00fff5]/50 mb-2">Portfólio</p>
                <h2 className="text-3xl md:text-4xl font-bold text-white">
                    Projetos em <span className="text-teal-400">Destaque</span>
                </h2>
            </div>

            {/* Gallery */}
            <div className="relative box-border flex h-[220vh] gap-[2vw] bg-transparent p-[2vw] overflow-hidden">
                {columns.map((imgs, colIdx) => (
                    <div
                        key={colIdx}
                        ref={(el) => { colRefs.current[colIdx] = el; }}
                        className="relative flex h-full w-1/4 min-w-[220px] flex-col gap-[2vw] will-change-transform"
                        style={{ top: `${OFFSETS[colIdx]}px` }}
                    >
                        {imgs.map((src, imgIdx) => (
                            <div
                                key={imgIdx}
                                className="relative flex-1 overflow-hidden rounded-xl border border-white/5 opacity-60 hover:opacity-100 transition-opacity duration-500 min-h-[220px]"
                            >
                                <img
                                    src={src}
                                    alt={`Featured project ${colIdx * 3 + imgIdx + 1}`}
                                    className="pointer-events-none object-cover w-full h-full grayscale hover:grayscale-0 transition-all duration-700"
                                />
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </section>
    );
};

export { Skiper30 };
