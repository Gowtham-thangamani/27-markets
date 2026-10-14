import { describe, expect, it } from 'vitest'
import { createRoutesFromChildren, matchRoutes, type RouteObject } from 'react-router-dom'
import { surfaceRoutes as marketing } from './marketing'
import { surfaceRoutes as portal } from './portal'
import { surfaceRoutes as partner } from './partner'
import { surfaceRoutes as admin } from './admin'
import { surfaceRoutes as all } from './all'

/**
 * Each surface is its own module graph — the build aliases one of these as the
 * app's route tree, so a surface never imports another's routes. Testing them
 * directly (rather than stubbing VITE_SURFACE and re-importing) matches how the
 * build actually selects one, and needs no env juggling.
 */
function tree(routes: () => JSX.Element): RouteObject[] {
  return createRoutesFromChildren(routes())
}

function is404(routes: RouteObject[], path: string): boolean {
  const matches = matchRoutes(routes, path)
  if (!matches || matches.length === 0) return true
  return matches[matches.length - 1].route.path === '*'
}

describe('all — the combined build, unchanged from before the split', () => {
  it('mounts every surface so the existing deployment keeps working', () => {
    const routes = tree(all)
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

describe('marketing', () => {
  it('mounts the public site including the IB application', () => {
    const routes = tree(marketing)
    expect(is404(routes, '/')).toBe(false)
    expect(is404(routes, '/partnership')).toBe(false)
    expect(is404(routes, '/partner/apply')).toBe(false)
  })

  it('mounts no authenticated routes', () => {
    const routes = tree(marketing)
    expect(is404(routes, '/portal/dashboard')).toBe(true)
    expect(is404(routes, '/partner/dashboard')).toBe(true)
    expect(is404(routes, '/admin/dashboard')).toBe(true)
  })

  it('has no auth pages — it links to the portal host for sign-in', () => {
    const routes = tree(marketing)
    expect(is404(routes, '/login')).toBe(true)
    expect(is404(routes, '/register')).toBe(true)
  })
})

describe('portal', () => {
  it('mounts login, signup and the client portal', () => {
    const routes = tree(portal)
    expect(is404(routes, '/login')).toBe(false)
    expect(is404(routes, '/register')).toBe(false)
    expect(is404(routes, '/portal/funds')).toBe(false)
  })

  it('mounts nothing from marketing, partner or admin', () => {
    const routes = tree(portal)
    expect(is404(routes, '/about')).toBe(true)
    expect(is404(routes, '/partner/dashboard')).toBe(true)
    expect(is404(routes, '/admin/dashboard')).toBe(true)
  })
})

describe('partner', () => {
  it('mounts login and the IB portal', () => {
    const routes = tree(partner)
    expect(is404(routes, '/login')).toBe(false)
    expect(is404(routes, '/partner/commissions')).toBe(false)
    expect(is404(routes, '/partner/sub-partners')).toBe(false)
  })

  it('does not mount /register — partners apply and are approved in the CRM', () => {
    expect(is404(tree(partner), '/register')).toBe(true)
  })

  it('mounts nothing from marketing, portal or admin', () => {
    const routes = tree(partner)
    expect(is404(routes, '/about')).toBe(true)
    expect(is404(routes, '/portal/dashboard')).toBe(true)
    expect(is404(routes, '/admin/dashboard')).toBe(true)
  })
})

describe('admin', () => {
  it('mounts login, the CRM and the agent workspace', () => {
    const routes = tree(admin)
    expect(is404(routes, '/login')).toBe(false)
    expect(is404(routes, '/admin/withdrawal-requests')).toBe(false)
    expect(is404(routes, '/agent/leads')).toBe(false)
  })

  it('does not mount /register — staff accounts are created by an admin', () => {
    expect(is404(tree(admin), '/register')).toBe(true)
  })

  it('mounts nothing from marketing, portal or partner', () => {
    const routes = tree(admin)
    expect(is404(routes, '/about')).toBe(true)
    expect(is404(routes, '/portal/dashboard')).toBe(true)
    expect(is404(routes, '/partner/dashboard')).toBe(true)
  })
})
