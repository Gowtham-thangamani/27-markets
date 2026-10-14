import { authRoutes } from '../authRoutes'
import { portalRoutes } from '../portalRoutes'

/** Client portal. Clients are the only role that self-registers. */
export function surfaceRoutes() {
  return (
    <>
      {authRoutes({ withSignup: true })}
      {portalRoutes()}
    </>
  )
}
