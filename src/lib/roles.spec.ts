import { it, expect } from 'vitest'
import { isPartnerRole, landingPathForRole } from './roles'

it('isPartnerRole is true only for PARTNER', () => {
  expect(isPartnerRole('PARTNER')).toBe(true)
  expect(isPartnerRole('CLIENT')).toBe(false)
  expect(isPartnerRole('ADMIN')).toBe(false)
})

it('landingPathForRole maps each role to its home', () => {
  expect(landingPathForRole('CLIENT')).toBe('/portal/dashboard')
  expect(landingPathForRole('PARTNER')).toBe('/partner/dashboard')
  expect(landingPathForRole('ADMIN')).toBe('/admin/dashboard')
  expect(landingPathForRole('AGENT')).toBe('/admin/dashboard')
})
