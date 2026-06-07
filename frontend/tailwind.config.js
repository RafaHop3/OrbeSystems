/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Consolas', 'monospace'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        serif: ['"EB Garamond"', 'serif'],
        cinzel: ['"Cinzel"', 'serif'],
      },
      colors: {
        neon: {
          green: '#39ff14',
          cyan: '#00fff5',
          blue: '#0066ff',
          purple: '#bd00ff',
          pink: '#ff0090',
        },
        terminal: {
          bg: '#040608',
          surface: '#0d1117',
          border: '#1e2d3d',
          muted: '#8b949e',
        },
        renaissance: {
          bg: '#0c0a08', // Dark charcoal/walnut marble slate
          surface: '#181310', // Walnut wood grain surface
          border: '#2a1f18', // Aged dark wood/leather seam
          muted: '#8e7f73', // Dust charcoal tint
          gold: '#c5a059', // Antique gold
          'gold-light': '#ffd700', // Bright gold highlight
          gilt: '#d4af37', // Gilded gold
          vellum: '#f1e7d0', // Aged parchment cream
          parchment: '#dfd2b8', // Deeper vellum tone
          burgundy: '#52141a', // Crimson wine oil paint
          crimson: '#3b0e12', // Shadowed crimson
        },
      },
      animation: {
        'pulse-neon': 'pulse-neon 2s ease-in-out infinite',
        'scan-line': 'scan-line 3s linear infinite',
        'flicker': 'flicker 0.15s infinite',
        'fade-in-up': 'fade-in-up 0.6s ease-out forwards',
        'blink': 'blink 1s step-end infinite',
        'glow-pulse': 'glow-pulse 2.5s ease-in-out infinite',
        'spin-slow': 'spin 15s linear infinite',
        'spin-reverse': 'spin 20s linear infinite reverse',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        'pulse-neon': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        'scan-line': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        'flicker': {
          '0%, 19.9%, 22%, 62.9%, 64%, 64.9%, 70%, 100%': { opacity: '1' },
          '20%, 21.9%, 63%, 63.9%, 65%, 69.9%': { opacity: '0.4' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 8px #00fff5, 0 0 20px #00fff540' },
          '50%': { boxShadow: '0 0 20px #00fff5, 0 0 60px #00fff540, 0 0 80px #00fff520' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
      },
      boxShadow: {
        'neon-cyan': '0 0 8px #00fff5, 0 0 20px #00fff540',
        'neon-green': '0 0 8px #39ff14, 0 0 20px #39ff1440',
        'neon-purple': '0 0 8px #bd00ff, 0 0 20px #bd00ff40',
        'terminal': 'inset 0 0 30px rgba(0,255,245,0.05)',
        'gilt': '0 0 15px rgba(212,175,55,0.25), inset 0 0 10px rgba(212,175,55,0.1)',
        'spotlight': '0 0 40px rgba(212,175,55,0.15)',
      },
    },
  },
  plugins: [],
};
