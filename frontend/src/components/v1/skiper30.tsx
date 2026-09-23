"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

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

// Vertical stagger offsets
const OFFSETS = [0, -80, -30, -60];
// End translation targets (parallax distance for each column)
const Y_DISTANCES = [-450, -900, -280, -700];

const Skiper30 = () => {
    const sectionRef = useRef<HTMLElement>(null);
    const colRefs = useRef<(HTMLDivElement | null)[]>([]);

    useLayoutEffect(() => {
        gsap.registerPlugin(ScrollTrigger);

        if (!sectionRef.current) return;

        const ctx = gsap.context(() => {
            colRefs.current.forEach((el, i) => {
                if (!el) return;

                // Native GSAP ScrollTrigger for parallax
                gsap.to(el, {
                    y: Y_DISTANCES[i],
                    ease: "none", // important for synchronized scroll feel
                    scrollTrigger: {
                        trigger: sectionRef.current,
                        start: "top bottom", // when section enters from bottom
                        end: "bottom top", // when section leaves top
                        scrub: 1.2, // smoothing factor
                    }
                });
            });
        }, sectionRef);

        return () => ctx.revert();
    }, []);

    // Split images into 4 columns
    const columns = [
        [images[0], images[1], images[2]],
        [images[3], images[4], images[5]],
        [images[6], images[7], images[8]],
        [images[9], images[10], images[11]],
    ];

    return (
        <section ref={sectionRef} className="relative z-10 w-full bg-[#050505] text-[#c8d6e3] py-24">
            <div className="text-center mb-12 px-6">
                <p className="text-xs font-mono uppercase tracking-widest text-[#00fff5]/50 mb-2">Portfólio</p>
                <h2 className="text-3xl md:text-4xl font-bold text-white">
                    Projetos em <span className="text-teal-400">Destaque</span>
                </h2>
            </div>

            <div className="relative box-border flex h-[220vh] gap-[2vw] bg-transparent p-[2vw] overflow-hidden">
                {columns.map((imgs, colIdx) => (
                    <div
                        key={colIdx}
                        ref={(el) => { colRefs.current[colIdx] = el; }}
                        className="relative flex h-full w-1/4 min-w-[220px] flex-col gap-[2vw]"
                        style={{ marginTop: `${OFFSETS[colIdx]}px` }}
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
