import { describe, expect, it } from 'vitest'
import { createRoutesFromChildren, matchRoutes } from 'react-router-dom'
import { appRoutes } from './index'

/**
 * These tests ask "which paths does this build mount?" by matching against the
 * route tree directly. No rendering, so no providers, no lazy chunks and no
 * network — App sits under five context providers in main.tsx and AuthProvider
 * hits the API on mount, which would make a render-based test slow and flaky
 * while proving less.
 */
const routes = createRoutesFromChildren(appRoutes())

/** True when the path falls through to the catch-all 404 route. */
function is404(path: string): boolean {
  const matches = matchRoutes(routes, path)
  if (!matches || matches.length === 0) return true
  return matches[matches.length - 1].route.path === '*'
}

describe('appRoutes — default build mounts every surface', () => {
  it.each([
    ['/', 'marketing home'],
    ['/about', 'marketing page'],
    ['/blog/some-slug', 'marketing dynamic route'],
    ['/partner/apply', 'public IB application'],
    ['/login', 'auth'],
    ['/register', 'auth signup'],
    ['/portal/dashboard', 'client portal'],
    ['/partner/dashboard', 'IB partner portal'],
    ['/admin/dashboard', 'admin CRM'],
    ['/admin/withdrawal-requests', 'admin deep route'],
    ['/agent/dashboard', 'agent workspace'],
  ])('mounts %s (%s)', (path) => {
    expect(is404(path)).toBe(false)
  })

  it('still falls through to 404 for an unknown path', () => {
    expect(is404('/no-such-page-anywhere')).toBe(true)
  })
})
