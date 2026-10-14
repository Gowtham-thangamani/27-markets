import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { surfaceRoutes } from '@surface-routes'

const NotFoundPage = lazy(() => import('../pages/NotFoundPage'))

/**
 * The route tree for this build.
 *
 * `@surface-routes` is a build-time alias (vite.config.ts) that resolves to one
 * module under src/routes/surfaces/, chosen by VITE_SURFACE. Only that surface's
 * routes are ever imported, so another surface's page chunks cannot be emitted —
 * isolation holds by construction rather than by tree-shaking, which does not
 * work here (see the comment in vite.config.ts).
 *
 * Kept separate from App so it can be matched against directly in tests without
 * rendering the five context providers App lives under.
 */
export function appRoutes() {
  return (
    <>
      {surfaceRoutes()}
      <Route path="*" element={<NotFoundPage />} />
    </>
  )
}
