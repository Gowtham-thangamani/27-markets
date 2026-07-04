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
      category: 'general',
    })
  })

  it('preserves and lowercases the category (defaults to general)', () => {
    expect(normalizeFinnhub([raw({ category: 'Forex' })])[0].category).toBe('forex')
    expect(normalizeFinnhub([raw({ category: undefined })])[0].category).toBe('general')
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

  it('sorts newest-first and caps at 30', () => {
    const many = Array.from({ length: 40 }, (_, i) =>
      raw({ id: i, url: `https://example.com/${i}`, datetime: i }),
    )
    const out = normalizeFinnhub(many)
    expect(out).toHaveLength(30)
    expect(out[0].datetime).toBe(39) // newest first
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
