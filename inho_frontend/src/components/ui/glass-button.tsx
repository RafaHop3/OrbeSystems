"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    className?: string;
    glowColor?: "gold" | "green" | "blue";
}

export function GlassButton({ children, className, glowColor = "gold", ...props }: GlassButtonProps) {
    const glowMap = {
        gold: "shadow-inho-gold hover:shadow-[0_0_40px_rgba(245,166,35,0.6)] border-inho-gold/30",
        green: "shadow-inho-green hover:shadow-[0_0_40px_rgba(16,185,129,0.6)] border-inho-green/30",
        blue: "shadow-inho-blue hover:shadow-[0_0_40px_rgba(14,165,233,0.6)] border-inho-blue/30",
    };

    return (
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
                "relative overflow-hidden rounded-xl bg-[#FAF8F2] px-6 py-3 font-semibold text-[#0F172A] backdrop-blur-md transition-all duration-300",
                "border",
                glowMap[glowColor],
                "before:absolute before:inset-0 before:z-[-1] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-1000",
                className
            )}
            {...(props as any)}
        >
            <span className="relative z-10 flex items-center gap-2">{children}</span>
        </motion.button>
    );
}
