// Build-time fetch of Finnhub general market news → public/news.json.
// Dumb by design: no normalization (the frontend does that, tested).
// Never fails the build: on any problem it writes an empty feed and exits 0.
import { writeFileSync, mkdirSync } from 'node:fs'

const OUT_DIR = 'public'
const OUT = 'public/news.json'
const CAP = 30
const KEY = process.env.FINNHUB_API_KEY

function write(items) {
  mkdirSync(OUT_DIR, { recursive: true })
  writeFileSync(OUT, JSON.stringify({ updatedAt: new Date().toISOString(), items }))
  console.log(`news: wrote ${items.length} item(s) → ${OUT}`)
}

async function main() {
  if (!KEY) {
    console.warn('news: FINNHUB_API_KEY not set — writing empty feed')
    write([])
    return
  }
  try {
    const res = await fetch(`https://finnhub.io/api/v1/news?category=general&token=${KEY}`)
    if (!res.ok) {
      console.warn(`news: Finnhub responded ${res.status} — writing empty feed`)
      write([])
      return
    }
    const data = await res.json()
    write(Array.isArray(data) ? data.slice(0, CAP) : [])
  } catch (err) {
    console.warn(`news: fetch failed (${err.message}) — writing empty feed`)
    write([])
  }
}

// Belt-and-suspenders: even a write failure must not fail the build.
main().catch(() => process.exit(0))
