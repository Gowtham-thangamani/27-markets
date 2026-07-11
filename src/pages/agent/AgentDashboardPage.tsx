import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { UserPlus, LifeBuoy, CheckCircle2, Clock, type LucideIcon } from 'lucide-react'
import { PageTitle } from '@/components/portal/PageTitle'
import { Button, SkeletonRows, ErrorState } from '@/components/ui'
import { agentApi, type AgentSummary } from '@/lib/agentApi'
import { ApiError } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

function Kpi({ icon: Icon, label, value, tone = 'brand' }: { icon: LucideIcon; label: string; value: number; tone?: 'brand' | 'success' | 'warning' }) {
  const ring =
    tone === 'success' ? 'text-success bg-success/10' : tone === 'warning' ? 'text-warning bg-warning/10' : 'text-brand-400 bg-brand-500/10'
  return (
    <div className="glass-panel flex items-center gap-4 p-5">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${ring} ring-1 ring-white/10`}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <div className="font-display text-2xl font-bold tabular-nums text-white">{value}</div>
        <div className="text-xs text-gray-400">{label}</div>
      </div>
    </div>
  )
}

export default function AgentDashboardPage() {
  const { user } = useAuth()
  const [summary, setSummary] = useState<AgentSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setError(null)
    agentApi
      .summary()
      .then(setSummary)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  return (
    <>
      <PageTitle title={`Welcome, ${user?.name?.split(' ')[0] ?? 'Agent'}`} subtitle="Your assigned leads and support tickets at a glance." />

      {error ? (
        <ErrorState description={error} onRetry={load} />
      ) : loading || !summary ? (
        <SkeletonRows />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi icon={UserPlus} label="Total leads" value={summary.leads.total} />
            <Kpi icon={Clock} label="New / uncontacted" value={summary.leads.new} tone="warning" />
            <Kpi icon={CheckCircle2} label="Converted" value={summary.leads.converted} tone="success" />
            <Kpi icon={LifeBuoy} label="Open tickets" value={summary.tickets.open} tone="warning" />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="glass-panel p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-base font-semibold text-white">Lead pipeline</h3>
                <Link to="/agent/leads">
                  <Button variant="outline" size="sm">View leads</Button>
                </Link>
              </div>
              <ul className="space-y-2.5 text-sm">
                {([
                  ['New', summary.leads.new],
                  ['Contacted', summary.leads.contacted],
                  ['Qualified', summary.leads.qualified],
                  ['Converted', summary.leads.converted],
                  ['Lost', summary.leads.lost],
                ] as const).map(([label, n]) => (
                  <li key={label} className="flex items-center justify-between">
                    <span className="text-gray-400">{label}</span>
                    <span className="font-mono tabular-nums text-white">{n}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="glass-panel p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-base font-semibold text-white">Support tickets</h3>
                <Link to="/agent/tickets">
                  <Button variant="outline" size="sm">View tickets</Button>
                </Link>
              </div>
              <ul className="space-y-2.5 text-sm">
                <li className="flex items-center justify-between">
                  <span className="text-gray-400">Open / in progress</span>
                  <span className="font-mono tabular-nums text-white">{summary.tickets.open}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-gray-400">Total assigned</span>
                  <span className="font-mono tabular-nums text-white">{summary.tickets.total}</span>
                </li>
              </ul>
            </div>
          </div>
        </>
      )}
    </>
  )
}
