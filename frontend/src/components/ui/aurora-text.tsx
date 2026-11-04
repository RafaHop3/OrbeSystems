'use client';
import { motion } from 'framer-motion';

export function AuroraText({ text, className = '' }: { text: string; className?: string }) {
    return (
        <span className={`relative inline-block ${className}`}>
            {/* Camada luminosa de glow - estritamente decorativa. O texto vem de data-text via CSS
                (não existe no DOM), evitando duplicação em leitores de tela, buscadores e scrapers. */}
            <motion.span
                aria-hidden="true"
                data-text={text}
                className="absolute inset-0 bg-gradient-to-r from-neon-cyan via-purple-400 to-neon-blue bg-clip-text text-transparent opacity-100 blur-xl select-none pointer-events-none before:content-[attr(data-text)]"
                animate={{
                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                }}
                transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: 'linear',
                }}
                style={{ backgroundSize: '200% auto' }}
            />
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
