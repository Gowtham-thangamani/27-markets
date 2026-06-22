import { motion } from 'framer-motion'
import { useReducedMotion } from '@/lib/hooks'
import { cn } from '@/lib/cn'

/**
 * Glowing red market waveform line. SVG-based for crisp rendering and
 * low cost; the line animates by drawing itself, then a pulse travels across.
 */
export function MarketWave({ className }: { className?: string }) {
  const reduced = useReducedMotion()
  const d =
    'M0 160 C 80 160 110 90 170 95 C 230 100 250 40 320 70 C 380 95 410 30 470 60 C 540 95 560 150 620 140 C 690 128 720 60 800 80'

  return (
    <svg
      viewBox="0 0 800 220"
      className={cn('h-full w-full overflow-visible', className)}
      fill="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="wave-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#e11d2e" stopOpacity="0" />
          <stop offset="20%" stopColor="#e11d2e" stopOpacity="0.9" />
          <stop offset="80%" stopColor="#ff5663" stopOpacity="1" />
          <stop offset="100%" stopColor="#ff5663" stopOpacity="0.2" />
        </linearGradient>
        <filter id="wave-glow" x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Soft area fill under the line */}
      <motion.path
        d={`${d} L 800 220 L 0 220 Z`}
        fill="url(#wave-grad)"
        opacity={0.08}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.08 }}
        transition={{ duration: 1.2 }}
      />

      {/* Main glowing line draws itself in */}
      <motion.path
        d={d}
        stroke="url(#wave-grad)"
        strokeWidth={3}
        strokeLinecap="round"
        filter="url(#wave-glow)"
        initial={reduced ? { pathLength: 1 } : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2, ease: 'easeInOut' }}
      />

      {/* Travelling pulse dot (CSS-driven along the path) */}
      {!reduced && (
        <circle
          r={5}
          fill="#fff"
          filter="url(#wave-glow)"
          className="wave-dot"
          style={{ offsetPath: `path("${d}")` } as React.CSSProperties}
        />
      )}
    </svg>
  )
}
