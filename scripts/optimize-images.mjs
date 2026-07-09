// One-off asset optimizer: converts oversized RGBA PNGs in public/ to WebP.
// favicon.png is intentionally skipped (referenced from index.html as image/png).
// Run: node scripts/optimize-images.mjs
import { readdirSync, statSync, unlinkSync } from 'node:fs'
import { join, extname, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = join(root, 'public')
const SKIP = new Set(['favicon.png'])

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else if (['.png', '.jpg', '.jpeg'].includes(extname(name).toLowerCase()) && !SKIP.has(name)) out.push(p)
  }
  return out
}

const files = walk(publicDir)
let before = 0
let after = 0

for (const src of files) {
  const dest = src.replace(/\.(png|jpe?g)$/i, '.webp')
  const inBytes = statSync(src).size
  // quality 82 near-lossless for UI art; effort 6 = best compression.
  await sharp(src).webp({ quality: 82, effort: 6 }).toFile(dest)
  const outBytes = statSync(dest).size
  before += inBytes
  after += outBytes
  unlinkSync(src) // drop the original so dist/ ships only the WebP
  const pct = Math.round((1 - outBytes / inBytes) * 100)
  console.log(
    `${src.replace(root, '.').padEnd(46)} ${(inBytes / 1024).toFixed(0).padStart(6)}KB -> ${(outBytes / 1024).toFixed(0).padStart(5)}KB  (-${pct}%)`,
  )
}

console.log(
  `\nTotal: ${(before / 1024 / 1024).toFixed(1)}MB -> ${(after / 1024 / 1024).toFixed(1)}MB  ` +
    `(-${Math.round((1 - after / before) * 100)}%, ${files.length} files)`,
)
