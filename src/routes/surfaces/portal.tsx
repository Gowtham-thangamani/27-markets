import { Navigate, Route } from 'react-router-dom'
import { authRoutes } from '../authRoutes'
import { portalRoutes } from '../portalRoutes'

/**
 * Client portal. Clients are the only role that self-registers.
 *
 * "/" is mounted because AuthShell, the portal sidebar logo and NotFoundPage all
 * link to it; without it the 404 page's only recovery control renders the 404
 * page again. An unauthenticated visitor falls through RequireAuth to /login.
 */
export function surfaceRoutes() {
  return (
    <>
      <Route path="/" element={<Navigate to="/portal/dashboard" replace />} />
      {authRoutes({ withSignup: true })}
      {portalRoutes()}
    </>
  )
}
