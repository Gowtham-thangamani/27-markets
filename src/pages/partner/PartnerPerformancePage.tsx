import { useCallback, useEffect, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { TrendingUp } from 'lucide-react'
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { formatCurrency } from '@/lib/format'
import { ApiError } from '@/lib/api'
import { partnerApi, type PartnerPerformance } from '@/lib/partnerApi'

const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 100) : 0)

/** A single stage of the signup → funded funnel, with its bar and rate. */
function FunnelStage({ label, value, of, tone }: { label: string; value: number; of: number; tone: string }) {
  const width = pct(value, of)
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-gray-300">{label}</span>
        <span className="text-white">{value}<span className="ml-1.5 text-xs text-gray-500">{width}%</span></span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(width, value > 0 ? 3 : 0)}%` }} />
      </div>
    </div>
  )
}

export default function PartnerPerformancePage() {
  const [data, setData] = useState<PartnerPerformance | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try { setData(await partnerApi.getPerformance()) }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Failed to load') }
  }, [])
  useEffect(() => { void load() }, [load])

  const totalEarnings = data?.earnings.reduce((s, e) => s + e.amount, 0) ?? 0

  return (
    <>
      <PageTitle title="Performance" subtitle="Where your signups come from and how they convert." />
      {error ? <ErrorState description={error} onRetry={load} />
        : !data ? <SkeletonRows rows={6} />
        : data.funnel.signups === 0 ? (
          <EmptyState icon={TrendingUp} title="No data yet" description="Refer your first clients to see conversion and campaign performance." />
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
              {/* Conversion funnel */}
              <div className="glass-panel p-5">
                <h3 className="mb-1 text-sm font-semibold text-white">Conversion funnel</h3>
                <p className="mb-4 text-xs text-gray-500">How referred clients progress to funded traders.</p>
                <div className="space-y-4">
                  <FunnelStage label="Signed up" value={data.funnel.signups} of={data.funnel.signups} tone="bg-brand-500" />
                  <FunnelStage label="KYC verified" value={data.funnel.kycVerified} of={data.funnel.signups} tone="bg-amber-400" />
                  <FunnelStage label="Funded" value={data.funnel.funded} of={data.funnel.signups} tone="bg-success" />
                </div>
                <div className="mt-4 rounded-lg border border-white/[0.06] bg-ink-800/50 p-3 text-xs text-gray-400">
                  Signup → funded conversion: <span className="font-semibold text-white">{pct(data.funnel.funded, data.funnel.signups)}%</span>
                </div>
              </div>

              {/* Earnings trend */}
              <div className="glass-panel p-5">
                <div className="flex items-baseline justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Earnings</h3>
                    <p className="text-xs text-gray-500">Commission per month, last 12 months</p>
                  </div>
                  <div className="font-display text-lg font-bold text-success">{formatCurrency(totalEarnings)}</div>
                </div>
                <div className="mt-3 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.earnings} margin={{ top: 6, right: 8, bottom: 0, left: -12 }}>
                      <defs>
                        <linearGradient id="earn" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#22c55e" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={(m: string) => m.slice(5)} minTickGap={16} />
                      <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} width={40} tickFormatter={(v: number) => `$${v}`} />
                      <Tooltip
                        contentStyle={{ background: '#0b0d12', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
                        labelStyle={{ color: '#e5e7eb' }}
                        formatter={(v: number) => [formatCurrency(v), 'Commission']}
                      />
                      <Area type="monotone" dataKey="amount" stroke="#22c55e" fill="url(#earn)" strokeWidth={2} isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Campaign performance */}
            <div className="glass-panel mt-4 overflow-x-auto">
              <div className="border-b border-white/[0.06] px-5 py-4">
                <h3 className="text-sm font-semibold text-white">Campaign performance</h3>
                <p className="mt-0.5 text-xs text-gray-500">Which channels drive signups, funding, and commission. Tag links from Referral Tools.</p>
              </div>
              <table className="w-full min-w-[720px] text-sm">
                <thead><tr className="text-left text-xs text-gray-500">
                  <th className="px-5 py-3 font-medium">Campaign</th>
                  <th className="px-5 py-3 font-medium text-right">Signups</th>
                  <th className="px-5 py-3 font-medium text-right">Funded</th>
                  <th className="px-5 py-3 font-medium text-right">Conversion</th>
                  <th className="px-5 py-3 font-medium text-right">Deposits</th>
                  <th className="px-5 py-3 font-medium text-right">Commission</th>
                </tr></thead>
                <tbody>
                  {data.campaigns.map((c) => (
                    <tr key={c.campaign} className="border-t border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="px-5 py-3 text-white">{c.campaign}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-gray-300">{c.signups}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-gray-300">{c.funded}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-gray-400">{pct(c.funded, c.signups)}%</td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums text-white">{formatCurrency(c.deposits)}</td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums text-success">{formatCurrency(c.commission)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
    </>
  )
}
