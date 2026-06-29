import type { AppRole } from './types'

/** Roles that may access the CRM admin area. Mirrors the backend STAFF_ROLES. */
export const isStaffRole = (role: AppRole): boolean => role === 'ADMIN' || role === 'AGENT'

export const isPartnerRole = (role: AppRole): boolean => role === 'PARTNER'

/** Where each role lands after login. */
export const landingPathForRole = (role: AppRole): string => {
  if (isStaffRole(role)) return '/admin/dashboard'
  if (isPartnerRole(role)) return '/partner/dashboard'
  return '/portal/dashboard'
}
