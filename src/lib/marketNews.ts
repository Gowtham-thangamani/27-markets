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
  /** Finnhub category the item was fetched under: general | forex | crypto. */
  category: string
}

const MAX_ITEMS = 30
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
      category: (r.category ?? '').trim().toLowerCase() || 'general',
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
