/**
 * Proves a surface build does not contain another surface's code.
 *
 * The split relies on Rollup eliminating the route modules a surface doesn't
 * use. That is an assumption about a bundler, and assumptions about bundlers
 * break quietly — a stray eager import or a barrel file re-exporting a sibling
 * is enough to put the whole admin tree back into the public bundle with no
 * visible symptom. This turns the assumption into a deploy gate.
 *
 * Two independent checks:
 *   1. Chunk filenames — a foreign page chunk existing at all proves it was
 *      emitted. This is the real security property.
 *   2. Content strings — catches a foreign route inlined into the entry chunk
 *      rather than split out.
 *
 * Usage:  node scripts/check-bundle-isolation.mjs <surface> [distDir]
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Page chunks and route strings that belong to exactly one surface.
 * `PartnerApplyPage` is deliberately excluded from `partner` — the IB
 * application form is a public marketing page, not part of the portal.
 */
const SENTINELS = {
  marketing: {
    chunks: [
      /^(Home|About|Markets|Platforms|Trust|Faq|Partnership|Contact|BlogList|BlogDetail|Disclaimer|Legal)Page-/,
    ],
    strings: [],
  },
  portal: {
    chunks: [/^(Trade|Funds|Kyc|PortalAccounts|Downloads|Profile)Page-/],
    strings: [],
  },
  partner: {
    chunks: [/^Partner(?!Apply)[A-Za-z]*Page-/],
    strings: ['partner/sub-partners'],
  },
  admin: {
    chunks: [/^(Admin[A-Za-z]*|Agent[A-Za-z]*)Page-/],
    strings: ['admin/withdrawal-requests'],
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

  // A check that scanned nothing must never report success — that would make
  // every later deploy trust a green result that proved nothing.
  if (files.length === 0) {
    return { ok: false, leaks: [`No JavaScript files found under ${distDir} — nothing was scanned`] }
  }

  const foreign = Object.entries(SENTINELS).filter(([name]) => name !== surface)
  const leaks = []

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
