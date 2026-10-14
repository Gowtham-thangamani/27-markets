import { useEffect } from 'react'

/**
 * Leaves the SPA entirely, for a route whose destination lives on another host.
 *
 * React Router's <Navigate> can only reach routes in this build, so on the
 * marketing site an alias like /ib-portal would fall through to the 404 page —
 * the partner portal is a different bundle on a different hostname.
 */
export function ExternalRedirect({ to }: { to: string }) {
  useEffect(() => {
    window.location.replace(to)
  }, [to])
  return null
}
