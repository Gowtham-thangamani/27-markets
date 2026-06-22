import type { LucideIcon } from 'lucide-react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { useCountUp, useInView } from '@/lib/hooks'
import { cn } from '@/lib/cn'

interface KpiWidgetProps {
  icon: LucideIcon
  label: string
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
  delta?: number
}

export function KpiWidget({
  icon: Icon,
  label,
  value,
  prefix = '',
  suffix = '',
  decimals = 2,
  delta,
}: KpiWidgetProps) {
  const { ref, inView } = useInView<HTMLDivElement>()
  const animated = useCountUp(value, inView)

  return (
    <div ref={ref} className="glass-panel card-lift relative overflow-hidden p-5">
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 bg-radial-red opacity-40 blur-xl" />
      <div className="relative flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/20">
          <Icon className="h-5 w-5" />
        </span>
        {delta !== undefined && (
          <span
            className={cn(
              'flex items-center gap-1 text-xs font-medium',
              delta >= 0 ? 'text-success' : 'text-brand-400'
            )}
          >
            {delta >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {Math.abs(delta).toFixed(2)}%
          </span>
        )}
      </div>
      <div className="relative mt-4 font-display text-2xl font-bold text-white">
        {prefix}
        {animated.toLocaleString('en-US', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })}
        {suffix}
      </div>
      <div className="relative mt-0.5 text-sm text-gray-400">{label}</div>
    </div>
  )
}
