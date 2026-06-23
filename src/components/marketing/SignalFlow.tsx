import { cn } from '@/lib/cn'

// Staggered vertical streaks (position + start delay).
const LINES = [
  { left: '6%', delay: '0s' },
  { left: '18%', delay: '1.6s' },
  { left: '31%', delay: '3.2s' },
  { left: '44%', delay: '0.8s' },
  { left: '57%', delay: '2.4s' },
  { left: '70%', delay: '4s' },
  { left: '83%', delay: '1.2s' },
  { left: '94%', delay: '3s' },
]

/** Vertical red "data signal" streaks — ported from the 27 Markets landing page. */
export function SignalFlow({ className }: { className?: string }) {
  return (
    <div className={cn('signal-rail', className)} aria-hidden>
      {LINES.map((l, i) => (
        <span key={i} className="signal-line" style={{ left: l.left, animationDelay: l.delay }} />
      ))}
    </div>
  )
}
