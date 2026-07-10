import { describe, it, expect } from 'vitest'
import { adminNav, isGroup, placeholderLinks, navLabelFor } from './adminNav'

describe('adminNav', () => {
  it('has unique `to` paths across all links', () => {
    const tos = adminNav.flatMap((e) => (isGroup(e) ? e.children.map((c) => c.to) : [e.to]))
    expect(new Set(tos).size).toBe(tos.length)
  })

  it('every group has at least one child', () => {
    adminNav.filter(isGroup).forEach((g) => expect(g.children.length).toBeGreaterThan(0))
  })

  it('preserves the existing real paths', () => {
    const tos = new Set(adminNav.flatMap((e) => (isGroup(e) ? e.children.map((c) => c.to) : [e.to])))
    for (const p of ['/admin/dashboard', '/admin/reports', '/admin/staff', '/admin/clients',
      '/admin/leads', '/admin/kyc', '/admin/finance', '/admin/accounts', '/admin/partners',
      '/admin/partner-applications', '/admin/blog', '/admin/support']) {
      expect(tos.has(p)).toBe(true)
    }
  })

  it('placeholderLinks returns only placeholder-flagged links', () => {
    const links = placeholderLinks()
    // May be empty (all sections are built) — but every entry must be a placeholder.
    expect(links.every((l) => l.placeholder === true)).toBe(true)
  })

  it('navLabelFor resolves a known path and returns undefined for unknown', () => {
    expect(navLabelFor('/admin/clients')).toBe('Clients')
    expect(navLabelFor('/admin/payment-gateways')).toBe('Payment Gateways')
    expect(navLabelFor('/admin/nope')).toBeUndefined()
  })
})
