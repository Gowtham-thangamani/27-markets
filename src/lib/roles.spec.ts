import { describe, it, expect } from 'vitest'
import {
  destinationAfterLogin,
  isPartnerRole,
  landingPathForRole,
  landingUrlForRole,
  surfaceForRole,
} from './roles'

it('isPartnerRole is true only for PARTNER', () => {
  expect(isPartnerRole('PARTNER')).toBe(true)
  expect(isPartnerRole('CLIENT')).toBe(false)
  expect(isPartnerRole('ADMIN')).toBe(false)
})

it('landingPathForRole maps each role to its home', () => {
  expect(landingPathForRole('CLIENT')).toBe('/portal/dashboard')
  expect(landingPathForRole('PARTNER')).toBe('/partner/dashboard')
  expect(landingPathForRole('ADMIN')).toBe('/admin/dashboard')
  expect(landingPathForRole('AGENT')).toBe('/agent/dashboard')
})

describe('surfaceForRole', () => {
  it('maps each role to the surface that holds its pages', () => {
    expect(surfaceForRole('CLIENT')).toBe('portal')
    expect(surfaceForRole('PARTNER')).toBe('partner')
    expect(surfaceForRole('ADMIN')).toBe('admin')
    expect(surfaceForRole('AGENT')).toBe('admin')
  })
})

describe('landingUrlForRole — same surface', () => {
  it('returns a relative path, so no page reload happens', () => {
    expect(landingUrlForRole('ADMIN', 'admin')).toBe('/admin/dashboard')
    expect(landingUrlForRole('AGENT', 'admin')).toBe('/agent/dashboard')
    expect(landingUrlForRole('PARTNER', 'partner')).toBe('/partner/dashboard')
    expect(landingUrlForRole('CLIENT', 'portal')).toBe('/portal/dashboard')
  })

  it('returns a relative path on the combined build', () => {
    expect(landingUrlForRole('PARTNER', 'all')).toBe('/partner/dashboard')
    expect(landingUrlForRole('ADMIN', 'all')).toBe('/admin/dashboard')
    expect(landingUrlForRole('CLIENT', 'all')).toBe('/portal/dashboard')
  })
})

describe('landingUrlForRole — different surface', () => {
  it('returns an absolute URL on the host that actually has those routes', () => {
    expect(landingUrlForRole('CLIENT', 'admin')).toBe(
      'https://portal.27markets.com/portal/dashboard',
    )
    expect(landingUrlForRole('PARTNER', 'admin')).toBe(
      'https://partners.27markets.com/partner/dashboard',
    )
    expect(landingUrlForRole('ADMIN', 'partner')).toBe(
      'https://admin.27markets.com/admin/dashboard',
    )
    expect(landingUrlForRole('AGENT', 'portal')).toBe(
      'https://admin.27markets.com/agent/dashboard',
    )
  })

  it('never points back at the host it was called from', () => {
    // Two hosts each redirecting to the other would bounce the user forever.
    const hostFor = { portal: 'portal.', partner: 'partners.', admin: 'admin.' }
    for (const build of ['portal', 'partner', 'admin'] as const) {
      for (const role of ['CLIENT', 'PARTNER', 'ADMIN', 'AGENT'] as const) {
        const url = landingUrlForRole(role, build)
        if (url.startsWith('https://')) {
          expect(url.startsWith(`https://${hostFor[build]}`)).toBe(false)
        }
      }
    }
  })

  it('sends a client away from the marketing build rather than 404ing', () => {
    expect(landingUrlForRole('CLIENT', 'marketing')).toBe(
      'https://portal.27markets.com/portal/dashboard',
    )
  })
})

describe('destinationAfterLogin', () => {
  it('returns the user to where they were heading when their role can get in', () => {
    expect(
      destinationAfterLogin('PARTNER', { from: '/partner/clients', needRole: 'partner', build: 'all' }),
    ).toBe('/partner/clients')
  })

  it('does NOT return a wrong-role user to the page that rejected them', () => {
    // Signing in as admin on the IB portal's login page used to send them back
    // to /partner/dashboard, where RequirePartner bounced them to /login again
    // — an unescapable loop. They belong on the admin dashboard.
    expect(
      destinationAfterLogin('ADMIN', { from: '/partner/dashboard', needRole: 'partner', build: 'all' }),
    ).toBe('/admin/dashboard')
    expect(
      destinationAfterLogin('CLIENT', { from: '/admin/leads', needRole: 'staff', build: 'all' }),
    ).toBe('/portal/dashboard')
  })

  it('treats AGENT as satisfying a staff requirement', () => {
    expect(
      destinationAfterLogin('AGENT', { from: '/admin/leads', needRole: 'staff', build: 'all' }),
    ).toBe('/admin/leads')
  })

  it('honours a plain "from" with no role requirement', () => {
    expect(destinationAfterLogin('CLIENT', { from: '/portal/funds', build: 'all' })).toBe('/portal/funds')
  })

  it('falls back to the role landing page when there is no "from"', () => {
    expect(destinationAfterLogin('PARTNER', { build: 'all' })).toBe('/partner/dashboard')
  })
})
