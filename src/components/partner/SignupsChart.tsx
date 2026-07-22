// src/components/partner/SignupsChart.tsx
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

/**
 * Roll daily points into weeks. At realistic referral volume a 90-point daily
 * series is mostly zeros with isolated 1-spikes — a comb that reads as noise.
 * Weekly buckets show the actual trend. Each bucket is labelled with the date
 * of the week it starts.
 */
function toWeekly(data: { date: string; signups: number }[]): { date: string; signups: number }[] {
  const weeks: { date: string; signups: number }[] = []
  for (let i = 0; i < data.length; i += 7) {
    const chunk = data.slice(i, i + 7)
    if (!chunk.length) continue
    weeks.push({ date: chunk[0].date, signups: chunk.reduce((s, p) => s + p.signups, 0) })
  }
  return weeks
}

export function SignupsChart({ data }: { data: { date: string; signups: number }[] }) {
  const weekly = toWeekly(data)
  return (
    <div className="glass-panel p-5">
      <h3 className="mb-1 text-sm font-semibold text-white">Referred signups</h3>
      <p className="mb-4 text-xs text-gray-500">Last 90 days, by week</p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={weekly} margin={{ top: 6, right: 8, bottom: 0, left: -16 }}>
            <defs>
              <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e11d2e" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#e11d2e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={(d: string) => d.slice(5)} minTickGap={24} />
            <YAxis allowDecimals={false} tick={{ fill: '#6b7280', fontSize: 11 }} width={28} />
            <Tooltip
              contentStyle={{ background: '#0b0d12', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
              labelStyle={{ color: '#e5e7eb' }}
              labelFormatter={(d: string) => `Week of ${d}`}
              formatter={(v: number) => [v, 'Signups']}
            />
            <Area type="monotone" dataKey="signups" stroke="#e11d2e" fill="url(#sg)" strokeWidth={2} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
