// Build-time fetch of Finnhub general market news → public/news.json.
// Dumb by design: no normalization (the frontend does that, tested).
// Never fails the build: on any problem it writes an empty feed and exits 0.
import { writeFileSync, mkdirSync } from 'node:fs'

const OUT_DIR = 'public'
const OUT = 'public/news.json'
const PER_CATEGORY = 12
const CATEGORIES = ['general', 'forex', 'crypto']
const KEY = process.env.FINNHUB_API_KEY

function write(items) {
  mkdirSync(OUT_DIR, { recursive: true })
  writeFileSync(OUT, JSON.stringify({ updatedAt: new Date().toISOString(), items }))
  console.log(`news: wrote ${items.length} item(s) → ${OUT}`)
}

/** Fetch one Finnhub category, tag each item with it. Returns [] on any error. */
async function fetchCategory(category) {
  try {
    const res = await fetch(`https://finnhub.io/api/v1/news?category=${category}&token=${KEY}`)
    if (!res.ok) {
      console.warn(`news: ${category} → ${res.status}`)
      return []
    }
    const data = await res.json()
    if (!Array.isArray(data)) return []
    return data.slice(0, PER_CATEGORY).map((item) => ({ ...item, category }))
  } catch (err) {
    console.warn(`news: ${category} fetch failed (${err.message})`)
    return []
  }
}

async function main() {
  if (!KEY) {
    console.warn('news: FINNHUB_API_KEY not set — writing empty feed')
    write([])
    return
  }
  const lists = await Promise.all(CATEGORIES.map(fetchCategory))
  // Merge + dedupe by url (first occurrence keeps its category).
  const seen = new Set()
  const items = []
  for (const list of lists) {
    for (const item of list) {
      if (!item.url || seen.has(item.url)) continue
      seen.add(item.url)
      items.push(item)
    }
  }
  write(items)
}

// Belt-and-suspenders: even a write failure must not fail the build.
main().catch(() => process.exit(0))
