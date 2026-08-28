'use client';
import { motion } from 'framer-motion';

export function AuroraText({ text, className = '' }: { text: string; className?: string }) {
    return (
        <div className={`relative inline-block ${className}`}>
            <motion.span
                className="absolute inset-0 bg-gradient-to-r from-neon-cyan via-purple-400 to-neon-blue bg-clip-text text-transparent opacity-100 blur-xl"
                animate={{
                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                }}
                transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: 'linear',
                }}
                style={{ backgroundSize: '200% auto' }}
            >
                {text}
            </motion.span>
            <motion.span
                className="relative bg-gradient-to-r from-neon-cyan via-purple-400 to-neon-blue bg-clip-text text-transparent drop-shadow-lg font-black"

                animate={{
                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                }}
                transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: 'linear',
                }}
                style={{ backgroundSize: '200% auto' }}
            >
                {text}
            </motion.span>
        </div>
    );
}
