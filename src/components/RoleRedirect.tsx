import { Navigate } from 'react-router-dom'
import type { AppRole } from '@/lib/types'
import { landingUrlForRole } from '@/lib/roles'
import { ExternalRedirect } from '@/routes/ExternalRedirect'

/**
 * Sends a user to their own home, wherever it lives.
 *
 * Route guards used to `<Navigate>` to a hardcoded path — RequireStaff sent a
 * non-staff user to /portal/dashboard. With surfaces split across hostnames that
 * path does not exist in the admin build, so the user landed on the 404 page
 * with no way back. This picks an in-app navigation or a cross-host redirect
 * depending on where the role's pages actually are.
 */
export function RoleRedirect({ role }: { role: AppRole }) {
  const dest = landingUrlForRole(role)
  return dest.startsWith('https://') ? (
    <ExternalRedirect to={dest} />
  ) : (
    <Navigate to={dest} replace />
  )
}
