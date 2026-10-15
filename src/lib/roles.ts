import type { AppRole } from './types'
import { HOST_FOR_SURFACE, SURFACE, type Surface } from './surface'

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

/**
 * Which surface's build contains this role's pages.
 * AGENT lives in the admin build — it is a staff role and shares that host.
 */
export const surfaceForRole = (role: AppRole): Exclude<Surface, 'all'> => {
  if (isPartnerRole(role)) return 'partner'
  if (isStaffRole(role)) return 'admin'
  return 'portal'
}

/**
 * Where to send a user after login, as a URL rather than a path.
 *
 * Surfaces are split across hostnames, so a path is no longer enough: a CLIENT
 * signing in on admin.27markets.com cannot be sent to /portal/dashboard, because
 * that route does not exist in the admin build. Roles belonging to this build get
 * a relative path (no reload); roles belonging elsewhere get an absolute URL.
 */
export const landingUrlForRole = (role: AppRole, build: Surface = SURFACE): string => {
  const path = landingPathForRole(role)
  const target = surfaceForRole(role)
  if (build === 'all' || build === target) return path
  return `${HOST_FOR_SURFACE[target]}${path}`
}

/**
 * Does this role satisfy the requirement a guard stated when it sent the user
 * to /login? The labels come from WrongRoleRedirect.
 */
export const roleSatisfies = (role: AppRole, need: string): boolean => {
  if (need === 'partner') return isPartnerRole(role)
  if (need === 'staff') return isStaffRole(role)
  if (need === 'agent') return isAgentRole(role)
  return true
}

/**
 * Where to send someone immediately after they sign in.
 *
 * A guard that refuses entry records the page it refused, so a user who then
 * signs in with the right account lands where they were heading. But if they
 * sign in with an account that STILL cannot get in — an admin entering their
 * own credentials on the IB portal's login page — returning them there just
 * bounces them back to /login, with no way out. So the remembered page is only
 * honoured when the role actually satisfies what the guard asked for.
 */
export const destinationAfterLogin = (
  role: AppRole,
  { from, needRole, build = SURFACE }: { from?: string; needRole?: string; build?: Surface } = {},
): string => {
  const mayReturn = Boolean(from) && (!needRole || roleSatisfies(role, needRole))
  const sameBuild = build === 'all' || surfaceForRole(role) === build
  return mayReturn && sameBuild ? (from as string) : landingUrlForRole(role, build)
}
