import { useCandles } from '@/lib/useCandles'
import { cn } from '@/lib/cn'

/** Tiny SVG line from a series of numbers, coloured by direction. */
export function Sparkline({ data, up, className }: { data: number[]; up?: boolean; className?: string }) {
  if (data.length < 2) return <div className={cn('h-full w-full', className)} />
  const w = 120
  const h = 36
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`)
    .join(' ')
  const rising = up !== undefined ? up : data[data.length - 1] >= data[0]
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={cn('h-full w-full', className)}>
      <polyline
        points={pts}
        fill="none"
        stroke={rising ? '#22c55e' : '#e11d2e'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Sparkline that fetches a symbol's real candle closes itself. */
export function SymbolSparkline({ symbol, up, className }: { symbol: string; up?: boolean; className?: string }) {
  const { candles } = useCandles(symbol, 30, 30000)
  return <Sparkline data={candles.map((c) => c.close)} up={up} className={className} />
}
