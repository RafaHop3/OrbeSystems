/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── Orbe INHO — Padrão Executivo Ouro Claro (Sovereign Gold Light) ──
        'terminal-bg': '#F6F4EE',
        'terminal-surface': '#FFFFFF',
        'terminal-border': '#E5DEC9',

        // Executive Accents (Remapped from legacy neon tokens)
        'neon-cyan': '#B8860B',   // Sovereign Executive Gold
        'neon-green': '#059669',  // Executive Banking Emerald
        'neon-purple': '#7C3AED', // Royal Amethyst
        'neon-blue': '#1D4ED8',   // Institutional Sapphire
        'neon-amber': '#D97706',  // Imperial Amber

        // Text Hierarchy (High-Contrast Obsidian & Slate)
        'terminal-text': '#0F172A',
        'terminal-muted': '#57606A',
        'terminal-bright': '#0F172A',

        // ── INHO Sovereign Gold Brand Palette ───────────────────────────────
        'inho-black': '#F6F4EE',   // Warm Alabaster Canvas
        'inho-dark': '#FFFFFF',    // Pure Crisp White Surface
        'inho-surface': '#FAF8F2', // Warm Ivory Sub-surface
        'inho-card': '#FFFFFF',    // Executive Card White
        'inho-border': '#E5DEC9',  // Warm Champagne Stone Border

        'inho-gold': '#B8860B',       // Primary Sovereign Gold
        'inho-gold-light': '#D4AF37', // Metallic Champagne Gold
        'inho-gold-dark': '#8B6508',  // Deep Imperial Gold
        'inho-teal': '#B8860B',       // Mapped to Sovereign Gold

        'inho-green': '#059669',
        'inho-green-light': '#10B981',
        'inho-green-dark': '#065F46',

        'inho-blue': '#1D4ED8',
        'inho-blue-light': '#2563EB',

        'inho-text': '#0F172A',
        'inho-muted': '#57606A',
        'inho-subtle': '#E5DEC9',
      },
      fontFamily: {
        sans: ['var(--font-outfit)', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'inho-gradient': 'linear-gradient(135deg, #FAF8F2 0%, #FFFFFF 50%, #F4EFE2 100%)',
        'inho-gold-gradient': 'linear-gradient(135deg, #9A6F0B 0%, #D4AF37 50%, #B8860B 100%)',
        'inho-hero-gradient': 'radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.18) 0%, transparent 65%), linear-gradient(180deg, #FAF8F2 0%, #F3EFE4 100%)',
        'inho-card-gradient': 'linear-gradient(145deg, #FFFFFF 0%, #FAF8F2 100%)',
        'mesh-pattern': "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23b8860b' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
      },
      animation: {
        'pulse-gold': 'pulse-gold 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 2s infinite',
        'slide-up': 'slide-up 0.5s ease-out forwards',
        'fade-in': 'fade-in 0.5s ease-out forwards',
        'shimmer': 'shimmer 3s linear infinite',
        'spin-slow': 'spin 10s linear infinite',
        'glow-pulse': 'glow-pulse 2.5s ease-in-out infinite',
        'count-up': 'fade-in 0.8s ease-out forwards',
        'border-flow': 'border-flow 4s linear infinite',
        'gradient-x': 'gradient-x 3s ease infinite',
      },
      keyframes: {
        'pulse-gold': {
          '0%, 100%': { opacity: '0.8', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.03)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 4px 20px rgba(184,134,11,0.18)' },
          '50%': { boxShadow: '0 8px 30px rgba(184,134,11,0.32)' },
        },
        'border-flow': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      boxShadow: {
        'inho-gold': '0 10px 25px -5px rgba(184,134,11,0.25), 0 4px 10px -2px rgba(184,134,11,0.12)',
        'glow-gold': '0 8px 22px -4px rgba(184,134,11,0.28), 0 2px 6px rgba(184,134,11,0.15)',
        'inho-green': '0 10px 25px -5px rgba(5,150,105,0.22)',
        'inho-card': '0 1px 3px rgba(15,23,42,0.05), 0 8px 24px -4px rgba(180,145,55,0.07)',
        'inho-hover': '0 16px 36px -8px rgba(15,23,42,0.09), 0 4px 16px rgba(184,134,11,0.12)',
      },
    },
  },
  plugins: [],
};
