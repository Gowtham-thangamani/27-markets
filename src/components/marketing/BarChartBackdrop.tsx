/**
 * Faint volume bar-chart backdrop — a subtle trading motif for section
 * backgrounds. Pure SVG (no assets), deterministic, theme-agnostic. Render
 * absolutely-positioned and low-opacity behind section content; decorative
 * only (aria-hidden; pointer-events handled by caller classes).
 */

// Deterministic volume-bar heights (out of ~120), with a gentle rising bias.
const BARS = [30, 52, 40, 64, 48, 74, 58, 82, 66, 92, 74, 98, 62, 86, 52, 78]

const H = 120
const STEP = 24
const BAR_W = 12
const PAD = 8

export function BarChartBackdrop({ className }: { className?: string }) {
  const width = PAD * 2 + (BARS.length - 1) * STEP + BAR_W
  return (
    <svg
      className={className}
      viewBox={`0 0 ${width} ${H}`}
      preserveAspectRatio="none"
      aria-hidden
      fill="#e11d2e"
    >
      {BARS.map((h, i) => (
        <rect key={i} x={PAD + i * STEP} y={H - h} width={BAR_W} height={h} rx={2} />
      ))}
    </svg>
  )
}
