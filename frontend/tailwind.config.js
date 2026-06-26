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
        mono: ['"JetBrains Mono"', 'Consolas', 'monospace'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      colors: {
        neon: {
          green: '#5a8fb5',
          cyan: '#7eb8e0',
          blue: '#3d6a8c',
          purple: '#94b8d4',
          pink: '#5a8fb5',
        },
        terminal: {
          bg: '#000000',
          surface: '#0a1628',
          border: 'rgba(90, 143, 181, 0.22)',
          muted: '#8fa8bc',
        },
        navy: {
          black: '#000000',
          void: '#030508',
          deep: '#0a1628',
          mid: '#0f2847',
          steel: '#1a3a5c',
          metallic: '#3d6a8c',
          shine: '#5a8fb5',
          glow: '#7eb8e0',
          mist: '#c8d6e3',
        },
      },
      animation: {
        'pulse-neon': 'pulse-neon 3s ease-in-out infinite',
        'fade-in-up': 'fade-in-up 0.6s ease-out forwards',
        'blink': 'blink 1s step-end infinite',
        'spin-slow': 'spin 18s linear infinite',
        'spin-reverse': 'spin 22s linear infinite reverse',
        'float': 'float 8s ease-in-out infinite',
      },
      keyframes: {
        'pulse-neon': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.65' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
      },
      boxShadow: {
        'neon-cyan': '0 0 16px rgba(126, 184, 224, 0.2)',
        'navy-glow': '0 0 32px rgba(90, 143, 181, 0.15)',
      },
    },
  },
  plugins: [],
};
