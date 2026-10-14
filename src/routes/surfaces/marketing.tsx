import { Route, useLocation } from 'react-router-dom'
import { marketingRoutes } from '../marketingRoutes'
import { ExternalRedirect } from '../ExternalRedirect'
import { HOST_FOR_SURFACE } from '../../lib/surface'

/**
 * Hands the current path and query to the portal host unchanged, so
 * /register?account=pro keeps its selection across the hop.
 */
function ToPortal() {
  const { pathname, search } = useLocation()
  return <ExternalRedirect to={`${HOST_FOR_SURFACE.portal}${pathname}${search}`} />
}

/**
 * Public marketing site. Imports no authenticated route module, so none of
 * their page chunks can reach this build.
 *
 * The auth and portal paths below are NOT pages — they are hand-offs. The
 * marketing chrome links to them from the Navbar, the hero CTAs, the footer and
 * every account-tier card; those pages live in the portal build, so without
 * these routes the site's entire signup and login funnel would hit the 404 page.
 */
export function surfaceRoutes() {
  return (
    <>
      {marketingRoutes()}
      <Route path="/login" element={<ToPortal />} />
      <Route path="/register" element={<ToPortal />} />
      <Route path="/demo" element={<ToPortal />} />
      <Route path="/verify-email" element={<ToPortal />} />
      <Route path="/forgot-password" element={<ToPortal />} />
      <Route path="/reset-password" element={<ToPortal />} />
      <Route path="/portal/*" element={<ToPortal />} />
    </>
  )
}
