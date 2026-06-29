import { Search, TrendingDown, TrendingUp } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Input, EmptyState } from '@/components/ui'
import { cn } from '@/lib/cn'
import { formatNumber } from '@/lib/format'
import { instruments } from '@/mock/data'
import { useLiveQuotes } from '@/lib/useLiveQuotes'
import { InstrumentChartModal } from './InstrumentChartModal'
import type { Instrument, InstrumentCategory } from '@/lib/types'

const categories: (InstrumentCategory | 'All')[] = [
  'All',
  'Forex',
  'Metals',
  'Indices',
  'Commodities',
  'Stocks',
  'Crypto',
]

export function InstrumentsExplorer({ initialCategory }: { initialCategory?: InstrumentCategory }) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState<InstrumentCategory | 'All'>(initialCategory ?? 'All')
  const [selected, setSelected] = useState<Instrument | null>(null)
  const { quotes } = useLiveQuotes()

  // Keep the active filter in sync with the category passed from the URL, so
  // clicking a market card (which updates ?category=) re-filters this list even
  // though the page itself doesn't remount.
  useEffect(() => {
    setActive(initialCategory ?? 'All')
  }, [initialCategory])

  const filtered = useMemo(() => {
    return instruments.filter((ins) => {
      const matchesCat = active === 'All' || ins.category === active
      const q = query.trim().toLowerCase()
      const matchesQuery =
        !q || ins.symbol.toLowerCase().includes(q) || ins.name.toLowerCase().includes(q)
      return matchesCat && matchesQuery
    })
  }, [query, active])

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="lg:max-w-xs">
          <Input
            placeholder="Search symbol or name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            icon={<Search className="h-4 w-4" />}
            aria-label="Search instruments"
          />
        </div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActive(cat)}
              className={cn(
                'shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                active === cat
                  ? 'border-brand-500/50 bg-brand-500/15 text-brand-200'
                  : 'border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-white/[0.06]">
        <div className="hidden grid-cols-[1.6fr_1fr_1fr_1fr] gap-4 border-b border-white/[0.06] bg-ink-800/60 px-5 py-3 text-xs font-medium uppercase tracking-wide text-gray-500 sm:grid">
          <span>Instrument</span>
          <span className="text-right">Price</span>
          <span className="text-right">24h Change</span>
          <span className="text-right">Spread</span>
        </div>

        {filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState title="No instruments found" description="Try a different search or category." />
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.04]">
            {filtered.map((ins) => {
              // Overlay live data when a feed quote is available for this instrument.
              const live = ins.feed ? quotes[ins.feed] : undefined
              const price = live?.price ?? ins.price
              const changePct = live?.changePct ?? ins.changePct
              const isLive = !!live && !live.stale
              const up = changePct >= 0
              return (
                <li
                  key={ins.symbol}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelected(ins)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setSelected(ins)
                    }
                  }}
                  aria-label={`Open ${ins.symbol} chart`}
                  className="grid cursor-pointer grid-cols-2 items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.02] focus:outline-none focus-visible:bg-white/[0.04] focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-brand-500/40 sm:grid-cols-[1.6fr_1fr_1fr_1fr]"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink-600 text-[10px] font-bold text-brand-300 ring-1 ring-white/[0.06]">
                      {ins.symbol.replace('/', '').slice(0, 3)}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-white">
                        {ins.symbol}
                        {isLive && (
                          <span
                            className="h-1.5 w-1.5 animate-pulse rounded-full bg-success"
                            title="Live"
                            aria-label="Live price"
                          />
                        )}
                      </div>
                      <div className="truncate text-xs text-gray-500">{ins.name}</div>
                    </div>
                  </div>
                  <div className="text-right font-mono text-sm font-medium tabular-nums text-white">
                    {formatNumber(price, price < 10 ? 4 : 2)}
                  </div>
                  <div
                    className={cn(
                      'flex items-center justify-end gap-1 font-mono text-sm font-medium tabular-nums',
                      up ? 'text-success' : 'text-brand-400'
                    )}
                  >
                    {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                    {up ? '+' : ''}
                    {formatNumber(changePct, 2)}%
                  </div>
                  <div className="hidden text-right text-sm text-gray-400 sm:block">
                    {formatNumber(ins.spread, 1)}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {selected && <InstrumentChartModal instrument={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
