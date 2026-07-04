# Design: External Market News feed (Finnhub → static `news.json`)

**Date:** 2026-07-04
**Status:** Approved (design), pending implementation plan

## Goal

Add an external trading/finance **Market News** feed to the public `/blog`
page, **supplementing** the existing (backend-driven) blog posts. It must work
even while the NestJS backend on Render is down, since the site is a static
GitHub Pages build.

## Decisions (from brainstorming)

| Question | Decision |
|----------|----------|
| Role vs. current blog | **Supplement** — keep own posts, add a Market News section |
| Source | **Finnhub** market news (`/news?category=general`) — reuses existing `FINNHUB_API_KEY` |
| Where fetched | **Build-time GitHub Action** → static `news.json` artifact |
| Layout | **Two stacked sections** — own posts on top, Market News below |
| Freshness | **Every ~6 hours** via a scheduled workflow rebuild |

## Architecture / data flow

```
GitHub Action (push to main + cron every 6h)
  └─ scripts/fetch-news.mjs  ──fetch──▶ https://finnhub.io/api/v1/news?category=general&token=$FINNHUB_API_KEY
        └─ normalize + trim + cap ──▶ public/news.json   (build artifact, git-ignored)
              └─ `vite build` copies public/ into dist/  ──deploy──▶ GitHub Pages
Browser  ──fetch(asset('news.json'))──▶  static same-origin file
```

- **No runtime backend**, no CORS, **no API key in the browser** (the key is an
  Actions secret used only at build time).
- The Market News feed is **independent** of the Render backend — it works while
  the backend is down.

## Components (small, focused, independently testable)

### 1. `scripts/fetch-news.mjs` (dumb fetcher — no normalization)
- Node ESM script run in CI before `vite build`.
- Reads `process.env.FINNHUB_API_KEY`.
- Fetches Finnhub `category=general`, keeps the **raw** items (bounded to ~30 to
  cap file size), writes `public/news.json` = `{ updatedAt: ISO8601, items: FinnhubRaw[] }`.
- **No mapping/trimming here** — that lives in the frontend so it's tested and
  single-sourced.
- **Never breaks the build:** on missing key, network error, non-200, or empty
  result → write `{ updatedAt, items: [] }` and `process.exit(0)` after logging a
  warning.

### 2. `public/news.json` (build artifact)
- **Git-ignored** (add to `.gitignore`). Generated in CI, not committed.
- Shape: `{ updatedAt: string, items: FinnhubRaw[] }` where a Finnhub raw item is
  `{ id, headline, summary, source, url, image, datetime, category, related }`.

### 3. `src/lib/marketNews.ts` (normalization + loader — the tested source of truth)
- Types: `FinnhubRaw` (loose input) and `NewsItem`:
  ```ts
  interface NewsItem {
    id: string        // String(raw.id) || url
    headline: string
    summary: string   // trimmed ~180 chars
    source: string
    url: string       // external article URL
    image: string     // may be '' → card renders without image
    datetime: number  // unix seconds
  }
  ```
- `normalizeFinnhub(raw: FinnhubRaw[]): NewsItem[]` — **pure**: drop items missing
  `headline`/`url`, trim summary, dedupe by url, cap at 18, sort newest-first.
- `loadMarketNews(): Promise<NewsItem[]>` — `fetch(asset('news.json'))`, parse,
  run `normalizeFinnhub(items)`, return the result or `[]` on any error/404.
  Never throws. (`asset()`/`fetch` are only touched inside this function.)

### 4. `BlogListPage` integration
- Keep the existing own-posts section **exactly as is** on top (with its current
  loading/empty/error states tied to the backend).
- Add a **"Market News"** section **below** it:
  - Loads via `loadMarketNews()` on mount.
  - Renders responsive cards: image (if present), `source · <relative time>`,
    headline, summary snippet.
  - Each card links to `item.url` with `target="_blank" rel="noreferrer"`
    (external — no internal detail route).
  - If `items` is empty → the whole section **renders nothing** (graceful hide).
  - Small "Market data & headlines via Finnhub" attribution line.

### 5. `.github/workflows/deploy-pages.yml`
- Add trigger: `schedule: - cron: '0 */6 * * *'`.
- In the `build` job, **before** `npm run build`, add a step:
  `node scripts/fetch-news.mjs` with `env: FINNHUB_API_KEY: ${{ secrets.FINNHUB_API_KEY }}`.
- Everything else unchanged. The build always succeeds even if the secret is
  absent (script writes an empty file).

## Error handling / graceful degradation

- **Missing `FINNHUB_API_KEY` / fetch failure** → `news.json` empty → Market News
  section hides; build + deploy still succeed.
- **Backend down** → own-posts section shows its existing empty/error UI; Market
  News is unaffected.
- **Malformed items** → filtered out by `normalizeFinnhub()`.

## Testing

- Unit: `normalizeFinnhub()` — maps fields, trims summary, drops items missing
  headline/url, caps at 18, orders newest-first.
- Unit: `loadMarketNews()` — returns `[]` when the fetch 404s / rejects (mock
  `fetch`).
- Light render check: the Market News section renders cards for sample items and
  renders nothing for `[]`.

## Out of scope (YAGNI, v1)

- Category tabs (forex / crypto / merger) — general only for now.
- Pagination / "load more".
- An internal news **detail** page (articles link out to the source).
- Committing `news.json` to the repo (it's a build artifact).

## Manual step required

Add **`FINNHUB_API_KEY`** as a **GitHub Actions secret**
(Settings → Secrets and variables → Actions). Until set, the section stays
hidden and nothing breaks.

## Files touched

- `scripts/fetch-news.mjs` (new)
- `src/lib/marketNews.ts` (new)
- `src/lib/marketNews.spec.ts` (new)
- `src/pages/BlogListPage.tsx` (edit — add section)
- `.github/workflows/deploy-pages.yml` (edit — cron + fetch step)
- `.gitignore` (edit — ignore `public/news.json`)
