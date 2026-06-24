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

/** Slim real-time price strip for the homepage hero. Renders nothing until data arrives. */
export function LiveTicker() {
  const { list } = useLiveQuotes()
  if (list.length === 0) return null

  return (
    <div className="border-y border-white/[0.06] bg-ink-900/60">
      <div className="container-x flex items-center gap-6 overflow-x-auto whitespace-nowrap py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500" /> Live
        </span>
        {list.map((q) => {
          const up = (q.changePct ?? 0) >= 0
          return (
            <span key={q.symbol} className="inline-flex shrink-0 items-center gap-2 text-sm">
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
        })}
      </div>
    </div>
  )
}
