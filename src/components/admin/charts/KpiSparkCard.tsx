import type { LucideIcon } from 'lucide-react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/cn'

interface Props {
  icon: LucideIcon
  label: string
  value: string
  delta?: number | null
  spark: number[]
}

export function KpiSparkCard({ icon: Icon, label, value, delta, spark }: Props) {
  const data = spark.map((y, x) => ({ x, y }))
  const showDelta = delta !== undefined && delta !== null
  const up = (delta ?? 0) >= 0
  return (
    <div className="glass-panel card-lift relative overflow-hidden p-5">
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 bg-radial-red opacity-40 blur-xl" />
      <div className="relative flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/20">
          <Icon className="h-5 w-5" />
        </span>
        {showDelta && (
          <span className={cn('flex items-center gap-1 text-xs font-medium', up ? 'text-success' : 'text-brand-400')}>
            {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {Math.abs(delta as number).toFixed(1)}%
          </span>
        )}
      </div>
      <div className="relative mt-4 font-display text-2xl font-bold text-white">{value}</div>
      <div className="relative mt-0.5 text-sm text-gray-400">{label}</div>
      <div className="relative mt-3 h-10">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`spark-${label.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e11d2e" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#e11d2e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="y" stroke="#e11d2e" strokeWidth={1.5} fill={`url(#spark-${label.replace(/\s/g, '')})`} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
