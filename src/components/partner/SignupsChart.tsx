// src/components/partner/SignupsChart.tsx
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export function SignupsChart({ data }: { data: { date: string; signups: number }[] }) {
  return (
    <div className="glass-panel p-5">
      <h3 className="mb-4 text-sm font-semibold text-white">Referred signups (90d)</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -16 }}>
            <defs>
              <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e11d2e" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#e11d2e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={(d: string) => d.slice(5)} minTickGap={24} />
            <YAxis allowDecimals={false} tick={{ fill: '#6b7280', fontSize: 11 }} width={28} />
            <Tooltip contentStyle={{ background: '#0b0d12', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} labelStyle={{ color: '#e5e7eb' }} />
            <Area type="monotone" dataKey="signups" stroke="#e11d2e" fill="url(#sg)" strokeWidth={2} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
