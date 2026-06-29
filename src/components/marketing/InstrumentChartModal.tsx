import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, TrendingDown, TrendingUp } from 'lucide-react'
import { Badge, Button, Modal } from '@/components/ui'
import { PriceChart } from '@/components/portal/PriceChart'
import { useCandles } from '@/lib/useCandles'
import { useLiveQuotes } from '@/lib/useLiveQuotes'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { Instrument } from '@/lib/types'

/**
 * Public, login-free preview of a single instrument: live price + candlestick
 * chart, with a "Trade" CTA that opens the full in-portal terminal (login-gated)
 * with this symbol preselected. Instruments without a live feed (indicative-only
 * indices/commodities) show a friendly note instead of an empty chart.
 */
export function InstrumentChartModal({
  instrument,
  onClose,
}: {
  instrument: Instrument
  onClose: () => void
}) {
  const navigate = useNavigate()
  const { quotes } = useLiveQuotes()
  const feed = instrument.feed
  const { candles, loading } = useCandles(feed ?? '', 15)

  const live = feed ? quotes[feed] : undefined
  const price = live?.price ?? instrument.price
  const changePct = live?.changePct ?? instrument.changePct
  const up = changePct >= 0
  const isLive = !!live && !live.stale

  const trade = () => {
    onClose()
    navigate(feed ? `/portal/trade?symbol=${encodeURIComponent(feed)}` : '/portal/trade')
  }

  return (
    <Modal open onClose={onClose} className="max-w-3xl">
      <div className="flex items-start justify-between gap-4 pr-8">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl font-semibold text-white">{instrument.symbol}</h2>
            <Badge tone="neutral">{instrument.category}</Badge>
            {isLive && (
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" title="Live price" aria-label="Live price" />
            )}
          </div>
          <p className="mt-0.5 text-sm text-gray-400">{instrument.name}</p>
        </div>
        <div className="text-right">
          <div className="font-mono text-2xl font-bold tabular-nums text-white">
            {formatNumber(price, price < 10 ? 4 : 2)}
          </div>
          <div className={cn('flex items-center justify-end gap-1 font-mono text-sm', up ? 'text-success' : 'text-brand-400')}>
            {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {up ? '+' : ''}
            {formatNumber(changePct, 2)}%
          </div>
        </div>
      </div>

      <div className="mt-5 h-[320px] rounded-xl border border-white/[0.06] bg-ink-800/40 p-3">
        {!feed ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-gray-500">
            Indicative pricing only. A live chart for {instrument.symbol} is available inside the trading terminal.
          </div>
        ) : candles.length > 1 ? (
          <PriceChart candles={candles} className="h-full w-full" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            {loading ? 'Loading chart…' : 'Building live candles… (streams in as ticks arrive)'}
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-gray-500">
          Spread from {formatNumber(instrument.spread, 1)} · simulated execution at live prices
        </p>
        <Button onClick={trade} className="gap-1">
          Trade {instrument.symbol} <ArrowUpRight className="h-4 w-4" />
        </Button>
      </div>
    </Modal>
  )
}
