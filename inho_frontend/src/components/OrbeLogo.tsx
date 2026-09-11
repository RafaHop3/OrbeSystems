'use client';
import React from 'react';

export default function OrbeLogo({ className = "w-8 h-8" }: { className?: string }) {
    return (
        <div className={`relative flex items-center justify-center ${className}`}>
            <svg viewBox="0 0 100 100" className="w-full h-full filter drop-shadow-[0_0_12px_rgba(0,255,245,0.4)]">
                {/* Background Core Glow */}
                <circle cx="50" cy="50" r="10" fill="#00fff5" className="animate-pulse" />

                {/* Outer Ring 1 - Fast Spin */}
                <circle
                    cx="50"
                    cy="50"
                    r="25"
                    fill="none"
                    stroke="#00fff5"
                    strokeWidth="1.5"
                    strokeDasharray="40 20"
                    strokeLinecap="round"
                    className="origin-center animate-[spin_4s_linear_infinite]"
                />

                {/* Outer Ring 2 - Reverse Slow Spin */}
                <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#39ff14"
                    strokeWidth="1"
                    strokeDasharray="10 30"
                    strokeLinecap="round"
                    className="origin-center animate-[spin_8s_linear_reverse_infinite] opacity-60"
                />

                {/* Tech Accents */}
                <path d="M 50 5 L 50 15 M 50 85 L 50 95 M 5 50 L 15 50 M 85 50 L 95 50" stroke="#00fff5" strokeWidth="2" strokeLinecap="round" className="opacity-50" />
            </svg>
        </div>
    );
}
