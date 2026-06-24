import type { Page, Route } from '@playwright/test'

export type Role = 'CLIENT' | 'PARTNER' | 'ADMIN' | 'AGENT'

export function apiUser(role: Role, over: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'u1',
    email: 'staff@27markets.com',
    firstName: 'Grace',
    lastName: 'Hopper',
    phone: null,
    country: 'AE',
    role,
    twoFactorEnabled: false,
    joinedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  }
}

/**
 * Install network stubs for the API. A catch-all returns `{}` so no request
 * ever hits a (non-existent) backend; `routes` overrides specific endpoints.
 * `me` controls the session identity (or null → 401 unauthenticated).
 */
export async function stubApi(
  page: Page,
  opts: { me: ReturnType<typeof apiUser> | null; routes?: Record<string, unknown | ((route: Route) => void)> },
) {
  // Catch-all first (lowest priority — Playwright matches most-recent first).
  await page.route('**/api/**', (route) => route.fulfill({ status: 200, json: {} }))

  await page.route('**/api/users/me', (route) =>
    opts.me
      ? route.fulfill({ status: 200, json: opts.me })
      : route.fulfill({ status: 401, json: { message: 'Unauthorized' } }),
  )
  await page.route('**/api/auth/refresh', (route) => route.fulfill({ status: 401, json: {} }))

  for (const [pattern, handler] of Object.entries(opts.routes ?? {})) {
    await page.route(pattern, (route) =>
      typeof handler === 'function' ? (handler as (r: Route) => void)(route) : route.fulfill({ status: 200, json: handler }),
    )
  }
}
