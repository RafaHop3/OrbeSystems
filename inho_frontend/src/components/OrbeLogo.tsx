'use client';

import React from 'react';

export default function OrbeLogo({ className = '', variant = 'header' }: { className?: string, variant?: 'header' | 'giant' }) {
    const isGiant = variant === 'giant';

    return (
        <svg
            viewBox="0 0 100 100"
            fill="none"
            className={`${className} overflow-visible`}
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <filter id="glow-gold" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2.5" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <filter id="glow-green" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <filter id="glow-blue" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>

                <linearGradient id="grad-gold" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#D4AF37" />
                    <stop offset="50%" stopColor="#B8860B" />
                    <stop offset="100%" stopColor="#7A5605" />
                </linearGradient>
            </defs>

            {/* Core Sovereign Golden Globe (Central Orbe) */}
            <circle cx="50" cy="50" r="15" fill="url(#grad-gold)" filter="url(#glow-gold)" />
            <circle cx="50" cy="50" r="15" fill="none" stroke="#8B6508" strokeWidth="0.8" opacity="0.7" strokeDasharray="3 3" className="animate-spin-slow" />

            {/* Gold Orbit (Primary Executive Orbit) */}
            <ellipse
                cx="50" cy="50" rx="42" ry="13"
                stroke="#B8860B" strokeWidth={isGiant ? "1.3" : "1.8"}
                transform="rotate(-30 50 50)"
                className="animate-spin-slow origin-center"
                filter="url(#glow-gold)"
                opacity="0.9"
                style={{ animationDirection: 'reverse', animationDuration: '10s' }}
                strokeDasharray="44 10 6 10"
            />
            <circle cx="10" cy="50" r="3" fill="#B8860B" filter="url(#glow-gold)" transform="rotate(-30 50 50)">
                <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="-360 50 50" dur="5s" repeatCount="indefinite" />
            </circle>

            {/* Emerald Orbit (Growth & Cooperative Solvency) */}
            <ellipse
                cx="50" cy="50" rx="42" ry="13"
                stroke="#059669" strokeWidth={isGiant ? "1.2" : "1.6"}
                transform="rotate(30 50 50)"
                className="origin-center"
                filter="url(#glow-green)"
                opacity="0.85"
                strokeDasharray="60 15"
            >
                <animateTransform attributeName="transform" type="rotate" from="30 50 50" to="390 50 50" dur="12s" repeatCount="indefinite" />
            </ellipse>
            <circle cx="90" cy="50" r="2.8" fill="#059669" filter="url(#glow-green)" transform="rotate(30 50 50)">
                <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="4s" repeatCount="indefinite" />
            </circle>

            {/* Champagne Orbit (Governance) */}
            <ellipse
                cx="50" cy="50" rx="42" ry="13"
                stroke="#D4AF37" strokeWidth={isGiant ? "1.2" : "1.6"}
                transform="rotate(90 50 50)"
                className="origin-center"
                filter="url(#glow-gold)"
                opacity="0.75"
                strokeDasharray="24 6"
            >
                <animateTransform attributeName="transform" type="rotate" from="90 50 50" to="-270 50 50" dur="15s" repeatCount="indefinite" />
            </ellipse>
        </svg>
    );
}
