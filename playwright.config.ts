import { defineConfig, devices } from '@playwright/test'

/**
 * E2E tests drive the real SPA in a browser while stubbing the API at the
 * network layer (see e2e/*.spec.ts). They need only the Vite dev server — no
 * backend or database — so they're fast and deterministic.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
