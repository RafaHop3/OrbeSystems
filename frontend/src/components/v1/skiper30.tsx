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
    const sectionRef = useRef<HTMLElement>(null);
    const [sectionTop, setSectionTop] = useState(0);

    // Use absolute page scrollY — always works regardless of element position
    const { scrollY } = useScroll();

    // Drive each column from (sectionTop) to (sectionTop + 2500px) scroll range
    // Column 1: slow, Column 2: fast, Column 3: medium-slow, Column 4: medium-fast
    const scrollEnd = sectionTop + 2500;
    const y1 = useTransform(scrollY, [sectionTop, scrollEnd], [0, -450]);
    const y2 = useTransform(scrollY, [sectionTop, scrollEnd], [0, -900]);
    const y3 = useTransform(scrollY, [sectionTop, scrollEnd], [0, -280]);
    const y4 = useTransform(scrollY, [sectionTop, scrollEnd], [0, -700]);

    useEffect(() => {
        const measure = () => {
            if (sectionRef.current) {
                const rect = sectionRef.current.getBoundingClientRect();
                setSectionTop(window.scrollY + rect.top);
            }
        };
        measure();
        window.addEventListener("resize", measure);
        return () => window.removeEventListener("resize", measure);
    }, []);

    return (
        <section ref={sectionRef} className="relative z-10 w-full bg-[#050505] text-[#c8d6e3] py-24">
            {/* Section title */}
            <div className="text-center mb-12 px-6">
                <p className="text-xs font-mono uppercase tracking-widest text-[#00fff5]/50 mb-2">Portfólio</p>
                <h2 className="text-3xl md:text-4xl font-bold text-white">
                    Projetos em <span className="text-teal-400">Destaque</span>
                </h2>
            </div>

            {/* Parallax gallery */}
            <div className="relative box-border flex h-[220vh] gap-[2vw] bg-transparent p-[2vw] overflow-hidden">
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
