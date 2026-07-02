// Generates public/world-dots.png — a dotted world-map silhouette used as the
// hero background (tinted per-theme via CSS mask in globals.css).
// Run: node scripts/generate-world-dots.mjs
import sharp from 'sharp'
import { writeFileSync } from 'node:fs'

// CC0 blank world silhouette (filled continents on transparent background).
const SRC_URL =
  'https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg'
const OUT = 'public/world-dots.png'

// Source aspect ratio (from the SVG's width/height attributes).
const RATIO = 2434.94 / 4378.13

const gridW = 240 // dot columns across the map (higher = finer)
const gridH = Math.round(gridW * RATIO)
const usedH = Math.round(gridH * 0.84) // crop the dense Antarctica strip

const cell = 6 // output px per dot cell
const r = 2.05 // dot radius (leaves a clean gap between dots)
const outW = gridW * cell
const outH = usedH * cell

const svgBuf = Buffer.from(await (await fetch(SRC_URL)).arrayBuffer())

// One raster pixel per dot cell — the alpha channel is the land mask.
const { data, info } = await sharp(svgBuf, { density: 96 })
  .resize(gridW, gridH, { fit: 'fill' })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })
const ch = info.channels

let circles = ''
for (let y = 0; y < usedH; y++) {
  for (let x = 0; x < gridW; x++) {
    if (data[(y * gridW + x) * ch + 3] > 90) {
      circles += `<circle cx="${x * cell + cell / 2}" cy="${y * cell + cell / 2}" r="${r}"/>`
    }
  }
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${outW}" height="${outH}" viewBox="0 0 ${outW} ${outH}"><g fill="#000">${circles}</g></svg>`

// Black dots on transparent, 2x for retina — used as a CSS mask (alpha).
await sharp(Buffer.from(svg))
  .resize(outW * 2, outH * 2, { fit: 'fill' })
  .png()
  .toFile(OUT)

const dots = (circles.match(/circle/g) || []).length
console.log(`grid ${gridW}x${usedH}, ${dots} dots -> ${OUT} (${outW * 2}x${outH * 2})`)
