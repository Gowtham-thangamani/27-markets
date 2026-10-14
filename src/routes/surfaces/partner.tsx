import { authRoutes } from '../authRoutes'
import { partnerRoutes } from '../partnerRoutes'

/**
 * IB partner portal. No signup: partners apply via /partner/apply on the
 * marketing site and are approved in the CRM.
 */
export function surfaceRoutes() {
  return (
    <>
      {authRoutes({ withSignup: false })}
      {partnerRoutes()}
    </>
  )
}
