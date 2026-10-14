import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Tests import the surface modules directly (src/routes/surfaces/*.spec.tsx);
      // this only serves appRoutes(), which under test is the combined build.
      '@surface-routes': path.resolve(
        __dirname,
        `./src/routes/surfaces/${process.env.VITE_SURFACE || 'all'}.tsx`,
      ),
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.spec.{ts,tsx}', 'scripts/**/*.spec.mjs'],
  },
});
