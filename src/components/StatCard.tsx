import type { LucideIcon } from 'lucide-react'
import { useCountUp, useInView } from '@/lib/hooks'
import { cn } from '@/lib/cn'

interface StatCardProps {
  icon?: LucideIcon
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
  label: string
  sublabel?: string
  className?: string
}

/** KPI stat with an animated count-up triggered on scroll into view. */
export function StatCard({
  icon: Icon,
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  label,
  sublabel,
  className,
}: StatCardProps) {
  const { ref, inView } = useInView<HTMLDivElement>()
  const animated = useCountUp(value, inView)

  return (
    <div
      ref={ref}
      className={cn(
        'glass-panel card-lift flex flex-col gap-1 p-5',
        className
      )}
    >
      {Icon && (
        <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/10 text-brand-400">
          <Icon className="h-5 w-5" />
        </div>
      )}
      <div className="font-display text-2xl font-bold text-white sm:text-3xl">
        {prefix}
        {animated.toLocaleString('en-US', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })}
        {suffix}
      </div>
      <div className="text-sm font-medium text-gray-300">{label}</div>
      {sublabel && <div className="text-xs text-gray-500">{sublabel}</div>}
    </div>
  )
}
