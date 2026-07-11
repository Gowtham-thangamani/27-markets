import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig(() => ({
  // Served at the domain root on S3 + CloudFront (production), Vercel, and local
  // dev — so base is '/'. A sub-path host (e.g. GitHub Pages at /27-markets/)
  // sets PUBLIC_BASE explicitly; everything else, including `deploy-frontend.sh`,
  // gets the safe root default.
  base: process.env.PUBLIC_BASE ?? '/',
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
    // Keep the heavy 3D chunk out of the <link modulepreload> set — it's only
    // used by lazily-loaded decorative components, so preloading it on the
    // landing page wastes ~47 KB gz of eager download.
    modulePreload: {
      resolveDependencies: (_url, deps) => deps.filter((d) => !/[/]three-/.test(d)),
    },
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three', '@react-three/fiber', '@react-three/drei'],
        },
      },
    },
  },
}))
