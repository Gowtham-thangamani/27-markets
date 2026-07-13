import { useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { useLiveQuotes } from '@/lib/useLiveQuotes'
import { cn } from '@/lib/cn'

const LABELS: Record<string, string> = {
  'BINANCE:BTCUSDT': 'BTC',
  'BINANCE:ETHUSDT': 'ETH',
  'BINANCE:SOLUSDT': 'SOL',
  'BINANCE:XRPUSDT': 'XRP',
  'OANDA:EUR_USD': 'EUR/USD',
  'OANDA:GBP_USD': 'GBP/USD',
  'OANDA:USD_JPY': 'USD/JPY',
  'OANDA:AUD_USD': 'AUD/USD',
  'OANDA:XAU_USD': 'XAU',
  'OANDA:XAG_USD': 'XAG',
  AAPL: 'AAPL',
  TSLA: 'TSLA',
  NVDA: 'NVDA',
  AMZN: 'AMZN',
}

function label(s: string): string {
  return LABELS[s] ?? s
}

function fmt(p: number): string {
  const d = p >= 100 ? 2 : p >= 1 ? 4 : 6
  return p.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d })
}

// ── Real instrument icons, keyed by the raw feed symbol ──
// Crypto: CoinCap coin logos · Stocks: Clearbit brand logos · Forex: country
// flags (flagcdn) · Metals: a gold/silver badge. Broken loads hide gracefully.
const CRYPTO_ID: Record<string, string> = {
  'BINANCE:BTCUSDT': 'btc', 'BINANCE:ETHUSDT': 'eth', 'BINANCE:SOLUSDT': 'sol', 'BINANCE:XRPUSDT': 'xrp',
  'BINANCE:ADAUSDT': 'ada', 'BINANCE:DOGEUSDT': 'doge', 'BINANCE:LTCUSDT': 'ltc', 'BINANCE:LINKUSDT': 'link',
}
// Stock logos by ticker (Financial Modeling Prep — Clearbit's free logo API was retired).
const STOCKS = new Set(['AAPL', 'TSLA', 'NVDA', 'AMZN', 'MSFT', 'GOOGL', 'META', 'AMD'])
const FX_FLAGS: Record<string, [string, string]> = {
  'OANDA:EUR_USD': ['eu', 'us'], 'OANDA:GBP_USD': ['gb', 'us'], 'OANDA:USD_JPY': ['us', 'jp'],
  'OANDA:AUD_USD': ['au', 'us'], 'OANDA:USD_CAD': ['us', 'ca'], 'OANDA:USD_CHF': ['us', 'ch'],
  'OANDA:NZD_USD': ['nz', 'us'], 'OANDA:EUR_JPY': ['eu', 'jp'], 'OANDA:EUR_GBP': ['eu', 'gb'], 'OANDA:GBP_JPY': ['gb', 'jp'],
}
const METAL: Record<string, 'gold' | 'silver'> = {
  'OANDA:XAU_USD': 'gold', 'OANDA:XAG_USD': 'silver', 'OANDA:XPT_USD': 'silver', 'OANDA:XPD_USD': 'silver',
}

const hideOnError = (e: { currentTarget: HTMLImageElement }) => {
  e.currentTarget.style.display = 'none'
}

/** Renders the real icon(s) for an instrument, or nothing if we have no mapping. */
function TickerIcon({ symbol }: { symbol: string }) {
  if (CRYPTO_ID[symbol]) {
    return (
      <img
        src={`https://assets.coincap.io/assets/icons/${CRYPTO_ID[symbol]}@2x.png`}
        alt={`${CRYPTO_ID[symbol]} logo`} onError={hideOnError}
        className="h-4 w-4 shrink-0 rounded-full object-contain"
      />
    )
  }
  if (STOCKS.has(symbol)) {
    return (
      <img
        src={`https://financialmodelingprep.com/image-stock/${symbol}.png`}
        alt={`${symbol} logo`} onError={hideOnError}
        className="h-4 w-4 shrink-0 rounded-full bg-white object-contain"
      />
    )
  }
  if (FX_FLAGS[symbol]) {
    const [a, b] = FX_FLAGS[symbol]
    return (
      <span className="flex shrink-0 -space-x-1.5">
        {[a, b].map((code, i) => (
          <img
            key={code + i}
            src={`https://flagcdn.com/w40/${code}.png`}
            alt={`${code.toUpperCase()} flag`} onError={hideOnError}
            className="h-4 w-4 rounded-full object-cover ring-1 ring-black/40"
          />
        ))}
      </span>
    )
  }
  if (METAL[symbol]) {
    return (
      <span
        aria-hidden
        className={
          'h-4 w-4 shrink-0 rounded-full ring-1 ring-black/30 ' +
          (METAL[symbol] === 'gold'
            ? 'bg-gradient-to-br from-yellow-200 to-yellow-500'
            : 'bg-gradient-to-br from-gray-200 to-gray-400')
        }
      />
    )
  }
  return null
}

// Curated symbols for the homepage strip.
const TICKER = [
  'BINANCE:BTCUSDT',
  'BINANCE:ETHUSDT',
  'BINANCE:SOLUSDT',
  'BINANCE:XRPUSDT',
  'OANDA:EUR_USD',
  'OANDA:GBP_USD',
  'OANDA:USD_JPY',
  'OANDA:XAU_USD',
  'AAPL',
  'NVDA',
]

/** Slim real-time price strip for the homepage hero. Renders nothing until data arrives. */
export function LiveTicker() {
  const { list } = useLiveQuotes(TICKER)
  const [paused, setPaused] = useState(false)
  if (list.length === 0) return null

  // One copy of the quote row. It's duplicated inside the marquee track so the
  // left-scroll loops seamlessly (each copy is identical, animate to -50%).
  const quotes = list.map((q) => {
    const up = (q.changePct ?? 0) >= 0
    return (
      <span key={q.symbol} className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap text-sm">
        <TickerIcon symbol={q.symbol} />
        <span className="font-medium text-gray-300">{label(q.symbol)}</span>
        <span className="font-mono tabular-nums text-white">{fmt(q.price)}</span>
        {q.changePct !== undefined && (
          <span className={cn('font-mono text-xs tabular-nums', up ? 'text-success' : 'text-danger')}>
            {up ? '▲' : '▼'}
            {Math.abs(q.changePct).toFixed(2)}%
          </span>
        )}
      </span>
    )
  })

  return (
    <div className="border-y border-white/[0.06] bg-ink-900/60">
      <div className="container-x flex items-center gap-6 py-3">
        <span className="z-10 flex shrink-0 items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500" /> Live
        </span>
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? 'Resume the price ticker' : 'Pause the price ticker'}
          aria-pressed={paused}
          className="z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 text-gray-400 transition hover:border-brand-500/40 hover:text-white"
        >
          {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
        </button>
        {/* Marquee viewport — clips the continuously scrolling track */}
        <div className="relative min-w-0 flex-1 overflow-hidden">
          <div className={cn('ticker-marquee', paused && '[animation-play-state:paused]')}>
            <div className="flex shrink-0 items-center gap-6 pr-6">{quotes}</div>
            <div className="flex shrink-0 items-center gap-6 pr-6" aria-hidden="true">
              {quotes}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
