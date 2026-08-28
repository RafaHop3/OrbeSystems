'use client';
import React, { useRef } from 'react';
import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'framer-motion';

export function MagicCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    const ref = useRef<HTMLDivElement>(null);

    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const springConfig = { damping: 20, stiffness: 300, mass: 0.5 };
    const springX = useSpring(mouseX, springConfig);
    const springY = useSpring(mouseY, springConfig);

    const rotateX = useTransform(springY, [-300, 300], [10, -10]);
    const rotateY = useTransform(springX, [-300, 300], [-10, 10]);

    function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
        const { left, top, width, height } = currentTarget.getBoundingClientRect();

        // Glow tracking map
        mouseX.set(clientX - left);
        mouseY.set(clientY - top);

        // Tilt tracking map based on center deviation
        const centerX = width / 2;
        const centerY = height / 2;
        const localX = clientX - left;
        const localY = clientY - top;

        // Small correction so it stays within expected boundaries
        mouseX.set(localX - centerX);
        mouseY.set(localY - centerY);
    }

    function handleMouseLeave() {
        mouseX.set(0);
        mouseY.set(0);
    }

    return (
        <motion.div
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
                rotateX,
                rotateY,
                transformStyle: 'preserve-3d',
            }}
            className={`group relative overflow-hidden rounded-2xl bg-navy-void border border-terminal-border px-8 py-10 shadow-2xl transition-all duration-[400ms] hover:shadow-[0_0_60px_rgba(126,184,224,0.3)] hover:z-20 ${className}`}
        >
            <motion.div
                className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition duration-500 group-hover:opacity-100 mix-blend-screen"
                style={{
                    background: useMotionTemplate`
            radial-gradient(
              700px circle at ${springX}px ${springY}px,
              rgba(126, 184, 224, 0.4),
              transparent 70%
            )
          `,
                }}
            />
            <motion.div
                className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition duration-500 group-hover:opacity-100 mix-blend-color-dodge"
                style={{
                    background: useMotionTemplate`
            radial-gradient(
              300px circle at ${springX}px ${springY}px,
              rgba(90, 143, 181, 0.8),
              transparent 50%
            )
          `,
                }}
            />

            {/* The physical depth illusion wrapped around children */}
            <div className="relative z-10" style={{ transform: 'translateZ(30px)' }}>
                {children}
            </div>
        </motion.div>
    );
}
