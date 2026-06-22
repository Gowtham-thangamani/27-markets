import { cn } from '@/lib/cn'

interface LogoProps {
  className?: string
  withWordmark?: boolean
  size?: number
}

/** Apex Markets brand mark — an infinity loop rendered in vivid red. */
export function Logo({ className, withWordmark = true, size = 30 }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        aria-hidden
        className="drop-shadow-[0_0_8px_rgba(225,29,46,0.55)]"
      >
        <path
          d="M16 32c0-6 4-10 9-10s8 4 11 10c3 6 6 10 11 10s9-4 9-10-4-10-9-10-8 4-11 10c-3 6-6 10-11 10s-9-4-9-10z"
          stroke="#e11d2e"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>
      {withWordmark && (
        <span className="font-display text-lg font-bold tracking-tight text-white">
          APEX<span className="text-brand-500">MARKETS</span>
        </span>
      )}
    </span>
  )
}
