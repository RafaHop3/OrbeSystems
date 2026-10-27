"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import React from "react";

export function PlasmaBackground({ className }: { className?: string }) {
    return (
        <div className={cn("absolute inset-0 overflow-hidden pointer-events-none z-0 bg-inho-black", className)}>
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 90, 180, 270, 360],
                    borderRadius: ["40% 60% 70% 30%", "30% 70% 60% 40%", "60% 40% 30% 70%", "40% 60% 70% 30%"],
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-inho-gold/20 mix-blend-screen blur-[100px]"
            />
            <motion.div
                animate={{
                    scale: [1, 1.5, 1],
                    rotate: [360, 270, 180, 90, 0],
                    borderRadius: ["60% 40% 30% 70%", "40% 60% 70% 30%", "30% 70% 60% 40%", "60% 40% 30% 70%"],
                }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className="absolute top-[20%] -right-[10%] w-[60%] h-[60%] bg-inho-blue/15 mix-blend-screen blur-[120px]"
            />
            <motion.div
                animate={{
                    scale: [1.2, 1, 1.2],
                    rotate: [0, -180, -360],
                    borderRadius: ["30% 70% 60% 40%", "60% 40% 30% 70%", "40% 60% 70% 30%", "30% 70% 60% 40%"],
                }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute -bottom-[20%] left-[10%] w-[70%] h-[70%] bg-inho-green/20 mix-blend-screen blur-[100px]"
            />
            <div className="absolute inset-0 bg-[#F8FAFC]/80 backdrop-blur-[60px] z-10" />
            <div
                className="absolute inset-0 z-20 opacity-20"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                }}
            />
        </div>
    );
}
