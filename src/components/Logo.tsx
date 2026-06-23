import { cn } from '@/lib/cn'

interface LogoProps {
  className?: string
  /** Kept for API compatibility — the brand image is a single self-contained mark. */
  withWordmark?: boolean
  /** Rendered height of the logo in pixels. */
  size?: number
}

/** 27 Markets brand mark — rendered from the brand logo image (transparent PNG). */
export function Logo({ className, size = 48 }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center', className)}>
      {/* inline height overrides Tailwind preflight `img { height: auto }` */}
      <img
        src="/logo.png"
        alt="27 Markets"
        style={{ height: size, width: 'auto' }}
        className="select-none drop-shadow-[0_0_8px_rgba(225,29,46,0.4)]"
      />
    </span>
  )
}
