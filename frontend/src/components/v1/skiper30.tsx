"use client";

import { motion, MotionValue, useScroll, useTransform } from "framer-motion";
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
    const [height, setHeight] = useState(0);

    // Native scroll — works perfectly with framer-motion useScroll (no Lenis conflict)
    const { scrollYProgress } = useScroll({
        target: gallery,
        offset: ["start end", "end start"],
    });

    // Columns scroll UP at different speeds — classic parallax stagger
    const y1 = useTransform(scrollYProgress, [0, 1], [0, -height * 0.8]);
    const y2 = useTransform(scrollYProgress, [0, 1], [0, -height * 1.6]);
    const y3 = useTransform(scrollYProgress, [0, 1], [0, -height * 0.5]);
    const y4 = useTransform(scrollYProgress, [0, 1], [0, -height * 1.3]);

    useEffect(() => {
        const update = () => setHeight(window.innerHeight);
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
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

            {/* Parallax gallery — starts visible, each column scrolls up at diff speeds */}
            <div
                ref={gallery}
                className="relative box-border flex h-[220vh] gap-[2vw] bg-transparent p-[2vw] overflow-hidden"
            >
                <Column images={[images[0], images[1], images[2]]} y={y1} offsetTop="0px" />
                <Column images={[images[3], images[4], images[5]]} y={y2} offsetTop="-80px" />
                <Column images={[images[6], images[7], images[8]]} y={y3} offsetTop="-30px" />
                <Column images={[images[9], images[10], images[11]]} y={y4} offsetTop="-60px" />
            </div>
        </section>
    );
};

type ColumnProps = {
    images: string[];
    y: MotionValue<number>;
    offsetTop?: string;
};

const Column = ({ images, y, offsetTop = "0px" }: ColumnProps) => (
    <motion.div
        className="relative flex h-full w-1/4 min-w-[220px] flex-col gap-[2vw]"
        style={{ y, top: offsetTop }}
    >
        {images.map((src, i) => (
            <div
                key={i}
                className="relative flex-1 overflow-hidden rounded-xl border border-white/5 opacity-60 hover:opacity-100 transition-opacity duration-500 min-h-[220px]"
            >
                <img
                    src={src}
                    alt={`Featured project ${i + 1}`}
                    className="pointer-events-none object-cover w-full h-full grayscale hover:grayscale-0 transition-all duration-700"
                />
            </div>
        ))}
    </motion.div>
);

export { Skiper30 };
