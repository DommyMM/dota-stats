import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#080b10',
        surface: '#0a0e16',
        surface2: '#0d1420',
        border: '#111822',
        border2: '#1a2232',
        text: '#c8d0e0',
        muted: '#8a9ab8',
        ghost: '#5a6882',
        ghost2: '#3a4a62',
        radiant: '#3dce84',
        dire: '#ff5454',
        gold: '#e8a020',
        xp: '#a78bfa',
        link: '#4d9eff',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      maxWidth: {
        shell: '1600px',
      },
      keyframes: {
        pulseDot: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(61, 206, 132, 0.5)' },
          '50%': { boxShadow: '0 0 0 4px rgba(61, 206, 132, 0)' },
        },
        slideUp: {
          from: { transform: 'translateY(12px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
      },
      animation: {
        'pulse-dot': 'pulseDot 2s ease-in-out infinite',
        'slide-up': 'slideUp 120ms ease-out',
        'fade-in': 'fadeIn 200ms ease-out',
        shimmer: 'shimmer 1.5s linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
