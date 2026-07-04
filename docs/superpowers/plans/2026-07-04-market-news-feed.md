# External Market News Feed — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Supplement the `/blog` page with a build-time Finnhub market-news feed baked into a static `news.json`, so it works while the backend is down.

**Architecture:** A dumb Node script fetches raw Finnhub news at build time → git-ignored `public/news.json`. The frontend loads that static file, normalizes it (tested, single-sourced), and renders a "Market News" section below the existing own-posts section. The deploy workflow runs the fetch (with a secret) before build, on push + a 6-hour cron.

**Tech Stack:** React + TypeScript + Vite (GitHub Pages, base `/27-markets/`), Vitest + @testing-library/react for tests, `tsc -b` typecheck, Node 20 global `fetch` in CI.

## Global Constraints

- Frontend test runner is **Vitest** (`npx vitest run <file>`), NOT jest.
- Typecheck gate: `npx tsc -b` (must exit 0).
- Public assets are resolved with `asset(path)` from `@/lib/asset` (handles the `/27-markets/` base). Never hardcode the base.
- `news.json` is a **build artifact** — git-ignored, never committed.
- The build must **never fail** because of news: the script always writes a valid file and exits 0.
- Existing reusable classes: `glass-panel`, `card-lift`, `section-alt`, `container-x`, `section-eyebrow`, `line-clamp-2/3` (Tailwind line-clamp plugin is already in use in `BlogListPage.tsx`).
- Time-ago rendering: reuse `relativeTime(input)` from `@/lib/format` (accepts a `Date`); Finnhub `datetime` is **unix seconds**, so pass `new Date(datetime * 1000)`.

---

### Task 1: `marketNews` lib — types, `normalizeFinnhub`, `loadMarketNews`

**Files:**
- Create: `src/lib/marketNews.ts`
- Test: `src/lib/marketNews.spec.ts`

**Interfaces:**
- Consumes: `asset` from `@/lib/asset`.
- Produces:
  - `interface FinnhubRaw { id?: number|string; headline?: string; summary?: string; source?: string; url?: string; image?: string; datetime?: number; category?: string; related?: string }`
  - `interface NewsItem { id: string; headline: string; summary: string; source: string; url: string; image: string; datetime: number }`
  - `normalizeFinnhub(raw: FinnhubRaw[]): NewsItem[]`
  - `loadMarketNews(): Promise<NewsItem[]>`

- [ ] **Step 1: Write the failing test**

Create `src/lib/marketNews.spec.ts`:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { normalizeFinnhub, loadMarketNews, type FinnhubRaw } from './marketNews'

const raw = (over: Partial<FinnhubRaw> = {}): FinnhubRaw => ({
  id: 1,
  headline: 'EUR/USD rallies',
  summary: 'The euro climbed against the dollar.',
  source: 'Reuters',
  url: 'https://example.com/a',
  image: 'https://img/1.png',
  datetime: 1_700_000_000,
  ...over,
})

describe('normalizeFinnhub', () => {
  it('maps fields and returns a NewsItem', () => {
    const [item] = normalizeFinnhub([raw()])
    expect(item).toEqual({
      id: '1',
      headline: 'EUR/USD rallies',
      summary: 'The euro climbed against the dollar.',
      source: 'Reuters',
      url: 'https://example.com/a',
      image: 'https://img/1.png',
      datetime: 1_700_000_000,
    })
  })

  it('drops items missing a headline or url', () => {
    const out = normalizeFinnhub([
      raw({ headline: '   ' }),
      raw({ url: '', id: 2 }),
      raw({ id: 3 }),
    ])
    expect(out).toHaveLength(1)
    expect(out[0].id).toBe('3')
  })

  it('dedupes by url', () => {
    const out = normalizeFinnhub([raw({ id: 1 }), raw({ id: 2 })])
    expect(out).toHaveLength(1)
  })

  it('trims summaries longer than 180 chars', () => {
    const long = 'x'.repeat(300)
    const [item] = normalizeFinnhub([raw({ summary: long })])
    expect(item.summary.length).toBeLessThanOrEqual(181) // 180 + ellipsis
    expect(item.summary.endsWith('…')).toBe(true)
  })

  it('sorts newest-first and caps at 18', () => {
    const many = Array.from({ length: 25 }, (_, i) =>
      raw({ id: i, url: `https://example.com/${i}`, datetime: i }),
    )
    const out = normalizeFinnhub(many)
    expect(out).toHaveLength(18)
    expect(out[0].datetime).toBe(24) // newest first
  })

  it('returns [] for non-array input', () => {
    expect(normalizeFinnhub(undefined as unknown as FinnhubRaw[])).toEqual([])
  })
})

describe('loadMarketNews', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('returns normalized items from news.json', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [raw()] }),
    }))
    const items = await loadMarketNews()
    expect(items).toHaveLength(1)
    expect(items[0].headline).toBe('EUR/USD rallies')
  })

  it('returns [] on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    expect(await loadMarketNews()).toEqual([])
  })

  it('returns [] when fetch rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    expect(await loadMarketNews()).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/marketNews.spec.ts`
Expected: FAIL — cannot resolve `./marketNews`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/marketNews.ts`:

```ts
import { asset } from '@/lib/asset'

/** Loose shape of a raw Finnhub news item (from /news?category=general). */
export interface FinnhubRaw {
  id?: number | string
  headline?: string
  summary?: string
  source?: string
  url?: string
  image?: string
  datetime?: number
  category?: string
  related?: string
}

/** Normalized item the UI renders. */
export interface NewsItem {
  id: string
  headline: string
  summary: string
  source: string
  url: string
  image: string
  datetime: number
}

const MAX_ITEMS = 18
const SUMMARY_MAX = 180

function trimSummary(s: string): string {
  const t = (s ?? '').trim()
  return t.length > SUMMARY_MAX ? `${t.slice(0, SUMMARY_MAX).trimEnd()}…` : t
}

/** Pure: map + filter + dedupe + trim + sort + cap. */
export function normalizeFinnhub(raw: FinnhubRaw[]): NewsItem[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const items: NewsItem[] = []
  for (const r of raw) {
    const headline = (r.headline ?? '').trim()
    const url = (r.url ?? '').trim()
    if (!headline || !url || seen.has(url)) continue
    seen.add(url)
    items.push({
      id: r.id != null ? String(r.id) : url,
      headline,
      summary: trimSummary(r.summary ?? ''),
      source: (r.source ?? '').trim(),
      url,
      image: (r.image ?? '').trim(),
      datetime: typeof r.datetime === 'number' ? r.datetime : 0,
    })
  }
  items.sort((a, b) => b.datetime - a.datetime)
  return items.slice(0, MAX_ITEMS)
}

/** Load the static news feed; returns [] on any error. Never throws. */
export async function loadMarketNews(): Promise<NewsItem[]> {
  try {
    const res = await fetch(asset('news.json'), { cache: 'no-cache' })
    if (!res.ok) return []
    const data = (await res.json()) as { items?: FinnhubRaw[] }
    return normalizeFinnhub(data?.items ?? [])
  } catch {
    return []
  }
}
```

- [ ] **Step 4: Run test + typecheck to verify they pass**

Run: `npx vitest run src/lib/marketNews.spec.ts`
Expected: PASS (all cases).
Run: `npx tsc -b`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/marketNews.ts src/lib/marketNews.spec.ts
git commit -m "feat(news): market-news normalize + loader (tested)"
```

---

### Task 2: build-time fetch script + gitignore

**Files:**
- Create: `scripts/fetch-news.mjs`
- Modify: `.gitignore` (append `public/news.json`)

**Interfaces:**
- Consumes: `process.env.FINNHUB_API_KEY` (optional). Node 20 global `fetch`.
- Produces: writes `public/news.json` = `{ updatedAt: string, items: FinnhubRaw[] }`. Always exits 0.

- [ ] **Step 1: Write the script**

Create `scripts/fetch-news.mjs`:

```js
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

void main()
```

- [ ] **Step 2: Append to `.gitignore`**

Add this line to the end of `.gitignore`:

```
# Build-time market-news artifact (regenerated each deploy)
public/news.json
```

- [ ] **Step 3: Verify the script runs and never fails (no key path)**

Run (no key set): `node scripts/fetch-news.mjs`
Expected: prints `news: FINNHUB_API_KEY not set — writing empty feed` then `news: wrote 0 item(s) → public/news.json`, exit code 0.
Run: `cat public/news.json`
Expected: `{"updatedAt":"...","items":[]}`.
Confirm it is ignored: `git status --porcelain public/news.json`
Expected: no output (git-ignored).

- [ ] **Step 4: Commit**

```bash
git add scripts/fetch-news.mjs .gitignore
git commit -m "feat(news): build-time Finnhub fetch script + gitignore artifact"
```

---

### Task 3: `MarketNewsSection` component

**Files:**
- Create: `src/components/marketing/MarketNewsSection.tsx`
- Test: `src/components/marketing/MarketNewsSection.spec.tsx`

**Interfaces:**
- Consumes: `loadMarketNews`, `type NewsItem` from `@/lib/marketNews`; `relativeTime` from `@/lib/format`; `staggerContainer`, `fadeUp` from `@/lib/motion`.
- Produces: `export function MarketNewsSection(): JSX.Element | null` — loads news on mount; returns `null` when there is no news.

- [ ] **Step 1: Write the failing test**

Create `src/components/marketing/MarketNewsSection.spec.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { MarketNewsSection } from './MarketNewsSection'
import { loadMarketNews } from '@/lib/marketNews'

vi.mock('@/lib/marketNews', () => ({ loadMarketNews: vi.fn() }))
const mockLoad = loadMarketNews as unknown as Mock

describe('MarketNewsSection', () => {
  beforeEach(() => mockLoad.mockReset())

  it('renders nothing when there is no news', async () => {
    mockLoad.mockResolvedValue([])
    const { container } = render(<MarketNewsSection />)
    await waitFor(() => expect(mockLoad).toHaveBeenCalled())
    expect(container.querySelector('section')).toBeNull()
  })

  it('renders external cards for news items', async () => {
    mockLoad.mockResolvedValue([
      { id: '1', headline: 'EURUSD rallies', summary: 'up', source: 'Reuters', url: 'https://x/1', image: '', datetime: 1_700_000_000 },
    ])
    render(<MarketNewsSection />)
    const link = await screen.findByRole('link', { name: /EURUSD rallies/i })
    expect(link).toHaveAttribute('href', 'https://x/1')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noreferrer')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/marketing/MarketNewsSection.spec.tsx`
Expected: FAIL — cannot resolve `./MarketNewsSection`.

- [ ] **Step 3: Write the component**

Create `src/components/marketing/MarketNewsSection.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { loadMarketNews, type NewsItem } from '@/lib/marketNews'
import { relativeTime } from '@/lib/format'
import { staggerContainer, fadeUp } from '@/lib/motion'

export function MarketNewsSection() {
  const [items, setItems] = useState<NewsItem[]>([])

  useEffect(() => {
    let active = true
    void loadMarketNews().then((n) => {
      if (active) setItems(n)
    })
    return () => {
      active = false
    }
  }, [])

  if (items.length === 0) return null

  return (
    <section className="section-alt border-t border-ink-300/60">
      <div className="container-x py-14">
        <div className="mb-8">
          <p className="section-eyebrow mb-2">Live</p>
          <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">Market News</h2>
          <p className="mt-2 text-sm text-gray-400">Latest market headlines · via Finnhub</p>
        </div>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {items.map((n) => (
            <motion.a
              key={n.id}
              variants={fadeUp}
              href={n.url}
              target="_blank"
              rel="noreferrer"
              className="glass-panel card-lift block overflow-hidden"
            >
              {n.image ? (
                <img src={n.image} alt="" aria-hidden className="h-44 w-full object-cover" />
              ) : (
                <div className="h-44 w-full bg-gradient-to-br from-brand-500/15 to-transparent" />
              )}
              <div className="p-5">
                <p className="text-xs text-gray-500">
                  {n.source}
                  {n.datetime ? ` · ${relativeTime(new Date(n.datetime * 1000))}` : ''}
                </p>
                <h3 className="mt-2 line-clamp-2 font-display text-base font-semibold leading-snug text-white">
                  {n.headline}
                </h3>
                {n.summary && (
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-gray-400">{n.summary}</p>
                )}
                <span className="mt-3 inline-block text-sm font-medium text-brand-400">
                  Read on {n.source || 'source'} →
                </span>
              </div>
            </motion.a>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Run test + typecheck**

Run: `npx vitest run src/components/marketing/MarketNewsSection.spec.tsx`
Expected: PASS (both cases).
Run: `npx tsc -b`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/components/marketing/MarketNewsSection.tsx src/components/marketing/MarketNewsSection.spec.tsx
git commit -m "feat(news): Market News section component"
```

---

### Task 4: wire `MarketNewsSection` into `BlogListPage`

**Files:**
- Modify: `src/pages/BlogListPage.tsx`

**Interfaces:**
- Consumes: `MarketNewsSection` from `@/components/marketing/MarketNewsSection`.

- [ ] **Step 1: Add the import**

In `src/pages/BlogListPage.tsx`, after the existing import block (after line 9, the `staggerContainer, fadeUp` import), add:

```tsx
import { MarketNewsSection } from '@/components/marketing/MarketNewsSection'
```

- [ ] **Step 2: Render the section below the own-posts section**

In `src/pages/BlogListPage.tsx`, find the closing of the own-posts section and the fragment:

```tsx
      </section>
    </>
  )
}
```

Replace it with (adds `<MarketNewsSection />` between the two):

```tsx
      </section>

      <MarketNewsSection />
    </>
  )
}
```

- [ ] **Step 3: Typecheck + full test run**

Run: `npx tsc -b`
Expected: exit 0.
Run: `npx vitest run`
Expected: all suites PASS (including the two new files).

- [ ] **Step 4: Commit**

```bash
git add src/pages/BlogListPage.tsx
git commit -m "feat(news): show Market News below own posts on /blog"
```

---

### Task 5: deploy workflow — 6h cron + fetch step

**Files:**
- Modify: `.github/workflows/deploy-pages.yml`

**Interfaces:**
- Consumes: `secrets.FINNHUB_API_KEY` (GitHub Actions secret — set manually in repo settings).

- [ ] **Step 1: Add the schedule trigger**

In `.github/workflows/deploy-pages.yml`, find:

```yaml
on:
  push:
    branches: [main]
  workflow_dispatch:
```

Replace with:

```yaml
on:
  push:
    branches: [main]
  workflow_dispatch:
  schedule:
    # Refresh market news every 6 hours (rebuild + redeploy).
    - cron: '0 */6 * * *'
```

- [ ] **Step 2: Add the fetch step before the build step**

In `.github/workflows/deploy-pages.yml`, find the build step:

```yaml
      - name: Build (frontend → Render API)
        run: npm run build
```

Insert this step immediately BEFORE it:

```yaml
      - name: Fetch market news (Finnhub)
        run: node scripts/fetch-news.mjs
        env:
          FINNHUB_API_KEY: ${{ secrets.FINNHUB_API_KEY }}
```

- [ ] **Step 3: Validate the YAML locally**

Run: `node -e "require('js-yaml')" 2>/dev/null && npx --yes js-yaml .github/workflows/deploy-pages.yml >/dev/null && echo "YAML OK" || node -e "const y=require('fs').readFileSync('.github/workflows/deploy-pages.yml','utf8'); if(!y.includes('cron:')||!y.includes('fetch-news.mjs')) process.exit(1); console.log('markers present')"`
Expected: prints `YAML OK` or `markers present` (both acceptable).

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/deploy-pages.yml
git commit -m "ci(news): fetch Finnhub news at build + every 6h"
```

---

## Post-implementation (manual, by the repo owner)

1. Add repo secret **`FINNHUB_API_KEY`** (Settings → Secrets and variables → Actions → New repository secret). Until set, the section stays hidden — nothing breaks.
2. Push to `main` (or run the workflow via *Run workflow*). Verify the deploy is green and `/blog` shows a **Market News** section once the secret is set.

## Self-Review notes

- **Spec coverage:** source=Finnhub general (Task 2 URL); build-time fetch → git-ignored `news.json` (Task 2 + `.gitignore`); tested `normalizeFinnhub`/`loadMarketNews` (Task 1); Market News section below own posts, external links, hidden when empty (Tasks 3–4); workflow cron + fetch step + secret (Task 5); never-breaks-build (Task 2 empty-feed paths). All covered.
- **Out of scope (unchanged):** category tabs, pagination, internal detail page, committing `news.json`.
- **Type consistency:** `NewsItem` fields identical across Tasks 1/3; `loadMarketNews`/`normalizeFinnhub` signatures match usage.
