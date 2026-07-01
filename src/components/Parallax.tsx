import { useRef, type ReactNode } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'

interface ParallaxProps {
  children: ReactNode
  /**
   * Drift distance in px across the element's pass through the viewport.
   * Positive = element moves up as you scroll down (classic parallax).
   */
  amount?: number
  className?: string
}

/**
 * Wraps content in a scroll-linked vertical drift so it moves at a slightly
 * different rate than the page — adding depth as the user scrolls. Disabled for
 * users who prefer reduced motion. Uses a GPU transform (no layout thrash).
 */
export function Parallax({ children, amount = 50, className }: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [amount, -amount])

  return (
    <motion.div ref={ref} style={reduce ? undefined : { y }} className={className}>
      {children}
    </motion.div>
  )
}
