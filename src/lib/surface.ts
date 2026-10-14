/**
 * Which slice of the app this build contains, and where the other slices live.
 *
 * NOTE ON THE MECHANISM: isolation is achieved by the '@surface-routes' alias in
 * vite.config.ts, which puts exactly one surface's routes in the module graph.
 * It is NOT achieved by tree-shaking these values — that was tried and does not
 * work, because every route module calls lazy(() => import(...)) at module scope
 * and Rollup treats that as a side effect, retaining the module and emitting all
 * its chunks. Do not add `SURFACE === 'x' && <Route .../>` gates here and expect
 * the other branch to disappear; it will not.
 *
 * What lives here is runtime-only: which surface this build is, and the host map
 * used to send a user to a surface that is not this one.
 */
export type Surface = 'marketing' | 'portal' | 'partner' | 'admin' | 'all'

const KNOWN: readonly Surface[] = ['marketing', 'portal', 'partner', 'admin', 'all']

/**
 * Validates the raw env value. Exported for testing.
 * Throws on a typo rather than silently mounting nothing — a build that ships
 * zero routes looks like a blank white page, which is far harder to diagnose
 * than a failed build.
 */
export function resolveSurface(raw: string | undefined): Surface {
  if (!raw) return 'all'
  if (!KNOWN.includes(raw as Surface)) {
    throw new Error(`Unknown VITE_SURFACE "${raw}". Expected one of: ${KNOWN.join(', ')}`)
  }
  return raw as Surface
}

/** Does `build` contain `target`'s routes? 'all' contains everything. */
export function isSurface(build: Surface, target: Surface): boolean {
  return build === 'all' || build === target
}

export const SURFACE: Surface = resolveSurface(
  import.meta.env.VITE_SURFACE as string | undefined,
)

/**
 * Where each surface lives. Overridable per environment so `npm run dev` and a
 * preview host do not bounce users into production: without the overrides a
 * developer running VITE_SURFACE=admin locally and signing in as a client would
 * be sent to https://portal.27markets.com.
 *
 * Note the partner key is singular while its host is plural.
 */
export const HOST_FOR_SURFACE: Record<Exclude<Surface, 'all'>, string> = {
  marketing: import.meta.env.VITE_HOST_MARKETING ?? 'https://27markets.com',
  portal: import.meta.env.VITE_HOST_PORTAL ?? 'https://portal.27markets.com',
  partner: import.meta.env.VITE_HOST_PARTNER ?? 'https://partners.27markets.com',
  admin: import.meta.env.VITE_HOST_ADMIN ?? 'https://admin.27markets.com',
}
