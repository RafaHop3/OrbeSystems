'use client';
import React from 'react';
import { motion } from 'framer-motion';

export function ShimmerButton({ children, onClick, className = '' }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
    return (
        <button
            onClick={onClick}
            className={`group relative flex items-center justify-center gap-2 overflow-hidden rounded-2xl bg-inho-black px-8 py-4 font-bold text-inho-text border border-[#E5DEC9] transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(245,166,35,0.3)] ${className}`}
        >
            <span className="relative z-10 flex items-center gap-2">{children}</span>
            <div className="absolute inset-0 z-0">
                <motion.div
                    animate={{ x: ['-200%', '200%'] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                    className="h-full w-1/2 bg-gradient-to-r from-transparent via-inho-gold/30 to-transparent skew-x-12"
                />
            </div>
            <div className="absolute inset-0 z-0 rounded-2xl ring-1 ring-inset ring-white/10 group-hover:ring-inho-gold/50 transition-colors" />
        </button>
    );
}
