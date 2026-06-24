import { useLiveQuotes } from '@/lib/useLiveQuotes'
import { cn } from '@/lib/cn'

const LABELS: Record<string, string> = {
  'BINANCE:BTCUSDT': 'BTC / USD',
  'BINANCE:ETHUSDT': 'ETH / USD',
  'OANDA:EUR_USD': 'EUR / USD',
  'OANDA:XAU_USD': 'Gold (XAU/USD)',
  AAPL: 'Apple',
  TSLA: 'Tesla',
}

function label(sym: string): string {
  return LABELS[sym] ?? sym
}

function fmtPrice(p: number): string {
  const digits = p >= 100 ? 2 : p >= 1 ? 4 : 6
  return p.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

/** Real-time market overview grid, powered by the backend SSE stream. */
export function LiveMarketOverview() {
  const { list, connected } = useLiveQuotes()

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-xs text-gray-500">
        <span className={cn('h-2 w-2 rounded-full', connected ? 'animate-pulse bg-success' : 'bg-gray-600')} />
        {connected ? 'Live' : 'Connecting…'}
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-ink-800/40 p-8 text-center text-sm text-gray-400">
          Live market data isn’t available right now.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((q) => {
            const up = (q.changePct ?? 0) >= 0
            return (
              <div key={q.symbol} className="glass-panel flex items-center justify-between p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{label(q.symbol)}</p>
                  <p className="text-xs text-gray-500">{q.symbol}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-lg font-semibold tabular-nums text-white">{fmtPrice(q.price)}</p>
                  {q.changePct !== undefined && (
                    <p className={cn('font-mono text-xs font-medium tabular-nums', up ? 'text-success' : 'text-danger')}>
                      {up ? '▲' : '▼'} {Math.abs(q.changePct).toFixed(2)}%
                    </p>
                  )}
                  {q.stale && <p className="text-[10px] uppercase tracking-wide text-gray-600">cached</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
