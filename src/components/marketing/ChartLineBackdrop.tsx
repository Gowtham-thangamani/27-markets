/**
 * Faint upward line/area-chart backdrop — a subtle "growth" trading motif for
 * section backgrounds. Pure SVG (no assets), deterministic, theme-agnostic.
 * Render it absolutely-positioned and low-opacity behind section content;
 * decorative only (aria-hidden; pointer-events handled by caller classes).
 */

// Deterministic rising series across a 500×200 viewBox (y grows downward).
const POINTS: [number, number][] = [
  [0, 172], [56, 150], [112, 160], [168, 118], [224, 130],
  [280, 88], [336, 98], [392, 58], [448, 44], [500, 26],
]

const LINE = POINTS.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' ')
const AREA = `${LINE} L500 200 L0 200 Z`

export function ChartLineBackdrop({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 500 200"
      preserveAspectRatio="none"
      fill="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="growth-line-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e11d2e" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#e11d2e" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={AREA} fill="url(#growth-line-fill)" />
      <path d={LINE} stroke="#e11d2e" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}
