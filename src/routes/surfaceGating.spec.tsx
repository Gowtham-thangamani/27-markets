import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRoutesFromChildren, matchRoutes, type RouteObject } from 'react-router-dom'

/**
 * SURFACE is read once at module load, so each case resets the module registry
 * and re-imports the route tree with a different VITE_SURFACE.
 */
async function routesFor(surface: string): Promise<RouteObject[]> {
  vi.resetModules()
  vi.stubEnv('VITE_SURFACE', surface)
  const { appRoutes } = await import('./index')
  return createRoutesFromChildren(appRoutes())
}

function is404(routes: RouteObject[], path: string): boolean {
  const matches = matchRoutes(routes, path)
  if (!matches || matches.length === 0) return true
  return matches[matches.length - 1].route.path === '*'
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('VITE_SURFACE unset — the pre-split default', () => {
  it('mounts every surface, so /staging/ keeps working', async () => {
    const routes = await routesFor('')
    for (const path of [
      '/',
      '/login',
      '/register',
      '/portal/dashboard',
      '/partner/dashboard',
      '/admin/dashboard',
      '/agent/dashboard',
    ]) {
      expect(is404(routes, path), `${path} should be mounted`).toBe(false)
    }
  })
})

describe('marketing build', () => {
  it('mounts the public site', async () => {
    const routes = await routesFor('marketing')
    expect(is404(routes, '/')).toBe(false)
    expect(is404(routes, '/partner/apply')).toBe(false)
  })

  it('does NOT mount admin, partner or portal routes', async () => {
    const routes = await routesFor('marketing')
    expect(is404(routes, '/admin/dashboard')).toBe(true)
    expect(is404(routes, '/partner/dashboard')).toBe(true)
    expect(is404(routes, '/portal/dashboard')).toBe(true)
  })

  it('has no auth pages — it links to the portal host instead', async () => {
    const routes = await routesFor('marketing')
    expect(is404(routes, '/login')).toBe(true)
    expect(is404(routes, '/register')).toBe(true)
  })
})

describe('portal build', () => {
  it('mounts login, signup and the client portal', async () => {
    const routes = await routesFor('portal')
    expect(is404(routes, '/login')).toBe(false)
    expect(is404(routes, '/register')).toBe(false)
    expect(is404(routes, '/portal/dashboard')).toBe(false)
  })

  it('does not mount marketing, partner or admin', async () => {
    const routes = await routesFor('portal')
    expect(is404(routes, '/about')).toBe(true)
    expect(is404(routes, '/partner/dashboard')).toBe(true)
    expect(is404(routes, '/admin/dashboard')).toBe(true)
  })
})

describe('partner build', () => {
  it('mounts login and the partner portal', async () => {
    const routes = await routesFor('partner')
    expect(is404(routes, '/login')).toBe(false)
    expect(is404(routes, '/partner/dashboard')).toBe(false)
    expect(is404(routes, '/partner/commissions')).toBe(false)
  })

  it('does not mount /register — partners apply and are approved in the CRM', async () => {
    const routes = await routesFor('partner')
    expect(is404(routes, '/register')).toBe(true)
  })

  it('does not mount admin or marketing', async () => {
    const routes = await routesFor('partner')
    expect(is404(routes, '/admin/dashboard')).toBe(true)
    expect(is404(routes, '/about')).toBe(true)
  })
})

describe('admin build', () => {
  it('mounts login, the CRM and the agent workspace', async () => {
    const routes = await routesFor('admin')
    expect(is404(routes, '/login')).toBe(false)
    expect(is404(routes, '/admin/withdrawal-requests')).toBe(false)
    expect(is404(routes, '/agent/dashboard')).toBe(false)
  })

  it('does not mount /register — staff accounts are created by an admin', async () => {
    const routes = await routesFor('admin')
    expect(is404(routes, '/register')).toBe(true)
  })

  it('does not mount marketing, portal or partner', async () => {
    const routes = await routesFor('admin')
    expect(is404(routes, '/about')).toBe(true)
    expect(is404(routes, '/portal/dashboard')).toBe(true)
    expect(is404(routes, '/partner/dashboard')).toBe(true)
  })
})
