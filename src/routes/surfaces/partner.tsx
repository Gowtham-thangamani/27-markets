import { Navigate, Route } from 'react-router-dom'
import { authRoutes } from '../authRoutes'
import { partnerRoutes } from '../partnerRoutes'

/**
 * IB partner portal. No signup: partners apply via /partner/apply on the
 * marketing site and are approved in the CRM.
 *
 * "/" is mounted so the logo and 404 recovery links have somewhere to go; an
 * unauthenticated visitor falls through RequirePartner to /login.
 */
export function surfaceRoutes() {
  return (
    <>
      <Route path="/" element={<Navigate to="/partner/dashboard" replace />} />
      {authRoutes({ withSignup: false })}
      {partnerRoutes()}
    </>
  )
}
