import { cn } from '@/lib/cn'

/** Static stylized candlestick + line chart used inside device mockups. */
export function MiniChart({ className }: { className?: string }) {
  const candles = [
    { x: 8, o: 60, c: 40, h: 32, l: 66, up: true },
    { x: 22, o: 44, c: 52, h: 38, l: 58, up: false },
    { x: 36, o: 50, c: 34, h: 28, l: 56, up: true },
    { x: 50, o: 38, c: 46, h: 32, l: 52, up: false },
    { x: 64, o: 42, c: 26, h: 20, l: 48, up: true },
    { x: 78, o: 30, c: 38, h: 24, l: 44, up: false },
    { x: 92, o: 34, c: 22, h: 16, l: 40, up: true },
    { x: 106, o: 26, c: 32, h: 20, l: 38, up: false },
    { x: 120, o: 30, c: 18, h: 12, l: 34, up: true },
  ]
  return (
    <svg viewBox="0 0 140 80" className={cn('h-full w-full', className)} preserveAspectRatio="none">
      <defs>
        <linearGradient id="mc-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#e11d2e" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#ff5663" />
        </linearGradient>
      </defs>
      {[16, 32, 48, 64].map((y) => (
        <line key={y} x1="0" y1={y} x2="140" y2={y} stroke="#ffffff" strokeOpacity="0.04" />
      ))}
      {candles.map((c, i) => {
        const color = c.up ? '#22c55e' : '#e11d2e'
        const top = Math.min(c.o, c.c)
        const height = Math.max(2, Math.abs(c.o - c.c))
        return (
          <g key={i}>
            <line x1={c.x} y1={c.h} x2={c.x} y2={c.l} stroke={color} strokeWidth="1" opacity="0.7" />
            <rect x={c.x - 3} y={top} width="6" height={height} fill={color} rx="1" />
          </g>
        )
      })}
      <path
        d="M5 58 L19 50 L33 54 L47 44 L61 48 L75 36 L89 40 L103 28 L117 32 L131 22"
        fill="none"
        stroke="url(#mc-line)"
        strokeWidth="1.6"
        strokeLinecap="round"
        style={{ filter: 'drop-shadow(0 0 3px rgba(225,29,46,0.6))' }}
      />
    </svg>
  )
}
