import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface PageTitleProps {
  title: string
  subtitle?: string
  action?: ReactNode
}

export function PageTitle({ title, subtitle, action }: PageTitleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <h1 className="font-display text-2xl font-bold text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-400">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </motion.div>
  )
}
