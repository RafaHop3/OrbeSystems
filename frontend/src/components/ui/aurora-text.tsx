'use client';
import { motion } from 'framer-motion';

export function AuroraText({ text, className = '' }: { text: string; className?: string }) {
    return (
        <span className={`relative inline-block ${className}`}>
            {/* Camada luminosa de glow - estritamente decorativa, isolada do leitor de tela e de seleções */}
            <motion.span
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-r from-neon-cyan via-purple-400 to-neon-blue bg-clip-text text-transparent opacity-100 blur-xl select-none pointer-events-none"
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
            {/* Camada de texto semântica e acessível única */}
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
        </span>
    );
}
