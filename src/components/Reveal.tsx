import { motion, type Variants } from 'framer-motion'
import type { ReactNode } from 'react'
import { fadeUp } from '@/lib/motion'

interface RevealProps {
  children: ReactNode
  variants?: Variants
  className?: string
  delay?: number
  /** Trigger margin so reveals fire slightly before fully in view. */
  amount?: number
}

/** Scroll-triggered reveal wrapper. Honors reduced motion via Framer. */
export function Reveal({
  children,
  variants = fadeUp,
  className,
  delay = 0,
  amount = 0.2,
}: RevealProps) {
  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  )
}
