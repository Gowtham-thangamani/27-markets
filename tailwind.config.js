/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#050505',
          850: '#0a0a0a',
          800: '#0d0d0d',
          700: '#111111',
          600: '#161616',
          500: '#181818',
          400: '#1f1f1f',
          300: '#262626',
        },
        brand: {
          DEFAULT: '#e11d2e',
          50: '#fff1f2',
          100: '#ffe1e3',
          200: '#ffc7cb',
          300: '#ff9da5',
          400: '#ff5663',
          500: '#e11d2e',
          600: '#c41323',
          700: '#a30f1d',
          800: '#86121d',
          900: '#70151f',
        },
        success: '#22c55e',
        warning: '#f59e0b',
        danger: '#ef4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'sans-serif'],
      },
      backgroundImage: {
        'grid-faint':
          'linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)',
        'radial-red':
          'radial-gradient(60% 60% at 50% 40%, rgba(225,29,46,0.18) 0%, transparent 70%)',
      },
      boxShadow: {
        'red-glow': '0 0 0 1px rgba(225,29,46,0.35), 0 0 30px rgba(225,29,46,0.25)',
        'red-glow-lg': '0 0 60px rgba(225,29,46,0.35)',
        panel: '0 10px 40px rgba(0,0,0,0.6)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-glow': {
          '0%,100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s ease-out both',
        'pulse-glow': 'pulse-glow 2.4s ease-in-out infinite',
        shimmer: 'shimmer 1.6s infinite',
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
