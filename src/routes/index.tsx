import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { SURFACE, isSurface } from '../lib/surface'
import { marketingRoutes } from './marketingRoutes'
import { authRoutes } from './authRoutes'
import { portalRoutes } from './portalRoutes'
import { partnerRoutes } from './partnerRoutes'
import { adminRoutes } from './adminRoutes'

const NotFoundPage = lazy(() => import('../pages/NotFoundPage'))

/**
 * Marketing is the only surface with no auth pages — it links to the portal
 * host for sign-in. Only the client portal offers self-registration: partners
 * apply via /partner/apply and staff accounts are created by an admin.
 *
 * These three constants fold to literals at build time (SURFACE comes from
 * VITE_SURFACE), which is what lets Rollup drop the route modules a surface
 * does not use — see scripts/check-bundle-isolation.mjs for the proof.
 */
const showMarketing = isSurface(SURFACE, 'marketing')
const showAuth = SURFACE !== 'marketing'
const withSignup = isSurface(SURFACE, 'portal')

/**
 * The route tree for this build.
 *
 * Kept separate from App so it can be matched against directly in tests without
 * rendering the five context providers App lives under.
 */
export function appRoutes() {
  return (
    <>
      {showMarketing && marketingRoutes()}
      {showAuth && authRoutes({ withSignup })}
      {isSurface(SURFACE, 'portal') && portalRoutes()}
      {isSurface(SURFACE, 'partner') && partnerRoutes()}
      {isSurface(SURFACE, 'admin') && adminRoutes()}
      <Route path="*" element={<NotFoundPage />} />
    </>
  )
}
