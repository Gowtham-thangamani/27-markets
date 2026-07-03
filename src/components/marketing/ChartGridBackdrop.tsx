/**
 * XM-style trading data-viz backdrop: a perspective grid "floor" plus flowing
 * multi-line charts rising to the right. Pure SVG (no assets), deterministic,
 * brand-tinted. Render absolutely-positioned + low-opacity behind hero content;
 * decorative only (aria-hidden). Animation respects reduced motion via the
 * global `prefers-reduced-motion` CSS rule.
 */

const W = 1200
const H = 600
const HORIZON = 300
const VPX = 600

// Vertical lines fanning from a wide bottom edge to the vanishing point.
const VERTICALS: string[] = []
for (let i = 0; i <= 24; i++) {
  const xBottom = -600 + (i / 24) * 2400
  VERTICALS.push(`M${xBottom} ${H} L${VPX} ${HORIZON}`)
}

// Horizontal lines getting denser toward the horizon (perspective easing).
const HORIZONTALS: number[] = []
for (let i = 1; i <= 10; i++) {
  const t = i / 10
  HORIZONTALS.push(HORIZON + t * t * (H - HORIZON))
}

// Flowing chart lines (rising left → right), plus an area fill under the top one.
const LINE1 = 'M0 300 C 200 280 340 200 500 230 S 820 130 1000 160 S 1160 90 1200 80'
const LINE1_AREA = `${LINE1} L1200 300 L0 300 Z`
const LINE2 = 'M0 340 C 220 330 360 260 520 290 S 860 200 1040 220 S 1180 150 1200 140'
const LINE3 = 'M0 380 C 200 380 380 320 540 340 S 900 270 1080 250 S 1200 200 1200 190'

const DOTS: [number, number][] = [
  [500, 230],
  [1000, 160],
  [520, 290],
  [1040, 220],
]

export function ChartGridBackdrop({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMax slice"
      fill="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="cg-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e11d2e" stopOpacity="0" />
          <stop offset="70%" stopColor="#e11d2e" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#e11d2e" stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id="cg-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e11d2e" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#e11d2e" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Perspective grid floor */}
      <g stroke="url(#cg-floor)" strokeWidth="1">
        {VERTICALS.map((d, i) => (
          <path key={`v${i}`} d={d} />
        ))}
        {HORIZONTALS.map((y, i) => (
          <line key={`h${i}`} x1="0" y1={y} x2={W} y2={y} />
        ))}
      </g>

      {/* Flowing multi-line chart */}
      <g className="chartgrid-lines">
        <path d={LINE1_AREA} fill="url(#cg-area)" />
        <path d={LINE1} stroke="#ff5663" strokeWidth="2.5" strokeLinecap="round" />
        <path d={LINE2} stroke="#e11d2e" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
        <path d={LINE3} stroke="#c41323" strokeWidth="1.6" strokeLinecap="round" opacity="0.6" />
        {DOTS.map(([x, y], i) => (
          <circle key={`d${i}`} cx={x} cy={y} r="4" fill="#ff5663" />
        ))}
      </g>
    </svg>
  )
}
