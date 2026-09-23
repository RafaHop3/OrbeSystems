"use client";

import { motion, MotionValue, useScroll, useTransform } from "framer-motion";
import Lenis from "lenis";
import { useEffect, useRef, useState } from "react";

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

const Skiper30 = () => {
    const gallery = useRef<HTMLDivElement>(null);
    const [dimension, setDimension] = useState({ width: 0, height: 0 });

    const { scrollYProgress } = useScroll({
        target: gallery,
        offset: ["start end", "end start"],
    });

    const { height } = dimension;

    // Columns start visible and scroll UPWARD at different speeds (standard parallax)
    const y = useTransform(scrollYProgress, [0, 1], [0, -height * 1.0]);
    const y2 = useTransform(scrollYProgress, [0, 1], [0, -height * 1.8]);
    const y3 = useTransform(scrollYProgress, [0, 1], [0, -height * 0.6]);
    const y4 = useTransform(scrollYProgress, [0, 1], [0, -height * 1.5]);

    useEffect(() => {
        const lenis = new Lenis();

        const raf = (time: number) => {
            lenis.raf(time);
            requestAnimationFrame(raf);
        };

        const resize = () => {
            setDimension({ width: window.innerWidth, height: window.innerHeight });
        };

        window.addEventListener("resize", resize);
        requestAnimationFrame(raf);
        resize();

        return () => {
            window.removeEventListener("resize", resize);
        };
    }, []);

    return (
        <section className="relative z-10 w-full bg-[#050505] text-[#c8d6e3] py-24">
            {/* Section title */}
            <div className="text-center mb-12 px-6">
                <p className="text-xs font-mono uppercase tracking-widest text-[#00fff5]/50 mb-2">Portfólio</p>
                <h2 className="text-3xl md:text-4xl font-bold text-white">
                    Projetos em <span className="text-teal-400">Destaque</span>
                </h2>
            </div>

            {/* Parallax gallery — visible from start, scrolls upward */}
            <div
                ref={gallery}
                className="relative box-border flex h-[250vh] gap-[2vw] bg-transparent p-[2vw] overflow-hidden"
            >
                <Column images={[images[0], images[1], images[2]]} y={y} offset="0px" />
                <Column images={[images[3], images[4], images[5]]} y={y2} offset="-100px" />
                <Column images={[images[6], images[7], images[8]]} y={y3} offset="-40px" />
                <Column images={[images[9], images[10], images[11]]} y={y4} offset="-80px" />
            </div>
        </section>
    );
};

type ColumnProps = {
    images: string[];
    y: MotionValue<number>;
    offset?: string;
};

const Column = ({ images, y, offset = "0px" }: ColumnProps) => {
    return (
        <motion.div
            className="relative flex h-full w-1/4 min-w-[220px] flex-col gap-[2vw]"
            style={{ y, top: offset }}
        >
            {images.map((src, i) => (
                <div key={i} className="relative flex-1 overflow-hidden rounded-xl border border-white/5 opacity-70 hover:opacity-100 transition-opacity duration-500 min-h-[220px]">
                    <img
                        src={src}
                        alt={`Featured project ${i + 1}`}
                        className="pointer-events-none object-cover w-full h-full grayscale hover:grayscale-0 transition-all duration-700"
                    />
                </div>
            ))}
        </motion.div>
    );
};

export { Skiper30 };
