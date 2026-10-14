import { marketingRoutes } from '../marketingRoutes'
import { authRoutes } from '../authRoutes'
import { portalRoutes } from '../portalRoutes'
import { partnerRoutes } from '../partnerRoutes'
import { adminRoutes } from '../adminRoutes'

/**
 * Every surface in one build — the pre-split bundle, and the default when
 * VITE_SURFACE is unset. This is what keeps the existing deployment working.
 */
export function surfaceRoutes() {
  return (
    <>
      {marketingRoutes()}
      {authRoutes()}
      {portalRoutes()}
      {partnerRoutes()}
      {adminRoutes()}
    </>
  )
}
