/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Theme-aware surfaces — values come from CSS variables (light/dark) so
        // existing bg-ink-*/border classes flip automatically. See globals.css.
        ink: {
          900: 'rgb(var(--ink-900) / <alpha-value>)',
          850: 'rgb(var(--ink-850) / <alpha-value>)',
          800: 'rgb(var(--ink-800) / <alpha-value>)',
          700: 'rgb(var(--ink-700) / <alpha-value>)',
          600: 'rgb(var(--ink-600) / <alpha-value>)',
          500: 'rgb(var(--ink-500) / <alpha-value>)',
          400: 'rgb(var(--ink-400) / <alpha-value>)',
          300: 'rgb(var(--ink-300) / <alpha-value>)',
        },
        // `white` is the THEME FOREGROUND (white on dark, near-black on light) so
        // text-white / border-white/* / bg-white/* all adapt. Use `onaccent` for
        // text that must stay white on a colored fill (buttons, badges).
        white: 'rgb(var(--fg) / <alpha-value>)',
        onaccent: '#ffffff',
        // Theme-aware neutral text scale (only 100–600 are used in the app).
        gray: {
          100: 'rgb(var(--gray-100) / <alpha-value>)',
          200: 'rgb(var(--gray-200) / <alpha-value>)',
          300: 'rgb(var(--gray-300) / <alpha-value>)',
          400: 'rgb(var(--gray-400) / <alpha-value>)',
          500: 'rgb(var(--gray-500) / <alpha-value>)',
          600: 'rgb(var(--gray-600) / <alpha-value>)',
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
        // Ported from the 27 Markets landing page
        sans: ['Archivo', 'Inter', 'system-ui', 'sans-serif'],
        display: ['"Archivo Expanded"', 'Archivo', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
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
