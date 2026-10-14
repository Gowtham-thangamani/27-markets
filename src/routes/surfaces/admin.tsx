import { authRoutes } from '../authRoutes'
import { adminRoutes } from '../adminRoutes'

/**
 * Staff back-office and agent workspace. No signup: staff accounts are created
 * by an admin.
 */
export function surfaceRoutes() {
  return (
    <>
      {authRoutes({ withSignup: false })}
      {adminRoutes()}
    </>
  )
}
