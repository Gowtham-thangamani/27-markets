import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig(({ command }) => ({
  // GitHub Pages serves this project at /27-markets/. Vercel + local dev serve
  // at root /. Vercel sets process.env.VERCEL=1 during its build.
  base: process.env.VERCEL ? '/' : command === 'build' ? '/27-markets/' : '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    // Allow Codespaces / tunnel hosts to load the dev server.
    allowedHosts: ['.app.github.dev', '.github.dev', 'localhost'],
    // Same-origin API: the browser calls /api on the frontend origin and Vite
    // proxies to the backend, so auth cookies stay first-party (works on a
    // single public Codespaces port without SameSite=None/CORS changes).
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three', '@react-three/fiber', '@react-three/drei'],
        },
      },
    },
  },
}))
