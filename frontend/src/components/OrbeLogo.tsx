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
        {/* Glow Filters */}
        <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="glow-purple" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Gradients */}
        <linearGradient id="grad-cyan-purple" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00f2fe" />
          <stop offset="100%" stopColor="#4facfe" />
        </linearGradient>
        <linearGradient id="grad-neon" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00f2fe" />
          <stop offset="50%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>

      {/* Cyberpunk background accent hexagon/circle grid */}
      <circle 
        cx="50" 
        cy="50" 
        r="46" 
        stroke="url(#grad-cyan-purple)" 
        strokeWidth={isGiant ? "0.75" : "1"} 
        opacity="0.15" 
        strokeDasharray="3 6"
      />

      {/* Outer rotating segmented ring */}
      <circle 
        cx="50" 
        cy="50" 
        r="40" 
        stroke="#00f2fe" 
        strokeWidth={isGiant ? "1" : "1.5"} 
        strokeDasharray="25 10 5 10" 
        className="animate-spin-slow origin-center" 
        filter="url(#glow-cyan)"
        opacity="0.8"
      />

      {/* Outer counter-rotating purple/pink orbit */}
      <ellipse 
        cx="50" 
        cy="50" 
        rx="46" 
        ry="16" 
        stroke="#a855f7" 
        strokeWidth={isGiant ? "1" : "1.5"} 
        transform="rotate(-30 50 50)"
        className="animate-spin-slow origin-center" 
        filter="url(#glow-purple)"
        opacity="0.9"
        style={{ animationDirection: 'reverse', animationDuration: '12s' }}
      />

      {/* Cross-intersecting cyan orbit */}
      <ellipse 
        cx="50" 
        cy="50" 
        rx="46" 
        ry="16" 
        stroke="#00f2fe" 
        strokeWidth={isGiant ? "1" : "1.5"} 
        transform="rotate(45 50 50)"
        className="animate-spin-slow origin-center" 
        filter="url(#glow-cyan)"
        opacity="0.75"
        style={{ animationDuration: '8s' }}
      />

      {/* Outer boundary bracket lines (cyberpunk tech accents) */}
      <path 
        d="M 22 22 L 15 22 L 15 29" 
        stroke="#00f2fe" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        opacity="0.6"
      />
      <path 
        d="M 78 22 L 85 22 L 85 29" 
        stroke="#a855f7" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        opacity="0.6"
      />
      <path 
        d="M 22 78 L 15 78 L 15 71" 
        stroke="#a855f7" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        opacity="0.6"
      />
      <path 
        d="M 78 78 L 85 78 L 85 71" 
        stroke="#00f2fe" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        opacity="0.6"
      />

      {/* Core glowing system */}
      <g filter="url(#glow-cyan)">
        {/* Inner high-speed data track */}
        <circle 
          cx="50" 
          cy="50" 
          r="18" 
          stroke="url(#grad-neon)" 
          strokeWidth="2" 
          strokeDasharray="4 16"
          className="animate-spin origin-center"
          style={{ animationDuration: '3s' }}
        />
        {/* Core solid sphere with pulsating neon glow */}
        <circle 
          cx="50" 
          cy="50" 
          r="8" 
          fill="url(#grad-neon)" 
          className="animate-pulse"
        />
      </g>
    </svg>
  );
}
