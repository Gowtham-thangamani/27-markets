import { useEffect, useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, Scale, Users } from 'lucide-react'
import { KpiWidget } from '@/components/portal/KpiWidget'
import { PageTitle } from '@/components/portal/PageTitle'
import { SkeletonRows, ErrorState } from '@/components/ui'
import { adminApi, type ReportsSummary } from '@/lib/adminApi'

const FUNNEL_ORDER = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST'] as const

export default function AdminReportsPage() {
  const [data, setData] = useState<ReportsSummary | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    adminApi
      .getReports()
      .then((d) => active && setData(d))
      .catch(() => active && setError(true))
    return () => {
      active = false
    }
  }, [])

  if (error) return <ErrorState title="Could not load reports" description="Please try again shortly." />
  if (!data) return <SkeletonRows rows={5} />

  const tiles = [
    { icon: ArrowDownToLine, label: 'Deposits', value: Number(data.deposits), money: true },
    { icon: ArrowUpFromLine, label: 'Withdrawals', value: Number(data.withdrawals), money: true },
    { icon: Scale, label: 'Net Flow', value: Number(data.netFlow), money: true },
    { icon: Users, label: 'Total Clients', value: data.totalClients, money: false },
  ]
  const maxFunnel = Math.max(1, ...FUNNEL_ORDER.map((s) => data.funnel[s] ?? 0))

  return (
    <>
      <PageTitle title="Reports" subtitle="Financial overview and lead conversion." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((t) => (
          <KpiWidget
            key={t.label}
            icon={t.icon}
            label={t.label}
            value={t.value}
            prefix={t.money ? '$' : ''}
            decimals={t.money ? 2 : 0}
          />
        ))}
      </div>

      <div className="glass-panel mt-6 p-5">
        <h3 className="mb-4 text-sm font-semibold text-white">Lead Conversion Funnel</h3>
        <div className="space-y-3">
          {FUNNEL_ORDER.map((s) => {
            const v = data.funnel[s] ?? 0
            return (
              <div key={s} className="flex items-center gap-3">
                <span className="w-24 text-xs text-gray-400">{s}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-700">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${(v / maxFunnel) * 100}%` }} />
                </div>
                <span className="w-8 text-right text-sm text-white">{v}</span>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
