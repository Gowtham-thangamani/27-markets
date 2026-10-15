import { describe, expect, it } from 'vitest'
import { IB_DASHBOARD } from './marketingRoutes'

describe('IB alias target', () => {
  // VITE_SURFACE is unset under test, i.e. the combined build that
  // 27markets.com/staging/ serves. The partner routes ARE in that bundle, so
  // the alias must stay internal — pointing it at partners.27markets.com would
  // send visitors to a hostname that has no DNS record.
  it('is a relative path on the combined build', () => {
    expect(IB_DASHBOARD).toBe('/partner/dashboard')
    expect(IB_DASHBOARD.startsWith('https://')).toBe(false)
  })
})
