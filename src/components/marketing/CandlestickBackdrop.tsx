/**
 * Faint candlestick-chart backdrop — a subtle trading motif for section
 * backgrounds. Pure SVG (no assets), deterministic, theme-agnostic. Render it
 * absolutely-positioned and low-opacity behind section content; it is
 * decorative only (aria-hidden, pointer-events-none via the caller's classes).
 */

// A gentle up-trend price series (deterministic — no runtime randomness).
const PRICES = [42, 46, 40, 49, 53, 47, 56, 60, 54, 63, 68, 62, 71, 76, 70, 79, 84, 80, 88, 93]

const H = 120 // viewBox height
const STEP = 22 // horizontal spacing between candles
const BODY = 9 // candle body width
const PAD = 10

const yOf = (p: number) => H - 12 - p // higher price → higher on screen

export function CandlestickBackdrop({ className }: { className?: string }) {
  const width = PAD * 2 + (PRICES.length - 1) * STEP + BODY

  return (
    <svg
      className={className}
      viewBox={`0 0 ${width} ${H}`}
      preserveAspectRatio="none"
      fill="none"
      aria-hidden
    >
      {PRICES.map((price, i) => {
        const open = i === 0 ? price - 4 : PRICES[i - 1]
        const up = price >= open
        const yOpen = yOf(open)
        const yClose = yOf(price)
        const bodyTop = Math.min(yOpen, yClose)
        const bodyH = Math.max(2, Math.abs(yOpen - yClose))
        const x = PAD + i * STEP
        const cx = x + BODY / 2
        const wickHigh = bodyTop - (5 + (i % 3) * 3)
        const wickLow = bodyTop + bodyH + (5 + (i % 2) * 4)
        const color = up ? '#16a34a' : '#e11d2e'
        return (
          <g key={i} stroke={color} fill={color}>
            <line x1={cx} y1={wickHigh} x2={cx} y2={wickLow} strokeWidth={1.4} />
            <rect x={x} y={bodyTop} width={BODY} height={bodyH} rx={1} />
          </g>
        )
      })}
    </svg>
  )
}
