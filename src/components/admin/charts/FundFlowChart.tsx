import { useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DailyPoint } from '@/lib/adminApi'
import { cn } from '@/lib/cn'

const RANGES = [30, 90] as const

export function FundFlowChart({ series }: { series: DailyPoint[] }) {
  const [range, setRange] = useState<(typeof RANGES)[number]>(30)
  const data = series.slice(-range)
  return (
    <div className="glass-panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Fund Flow</h3>
        <div className="flex gap-1 rounded-lg bg-ink-800/60 p-0.5">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn('rounded-md px-2.5 py-1 text-xs', range === r ? 'bg-brand-500/20 text-brand-300' : 'text-gray-400 hover:text-white')}
            >
              {r}D
            </button>
          ))}
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -16 }}>
            <defs>
              <linearGradient id="dep" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="wd" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e11d2e" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#e11d2e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={(d: string) => d.slice(5)} minTickGap={24} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} width={48} />
            <Tooltip contentStyle={{ background: '#0b0d12', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} labelStyle={{ color: '#e5e7eb' }} />
            <Area type="monotone" dataKey="deposits" stroke="#22c55e" fill="url(#dep)" strokeWidth={2} isAnimationActive={false} />
            <Area type="monotone" dataKey="withdrawals" stroke="#e11d2e" fill="url(#wd)" strokeWidth={2} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
