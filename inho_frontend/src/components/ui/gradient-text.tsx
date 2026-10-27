"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface GradientTextProps {
    text: string;
    className?: string;
    animate?: boolean;
}

export function GradientText({ text, className, animate = true }: GradientTextProps) {
    return (
        <span
            className={cn(
                "bg-clip-text text-transparent bg-inho-gold-gradient",
                animate && "animate-shimmer bg-[length:200%_auto]",
                className
            )}
        >
            {text}
        </span>
    );
}
