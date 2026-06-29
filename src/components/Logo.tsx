import { useState } from 'react'
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
 * 27 Markets brand mark. Swaps to a light-theme asset automatically:
 *  - dark  → logo.png (white wordmark)
 *  - light → logo-light.png if present; otherwise falls back to logo.png on a
 *    subtle dark chip so the white wordmark stays legible on light surfaces.
 * Drop a `public/logo-light.png` (dark wordmark) and it's used with no chip.
 */
export function Logo({ className, size = 48 }: LogoProps) {
  const theme = useThemeSafe()
  const [lightMissing, setLightMissing] = useState(false)
  const useLightAsset = theme === 'light' && !lightMissing
  const needsChip = theme === 'light' && lightMissing

  return (
    <span className={cn('inline-flex items-center', needsChip && 'rounded-lg bg-[#0a0a0a] px-2.5 py-1.5', className)}>
      {/* inline height overrides Tailwind preflight `img { height: auto }` */}
      <img
        src={asset(useLightAsset ? 'logo-light.png' : 'logo.png')}
        alt="27 Markets"
        onError={() => {
          if (useLightAsset) setLightMissing(true) // no light asset yet → fall back to the chip
        }}
        style={{ height: size, width: 'auto' }}
        className="select-none drop-shadow-[0_0_8px_rgba(225,29,46,0.4)]"
      />
    </span>
  )
}
