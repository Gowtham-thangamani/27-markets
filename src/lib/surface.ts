/**
 * Which slice of the app this build contains. Chosen at build time via
 * VITE_SURFACE so Rollup can fold the comparisons to literals and drop the
 * route trees that don't apply — that is what keeps admin code out of the
 * public bundle.
 *
 * Unset => 'all' => every route mounts, identical to the pre-split bundle.
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
 * Where each surface lives in production. Used for cross-host redirects when a
 * user's role belongs to a different host than the one they signed in on.
 * Note the partner key is singular while its host is plural.
 */
export const HOST_FOR_SURFACE: Record<Exclude<Surface, 'all'>, string> = {
  marketing: 'https://27markets.com',
  portal: 'https://portal.27markets.com',
  partner: 'https://partners.27markets.com',
  admin: 'https://admin.27markets.com',
}
