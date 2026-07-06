import { Bitcoin, Sparkles } from 'lucide-react'

interface Quote {
  symbol: string
  price: number
  changePct?: number
}

/** Live trading-UI cards that float around the hero device (order ticket, P&L,
 * AI insight) — shows the product working, on-brand dark glass + red accent.
 * Decorative: pointer-events-none, lg-only, driven by the live hero quotes. */
export function HeroFloatingCards({ quotes }: { quotes: Quote[] }) {
  const btc = quotes.find((q) => q.symbol.includes('BTC')) ?? quotes[0]
  const btcPrice = btc?.price
    ? btc.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '—'
  const weekPct = Math.abs(btc?.changePct ?? 3.88).toFixed(2)
  const up = (btc?.changePct ?? 3.88) >= 0

  // Mini P&L bar chart — last two bars carry the brand accent.
  const bars = [42, 64, 50, 88, 70]

  return (
    <div className="pointer-events-none absolute inset-0 z-20 hidden lg:block" aria-hidden>
      {/* Order ticket — top-left */}
      <div
        className="glass-panel animate-float absolute left-[-9%] top-[6%] w-[188px] rounded-2xl p-3 shadow-[0_16px_40px_-10px_rgba(0,0,0,0.6)] ring-1 ring-brand-500/15"
        style={{ animationDuration: '8s' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500/15 text-brand-400">
              <Bitcoin className="h-4 w-4" />
            </span>
            <div className="leading-tight">
              <div className="text-xs font-semibold text-white">BTC/USD</div>
              <div className="text-[10px] text-gray-400">Bitcoin</div>
            </div>
          </div>
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-mono text-base font-bold tabular-nums text-white">{btcPrice}</span>
          <span className={`text-[11px] font-semibold ${up ? 'text-success' : 'text-danger'}`}>
            {up ? '▲' : '▼'} {weekPct}%
          </span>
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-1.5 text-[11px] font-semibold">
          <span className="rounded-md bg-success/15 py-1 text-center text-success">Buy</span>
          <span className="rounded-md bg-danger/15 py-1 text-center text-danger">Sell</span>
        </div>
      </div>

      {/* P&L card with mini bar chart — bottom-right */}
      <div
        className="glass-panel animate-float absolute right-[-8%] bottom-[16%] w-[200px] rounded-2xl p-3.5 shadow-[0_16px_40px_-10px_rgba(0,0,0,0.6)] ring-1 ring-brand-500/15"
        style={{ animationDuration: '10s', animationDelay: '0.8s' }}
      >
        <div className="flex items-end justify-between">
          <div className="leading-tight">
            <div className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
              Today&apos;s P&amp;L
            </div>
            <div className="mt-0.5 font-mono text-lg font-bold tabular-nums text-white">
              +$203.37
            </div>
            <div className={`mt-0.5 text-[10px] font-semibold ${up ? 'text-success' : 'text-danger'}`}>
              {up ? '▲' : '▼'} {weekPct}% this week
            </div>
          </div>
          <div className="flex h-12 items-end gap-1">
            {bars.map((h, i) => (
              <span
                key={i}
                className={`w-2 rounded-sm ${i >= bars.length - 2 ? 'bg-brand-500' : 'bg-white/15'}`}
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* AI insight pill — bottom-left */}
      <div
        className="glass-panel animate-float absolute left-[-3%] bottom-[3%] flex items-center gap-2 rounded-full py-2 pl-2 pr-4 shadow-[0_16px_40px_-10px_rgba(0,0,0,0.6)] ring-1 ring-brand-500/15"
        style={{ animationDuration: '9s', animationDelay: '0.4s' }}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-onaccent shadow-[0_0_16px_rgba(225,29,46,0.6)]">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <span className="text-xs font-medium text-white">Analyse with AI</span>
      </div>
    </div>
  )
}
