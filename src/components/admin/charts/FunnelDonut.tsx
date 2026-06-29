import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

interface Slice { label: string; value: number; color: string }

export function FunnelDonut({ title, data }: { title: string; data: Slice[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <div className="glass-panel p-5">
      <h3 className="mb-2 text-sm font-semibold text-white">{title}</h3>
      <div className="flex items-center gap-4">
        <div className="h-44 w-44 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="label" innerRadius={52} outerRadius={76} paddingAngle={2} stroke="none" isAnimationActive={false}>
                {data.map((d) => <Cell key={d.label} fill={d.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#0b0d12', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="space-y-1.5 text-sm">
          {data.map((d) => (
            <li key={d.label} className="flex items-center gap-2 text-gray-300">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
              <span className="flex-1">{d.label}</span>
              <span className="font-medium text-white">{d.value}</span>
              <span className="w-10 text-right text-xs text-gray-500">{total ? Math.round((d.value / total) * 100) : 0}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
