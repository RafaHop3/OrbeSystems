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
    const y = useTransform(scrollYProgress, [0, 1], [0, height * 2]);
    const y2 = useTransform(scrollYProgress, [0, 1], [0, height * 3.3]);
    const y3 = useTransform(scrollYProgress, [0, 1], [0, height * 1.25]);
    const y4 = useTransform(scrollYProgress, [0, 1], [0, height * 3]);

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
        <main className="w-full bg-[#050505] text-[#c8d6e3]">
            <div className="font-geist flex h-screen items-center justify-center gap-2">
                <div className="absolute left-1/2 top-[10%] grid -translate-x-1/2 content-start justify-items-center gap-6 text-center">
                    <span className="relative max-w-[12ch] text-xs uppercase leading-tight opacity-40 after:absolute after:left-1/2 after:top-full after:h-16 after:w-px after:bg-gradient-to-b after:from-[#c8d6e3] after:to-transparent after:content-['']">
                        scroll down to see
                    </span>
                </div>
            </div>

            <div
                ref={gallery}
                className="relative box-border flex h-[175vh] gap-[2vw] bg-transparent p-[2vw]"
            >
                <Column images={[images[0], images[1], images[2]]} y={y} />
                <Column images={[images[3], images[4], images[5]]} y={y2} />
                <Column images={[images[6], images[7], images[8]]} y={y3} />
                <Column images={[images[9], images[10], images[11]]} y={y4} />
            </div>
            <div className="font-geist relative flex h-screen items-center justify-center gap-2">
                <div className="absolute left-1/2 top-[10%] grid -translate-x-1/2 content-start justify-items-center gap-6 text-center">
                    <span className="relative max-w-[12ch] text-xs uppercase leading-tight opacity-40 after:absolute after:left-1/2 after:top-full after:h-16 after:w-px after:bg-gradient-to-b after:from-transparent after:to-[#c8d6e3] after:content-['']">
                        scroll Up to see
                    </span>
                </div>
            </div>
        </main>
    );
};

type ColumnProps = {
    images: string[];
    y: MotionValue<number>;
};

const Column = ({ images, y }: ColumnProps) => {
    return (
        <motion.div
            className="relative -top-[45%] flex h-full w-1/4 min-w-[250px] flex-col gap-[2vw] first:top-[-45%] [&:nth-child(2)]:top-[-95%] [&:nth-child(3)]:top-[-45%] [&:nth-child(4)]:top-[-75%]"
            style={{ y }}
        >
            {images.map((src, i) => (
                <div key={i} className="relative h-full w-full overflow-hidden rounded-xl border border-white/5 opacity-50 hover:opacity-100 transition-opacity">
                    <img
                        src={`${src}`}
                        alt="image"
                        className="pointer-events-none object-cover w-full h-full grayscale hover:grayscale-0 transition-all duration-700"
                    />
                </div>
            ))}
        </motion.div>
    );
};

export { Skiper30 };
