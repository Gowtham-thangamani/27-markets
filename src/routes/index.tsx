import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { resolveSurface } from '../lib/surface'
import { marketingRoutes } from './marketingRoutes'
import { authRoutes } from './authRoutes'
import { portalRoutes } from './portalRoutes'
import { partnerRoutes } from './partnerRoutes'
import { adminRoutes } from './adminRoutes'

const NotFoundPage = lazy(() => import('../pages/NotFoundPage'))

/**
 * The gate below MUST compare `import.meta.env.VITE_SURFACE` directly.
 *
 * Vite replaces that expression with a string literal at build time, so these
 * comparisons fold to true/false and Rollup drops the unreachable route modules
 * along with their lazy() chunks. Routing the value through the helpers in
 * src/lib/surface.ts instead — `isSurface(SURFACE, 'admin')` — hides it behind
 * two function calls that Rollup will not evaluate, and nothing is eliminated:
 * measured at 167 chunks for every surface, i.e. the admin CRM still shipped to
 * the public site. Those helpers remain correct for runtime use (roles.ts needs
 * them); they are simply useless as a build-time gate.
 *
 * Keep this file free of indirection. scripts/check-bundle-isolation.mjs is the
 * deploy gate that proves it still works.
 */
const S = import.meta.env.VITE_SURFACE || 'all'

/** Throws on an unrecognised value so a typo fails the build loudly. */
resolveSurface(import.meta.env.VITE_SURFACE as string | undefined)

const SHOW_MARKETING = S === 'marketing' || S === 'all'
const SHOW_PORTAL = S === 'portal' || S === 'all'
const SHOW_PARTNER = S === 'partner' || S === 'all'
const SHOW_ADMIN = S === 'admin' || S === 'all'
/** Marketing has no auth pages — it links to the portal host for sign-in. */
const SHOW_AUTH = S !== 'marketing'
/** Only clients self-register: partners apply, staff are created by an admin. */
const WITH_SIGNUP = S === 'portal' || S === 'all'

/**
 * The route tree for this build.
 *
 * Kept separate from App so it can be matched against directly in tests without
 * rendering the five context providers App lives under.
 */
export function appRoutes() {
  return (
    <>
      {SHOW_MARKETING && marketingRoutes()}
      {SHOW_AUTH && authRoutes({ withSignup: WITH_SIGNUP })}
      {SHOW_PORTAL && portalRoutes()}
      {SHOW_PARTNER && partnerRoutes()}
      {SHOW_ADMIN && adminRoutes()}
      <Route path="*" element={<NotFoundPage />} />
    </>
  )
}
