import type { LucideIcon } from 'lucide-react'
import { Card3D } from '@/components/Card3D'
import { useCountUp, useInView } from '@/lib/hooks'

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
    <Card3D className={className}>
      <div ref={ref} className="glass-panel card-lift relative flex h-full flex-col gap-1 p-5">
      {Icon && (
        <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/10 text-brand-400">
          <Icon className="h-5 w-5" />
        </div>
      )}
      <div className="font-display text-2xl font-bold tabular-nums text-white sm:text-3xl">
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
    </Card3D>
  )
}
