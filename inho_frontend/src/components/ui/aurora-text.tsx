'use client';
import { motion } from 'framer-motion';

export function AuroraText({ text, className = '' }: { text: string; className?: string }) {
    return (
        <div className={`relative inline-block ${className}`}>
            <motion.span
                className="absolute inset-0 bg-gradient-to-r from-inho-gold via-cyan-400 to-inho-green bg-clip-text text-transparent opacity-80 blur-lg"
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
            <motion.span
                className="relative bg-gradient-to-r from-inho-gold via-cyan-400 to-inho-green bg-clip-text text-transparent drop-shadow-sm font-black"
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
