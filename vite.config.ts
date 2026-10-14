import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// Which slice of the app this build contains. The '@surface-routes' alias below
// resolves to exactly one composition module, so a surface's bundle never even
// imports another surface's routes — isolation holds because the foreign modules
// are absent from the graph, not because the bundler was asked to drop them.
//
// Tree-shaking alone does NOT achieve this: each route module calls
// lazy(() => import(...)) at module scope, which Rollup treats as a side effect,
// so a statically imported module is retained and every import() it contains is
// still emitted as a chunk. Measured: all 167 chunks survived in every surface.
const SURFACES = ['marketing', 'portal', 'partner', 'admin', 'all'] as const

export default defineConfig(({ mode }) => {
  // Read BOTH sources. Vite populates import.meta.env from .env files but never
  // copies them into process.env, so resolving the surface from process.env
  // alone would let a .env entry set the app's idea of its surface while this
  // config silently built 'all' — a full-fat bundle that believes it is the
  // admin surface. The shell still wins, because deploy-frontend.sh exports it.
  const fileEnv = loadEnv(mode, process.cwd(), 'VITE_')
  const surface = process.env.VITE_SURFACE || fileEnv.VITE_SURFACE || 'all'
  if (!(SURFACES as readonly string[]).includes(surface)) {
    throw new Error(
      `Unknown VITE_SURFACE "${surface}". Expected one of: ${SURFACES.join(', ')}`,
    )
  }

  return {
    // Served at the domain root on S3 + CloudFront (production), Vercel, and local
    // dev — so base is '/'. A sub-path host (e.g. GitHub Pages at /27-markets/)
    // sets PUBLIC_BASE explicitly; everything else, including `deploy-frontend.sh`,
    // gets the safe root default.
    base: process.env.PUBLIC_BASE ?? '/',
    plugins: [react()],
    // Pin the value this config resolved, so src/lib/surface.ts cannot disagree
    // with the alias about which surface was built.
    define: {
      'import.meta.env.VITE_SURFACE': JSON.stringify(surface),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@surface-routes': path.resolve(__dirname, `./src/routes/surfaces/${surface}.tsx`),
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
        resolveDependencies: (_url: string, deps: string[]) =>
          deps.filter((d) => !/[/]three-/.test(d)),
      },
      rollupOptions: {
        output: {
          manualChunks: {
            three: ['three', '@react-three/fiber', '@react-three/drei'],
          },
        },
      },
    },
  }
})
