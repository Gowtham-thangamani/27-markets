/**
 * Proves a surface build contains its own code and no other surface's.
 *
 * The split relies on the '@surface-routes' alias in vite.config.ts putting one
 * surface's routes in the module graph. That is a config property, and config
 * breaks quietly — a stale vite.config.js shadowing the real one, a barrel file
 * re-exporting a sibling, an empty surface module — any of which would ship the
 * admin CRM to the public site with no visible symptom. This is the deploy gate.
 *
 * Three checks:
 *   1. Foreign chunk filenames — a foreign page chunk existing proves it was
 *      emitted. This is the main security property.
 *   2. Foreign content strings — catches foreign code inlined into a shared
 *      chunk rather than split out, and modules that are not pages at all
 *      (src/lib/adminApi.ts holds ~400 back-office endpoints and is not named
 *      *Page-, so the filename check alone is blind to it).
 *   3. Own chunks present — "no foreign code" is satisfied by an empty bundle,
 *      so the surface's own pages must actually be there.
 *
 * Usage:  node scripts/check-bundle-isolation.mjs <surface> [distDir]
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Page chunks and content strings that belong to exactly one surface.
 *
 * Two marketing pages start with "Partner" and are deliberately excluded from
 * the `partner` pattern: PartnerApplyPage (the public IB application form) and
 * PartnershipPage (the /partnership marketing page). Both are public.
 *
 * `strings` deliberately holds no /portal/ path: the marketing build legitimately
 * contains /portal/* as a hand-off route to the portal host, so a /portal/ needle
 * would fire on a correct build.
 */
const SENTINELS = {
  marketing: {
    chunks: [
      /^(Home|About|Markets|Platforms|Accounts|TradingConditions|Funding|Trust|Faq|EconomicCalendar|Partnership|PartnerApply|Contact|BlogList|BlogDetail|Disclaimer|Legal)Page-/,
    ],
    strings: [],
  },
  portal: {
    chunks: [/^(Dashboard|Trade|Funds|Kyc|PortalAccounts|Downloads|Profile|Support)Page-/],
    strings: [],
  },
  partner: {
    chunks: [/^Partner(?!Apply|ship)[A-Za-z]*Page-/],
    strings: ['partner/sub-partners', '/partner/commissions'],
  },
  admin: {
    chunks: [/^(Admin[A-Za-z]*|Agent[A-Za-z]*)Page-/],
    strings: ['admin/withdrawal-requests', '/admin/clients', '/admin/leads'],
  },
}

/** Every .js file under dir, recursively, as {name, path} pairs. */
function jsFiles(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...jsFiles(full))
    else if (entry.endsWith('.js')) out.push({ name: entry, path: full })
  }
  return out
}

/**
 * @param {string} surface  the surface this bundle was built for
 * @param {string} distDir  the build output directory
 * @returns {{ok: boolean, leaks: string[]}}
 */
export function checkIsolation(surface, distDir) {
  if (surface === 'all') return { ok: true, leaks: [] }

  let files
  try {
    files = jsFiles(distDir)
  } catch (err) {
    return { ok: false, leaks: [`Could not scan ${distDir}: ${err.message}`] }
  }

  if (files.length === 0) {
    return { ok: false, leaks: [`No JavaScript files found under ${distDir} — nothing was scanned`] }
  }

  const leaks = []

  // 1 + 2: foreign code. Reported first so the message names the actual leak.
  const foreign = Object.entries(SENTINELS).filter(([name]) => name !== surface)
  for (const [owner, { chunks, strings }] of foreign) {
    for (const file of files) {
      if (chunks.some((re) => re.test(file.name))) {
        leaks.push(`chunk ${file.name} belongs to "${owner}"`)
      }
    }
    if (strings.length === 0) continue
    for (const file of files) {
      const body = readFileSync(file.path, 'utf8')
      for (const needle of strings) {
        if (body.includes(needle)) {
          leaks.push(`string "${needle}" (owned by "${owner}") found in ${file.name}`)
        }
      }
    }
  }

  // 3: this surface's own code must be present, or the check proved nothing.
  const own = SENTINELS[surface]
  if (own) {
    const mine = files.filter((f) => own.chunks.some((re) => re.test(f.name)))
    if (mine.length === 0) {
      leaks.push(
        `No own chunks found for surface "${surface}" — the bundle is empty or built the wrong surface`,
      )
    }
  }

  return { ok: leaks.length === 0, leaks }
}

const invokedDirectly =
  process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())

if (invokedDirectly) {
  const [surface, distDir = 'dist'] = process.argv.slice(2)
  if (!surface) {
    console.error('Usage: node scripts/check-bundle-isolation.mjs <surface> [distDir]')
    process.exit(2)
  }
  const { ok, leaks } = checkIsolation(surface, distDir)
  if (!ok) {
    console.error(`\nBundle isolation FAILED for surface "${surface}":`)
    for (const leak of leaks.slice(0, 25)) console.error(`  - ${leak}`)
    if (leaks.length > 25) console.error(`  ...and ${leaks.length - 25} more`)
    process.exit(1)
  }
  console.log(`Bundle isolation OK for surface "${surface}"`)
}
