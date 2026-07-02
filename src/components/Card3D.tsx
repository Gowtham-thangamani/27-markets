import { useRef, useState, type ReactNode, type MouseEvent } from 'react'
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/cn'

interface Card3DProps {
  children: ReactNode
  className?: string
  /** Max tilt in degrees toward the cursor. */
  intensity?: number
  /** Cursor-follow spotlight glare overlay. */
  glare?: boolean
}

/**
 * Reusable "3D card" wrapper: perspective tilt toward the cursor plus a soft
 * red spotlight glare that follows the pointer. Falls back to a plain static
 * wrapper when the user prefers reduced motion or is on a touch / coarse
 * pointer device. Transform/opacity only — GPU-friendly, no layout thrash.
 */
export function Card3D({ children, className, intensity = 7, glare = true }: Card3DProps) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const mvX = useMotionValue(0)
  const mvY = useMotionValue(0)
  const rotateX = useSpring(mvX, { stiffness: 260, damping: 22 })
  const rotateY = useSpring(mvY, { stiffness: 260, damping: 22 })
  const [glarePos, setGlarePos] = useState<{ x: number; y: number } | null>(null)
  const [coarse] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(hover: none), (pointer: coarse)').matches,
  )

  // Reduced-motion or touch/coarse pointer → static wrapper, no tilt/glare.
  if (reduce || coarse) {
    return <div className={cn('relative', className)}>{children}</div>
  }

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const nx = (e.clientX - r.left) / r.width - 0.5
    const ny = (e.clientY - r.top) / r.height - 0.5
    mvY.set(nx * intensity * 2) // horizontal cursor → rotateY
    mvX.set(-ny * intensity * 2) // vertical cursor → rotateX (top tilts back)
    if (glare) setGlarePos({ x: (nx + 0.5) * 100, y: (ny + 0.5) * 100 })
  }

  const onLeave = () => {
    mvX.set(0)
    mvY.set(0)
    setGlarePos(null)
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX, rotateY, transformPerspective: 900, transformStyle: 'preserve-3d' }}
      className={cn('relative', className)}
    >
      {children}
      {glare && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 rounded-2xl transition-opacity duration-200"
          style={{
            opacity: glarePos ? 1 : 0,
            background: glarePos
              ? `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(225,29,46,0.20), transparent 55%)`
              : undefined,
            mixBlendMode: 'screen',
          }}
        />
      )}
    </motion.div>
  )
}
