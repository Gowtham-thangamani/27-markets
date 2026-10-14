import { describe, expect, it } from 'vitest'
import { HOST_FOR_SURFACE, isSurface, resolveSurface } from './surface'

describe('resolveSurface', () => {
  it('defaults to "all" when unset, so the current bundle is unchanged', () => {
    expect(resolveSurface(undefined)).toBe('all')
    expect(resolveSurface('')).toBe('all')
  })

  it('accepts each known surface', () => {
    for (const s of ['marketing', 'portal', 'partner', 'admin', 'all']) {
      expect(resolveSurface(s)).toBe(s)
    }
  })

  it('throws on an unrecognised surface rather than mounting nothing', () => {
    expect(() => resolveSurface('partners')).toThrow(/unknown VITE_SURFACE/i)
    expect(() => resolveSurface('Admin')).toThrow(/unknown VITE_SURFACE/i)
  })
})

describe('isSurface', () => {
  it('matches the exact surface', () => {
    expect(isSurface('admin', 'admin')).toBe(true)
    expect(isSurface('admin', 'portal')).toBe(false)
  })

  it('"all" includes every surface', () => {
    expect(isSurface('all', 'admin')).toBe(true)
    expect(isSurface('all', 'marketing')).toBe(true)
  })
})

describe('HOST_FOR_SURFACE', () => {
  it('maps every non-"all" surface to an absolute https origin', () => {
    expect(HOST_FOR_SURFACE.marketing).toBe('https://27markets.com')
    expect(HOST_FOR_SURFACE.portal).toBe('https://portal.27markets.com')
    expect(HOST_FOR_SURFACE.partner).toBe('https://partners.27markets.com')
    expect(HOST_FOR_SURFACE.admin).toBe('https://admin.27markets.com')
  })
})
