import { cn } from '@/lib/cn'
import { asset } from '@/lib/asset'
import { useThemeSafe } from '@/context/ThemeContext'

interface LogoProps {
  className?: string
  /** Kept for API compatibility — the brand image is a single self-contained mark. */
  withWordmark?: boolean
  /** Rendered height of the logo in pixels. */
  size?: number
}

/**
 * 27 Markets brand mark. Theme-aware: the white wordmark on dark surfaces, the
 * black wordmark on light — both share the red "27" + arrow accent. Deterministic
 * (theme-driven), so it never depends on a missing asset or an onError race.
 */
export function Logo({ className, size = 48 }: LogoProps) {
  const onLight = useThemeSafe() === 'light'

  return (
    <span className={cn('inline-flex items-center', className)}>
      {/* inline height overrides Tailwind preflight `img { height: auto }` */}
      <img
        src={asset(onLight ? 'logo-black.png' : 'logo-white.png')}
        alt="27 Markets"
        style={{ height: size, width: 'auto' }}
        className="select-none"
      />
    </span>
  )
}
