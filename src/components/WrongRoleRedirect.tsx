import { Navigate, useLocation } from 'react-router-dom'

/**
 * Sent here when a signed-in user opens an area their role cannot enter.
 *
 * These paths are shareable URLs — /partner is handed to IB partners, /admin to
 * staff — so the person following one usually needs a DIFFERENT account, not
 * their own dashboard. The guards used to <Navigate> straight to the user's own
 * home, which looked exactly like a broken link: you clicked /partner and
 * landed on the admin dashboard with no explanation.
 *
 * Going to /login instead lets them sign in with the right account, and
 * `from` returns them to the page they were aiming for. LoginPage reads
 * `needRole` to say what happened and offers a way back to their own area.
 */
export function WrongRoleRedirect({ need }: { need: string }) {
  const location = useLocation()
  return (
    <Navigate
      to="/login"
      state={{ from: `${location.pathname}${location.search}`, needRole: need }}
      replace
    />
  )
}
