import { motion } from 'framer-motion'
import { cn } from '@/lib/cn'

interface ProgressBarProps {
  value: number // 0-100
  className?: string
  showLabel?: boolean
  tone?: 'brand' | 'success'
}

export function ProgressBar({ value, className, showLabel, tone = 'brand' }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div className={cn('w-full', className)}>
      <div className="h-2 w-full overflow-hidden rounded-full bg-ink-400">
        <motion.div
          className={cn(
            'h-full rounded-full',
            tone === 'brand'
              ? 'bg-gradient-to-r from-brand-600 to-brand-400 shadow-[0_0_12px_rgba(225,29,46,0.5)]'
              : 'bg-gradient-to-r from-success/80 to-success'
          )}
          initial={{ width: 0 }}
          whileInView={{ width: `${clamped}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      {showLabel && (
        <div className="mt-1.5 text-right text-xs font-medium text-gray-400">
          {Math.round(clamped)}%
        </div>
      )}
    </div>
  )
}
