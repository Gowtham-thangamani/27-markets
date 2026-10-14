import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { marketingRoutes } from './marketingRoutes'
import { authRoutes } from './authRoutes'
import { portalRoutes } from './portalRoutes'
import { partnerRoutes } from './partnerRoutes'
import { adminRoutes } from './adminRoutes'

const NotFoundPage = lazy(() => import('../pages/NotFoundPage'))

/**
 * The route tree for this build.
 *
 * Kept separate from App so it can be matched against directly in tests without
 * rendering the five context providers App lives under.
 */
export function appRoutes() {
  return (
    <>
      {marketingRoutes()}
      {authRoutes()}
      {portalRoutes()}
      {partnerRoutes()}
      {adminRoutes()}
      <Route path="*" element={<NotFoundPage />} />
    </>
  )
}
