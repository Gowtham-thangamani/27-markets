import { useCallback, useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Badge, ErrorState, SkeletonCard } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { initials, formatDate, formatCurrency } from '@/lib/format'
import { ApiError } from '@/lib/api'
import { partnerApi, type PartnerClientDetail } from '@/lib/partnerApi'

const KYC_TONE: Record<string, 'success' | 'warning' | 'neutral' | 'danger'> = {
  APPROVED: 'success', PENDING: 'warning', NOT_SUBMITTED: 'neutral', REJECTED: 'danger',
}
const CONVERSION_LABEL: Record<string, string> = {
  NO_ANSWER: 'No Answer', ON_BOARDING: 'On Boarding', CONVERTED: 'Converted', NOT_INTERESTED: 'Not Interested',
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><div className="text-xs text-gray-500">{label}</div><div className="mt-0.5 text-sm text-white">{value}</div></div>
}

export default function PartnerClientDetailPage() {
  const { id = '' } = useParams()
  const [data, setData] = useState<PartnerClientDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try { setData(await partnerApi.getClientDetail(id)) }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Failed to load') }
  }, [id])
  useEffect(() => { void load() }, [load])

  return (
    <>
      <Link to="/partner/clients" className="mb-3 inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Referred Clients
      </Link>
      {error ? <ErrorState description={error} onRetry={load} />
        : !data ? <div className="grid gap-4 lg:grid-cols-2"><SkeletonCard /><SkeletonCard /></div>
        : (
          <>
            <div className="mb-4 flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-500/15 text-sm font-semibold text-brand-300 ring-1 ring-brand-500/30">{initials(data.name)}</span>
              <div>
                <PageTitle title={data.name} subtitle={data.email} />
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
              <div className="space-y-4">
                <div className="glass-panel p-5">
                  <h3 className="mb-4 text-sm font-semibold text-white">Profile</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Phone" value={data.phone ?? '—'} />
                    <Field label="Country" value={data.country ?? '—'} />
                    <Field label="Campaign" value={data.campaign ?? '—'} />
                    <Field label="Sales agent" value={data.salesAgent ?? '—'} />
                    <Field label="KYC" value={<Badge tone={KYC_TONE[data.kyc] ?? 'neutral'} dot>{data.kyc.replace('_', ' ')}</Badge>} />
                    <Field label="Conversion" value={CONVERSION_LABEL[data.conversionStatus] ?? data.conversionStatus} />
                    <Field label="Can trade" value={<Badge tone={data.canTrade ? 'success' : 'danger'}>{data.canTrade ? 'Yes' : 'No'}</Badge>} />
                    <Field label="Signed up" value={formatDate(data.createdAt)} />
                    <Field label="Last login" value={data.lastLoginAt ? formatDate(data.lastLoginAt) : 'Never'} />
                    <Field label="Converted" value={data.convertedAt ? formatDate(data.convertedAt) : '—'} />
                  </div>
                </div>
                <div className="glass-panel p-5">
                  <h3 className="mb-3 text-sm font-semibold text-white">Totals</h3>
                  <div className="flex items-center justify-between rounded-lg border border-white/10 bg-ink-800/60 px-4 py-3">
                    <span className="text-sm text-gray-400">Lifetime deposits</span>
                    <span className="font-display text-lg font-bold text-white">{formatCurrency(data.totalDeposits)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between rounded-lg border border-white/10 bg-ink-800/60 px-4 py-3">
                    <span className="text-sm text-gray-400">Commission you earned</span>
                    <span className="font-display text-lg font-bold text-success">{formatCurrency(data.commissions.reduce((s, c) => s + c.amount, 0))}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="glass-panel p-5">
                  <h3 className="mb-3 text-sm font-semibold text-white">Deposits <span className="text-xs font-normal text-gray-500">({data.deposits.length})</span></h3>
                  {data.deposits.length === 0 ? <p className="text-sm text-gray-500">No deposits yet.</p> : (
                    <ul className="divide-y divide-white/[0.06]">
                      {data.deposits.map((d, i) => (
                        <li key={i} className="flex items-center justify-between py-2.5 text-sm">
                          <div><span className="text-white">{formatCurrency(d.amount)}</span> <span className="ml-2 font-mono text-xs text-gray-500">{d.reference ?? ''}</span></div>
                          <span className="text-xs text-gray-500">{formatDate(d.date)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="glass-panel p-5">
                  <h3 className="mb-3 text-sm font-semibold text-white">Commission from this client <span className="text-xs font-normal text-gray-500">({data.commissions.length})</span></h3>
                  {data.commissions.length === 0 ? <p className="text-sm text-gray-500">No commission yet.</p> : (
                    <ul className="divide-y divide-white/[0.06]">
                      {data.commissions.map((c, i) => (
                        <li key={i} className="flex items-center justify-between py-2.5 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-success">{formatCurrency(c.amount)}</span>
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ring-1 ${c.level === 1 ? 'bg-brand-500/10 text-brand-300 ring-brand-500/30' : 'bg-amber-500/10 text-amber-300 ring-amber-500/30'}`}>{c.level === 1 ? 'Direct' : `L${c.level}`}</span>
                          </div>
                          <span className="text-xs text-gray-500">{formatDate(c.date)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
    </>
  )
}
