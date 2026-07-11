import type { AppRole } from './types'

/** Roles that may access the CRM admin area. Mirrors the backend STAFF_ROLES. */
export const isStaffRole = (role: AppRole): boolean => role === 'ADMIN' || role === 'AGENT'

export const isPartnerRole = (role: AppRole): boolean => role === 'PARTNER'

/** Agents get a focused workspace; they remain staff (can still reach the CRM). */
export const isAgentRole = (role: AppRole): boolean => role === 'AGENT'

export const isAdminRole = (role: AppRole): boolean => role === 'ADMIN'

/** Where each role lands after login. */
export const landingPathForRole = (role: AppRole): string => {
  if (isAgentRole(role)) return '/agent/dashboard'
  if (isStaffRole(role)) return '/admin/dashboard'
  if (isPartnerRole(role)) return '/partner/dashboard'
  return '/portal/dashboard'
}
