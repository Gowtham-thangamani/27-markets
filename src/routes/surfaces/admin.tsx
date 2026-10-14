import { Navigate, Route } from 'react-router-dom'
import { authRoutes } from '../authRoutes'
import { adminRoutes } from '../adminRoutes'

/**
 * Staff back-office and agent workspace. No signup: staff accounts are created
 * by an admin.
 *
 * "/" is mounted so typing the bare hostname reaches the sign-in flow rather
 * than a 404 whose only button re-renders the 404.
 */
export function surfaceRoutes() {
  return (
    <>
      <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
      {authRoutes({ withSignup: false })}
      {adminRoutes()}
    </>
  )
}
