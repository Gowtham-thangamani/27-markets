import { marketingRoutes } from '../marketingRoutes'

/**
 * Public marketing site. Imports no authenticated route module, so none of
 * their page chunks can reach this build.
 */
export function surfaceRoutes() {
  return <>{marketingRoutes()}</>
}
