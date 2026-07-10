import { useCallback, useEffect, useState } from 'react'
import { Users, ShieldCheck, UserPlus, DollarSign, Copy } from 'lucide-react'
import { PageTitle } from '@/components/portal/PageTitle'
import { SkeletonCard, ErrorState } from '@/components/ui'
import { KpiSparkCard } from '@/components/admin/charts/KpiSparkCard'
import { FunnelDonut } from '@/components/admin/charts/FunnelDonut'
import { SignupsChart } from '@/components/partner/SignupsChart'
import { useToast } from '@/context/ToastContext'
import { relativeTime, formatCurrency } from '@/lib/format'
import { ApiError } from '@/lib/api'
import { partnerApi, type PartnerDashboard, type PartnerCommissions } from '@/lib/partnerApi'

const KYC_COLORS: Record<string, string> = { APPROVED: '#22c55e', PENDING: '#f59e0b', NOT_SUBMITTED: '#6b7280', REJECTED: '#ef4444' }

export default function PartnerDashboardPage() {
  const toast = useToast()
  const [data, setData] = useState<PartnerDashboard | null>(null)
  const [commissions, setCommissions] = useState<PartnerCommissions | null>(null)
  const [loading, setLoading] = useState(true)
  const [payingOut, setPayingOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [dash, comm] = await Promise.all([partnerApi.getDashboard(), partnerApi.getCommissions()])
      setData(dash); setCommissions(comm)
    }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Failed to load') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  const requestPayout = useCallback(async () => {
    setPayingOut(true)
    try {
      const r = await partnerApi.requestPayout()
      toast.success('Payout requested', `${formatCurrency(r.amount)} is pending finance approval.`)
      const comm = await partnerApi.getCommissions()
      setCommissions(comm)
    } catch (e) {
      toast.error('Could not request payout', e instanceof ApiError ? e.message : 'Please try again.')
    } finally {
      setPayingOut(false)
    }
  }, [toast])

  if (error) return (<><PageTitle title="Dashboard" subtitle="Your referral performance." /><ErrorState description={error} onRetry={load} /></>)
  if (loading || !data) return (<><PageTitle title="Dashboard" subtitle="Your referral performance." /><div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{Array.from({length:4}).map((_,i)=><SkeletonCard key={i} />)}</div></>)

  const link = `${window.location.origin}/register?ref=${data.referralCode}`
  const kycData = (Object.keys(data.kycDistribution) as Array<keyof typeof data.kycDistribution>).map((k) => ({
    label: k.charAt(0) + k.slice(1).toLowerCase().replace('_', ' '), value: data.kycDistribution[k], color: KYC_COLORS[k] ?? '#6b7280',
  }))

  return (
    <>
      <PageTitle title="Dashboard" subtitle="Your referral performance." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiSparkCard icon={Users} label="Total Referred" value={String(data.kpis.totalReferred.value)} delta={data.kpis.totalReferred.delta} spark={data.kpis.totalReferred.spark} />
        <KpiSparkCard icon={ShieldCheck} label="KYC Verified" value={String(data.kpis.kycVerified.value)} spark={data.kpis.kycVerified.spark} />
        <KpiSparkCard icon={UserPlus} label="Signups (30d)" value={String(data.kpis.signups30d.value)} delta={data.kpis.signups30d.delta} spark={data.kpis.signups30d.spark} />
        <div className="glass-panel relative overflow-hidden p-5">
          <div className="flex items-center justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-brand-300 ring-1 ring-white/10"><DollarSign className="h-5 w-5" /></span>
          </div>
          <div className="mt-4 font-display text-2xl font-bold text-white">{formatCurrency(commissions?.total ?? 0)}</div>
          <div className="mt-0.5 text-sm text-gray-400">Commission earned</div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <SignupsChart data={data.series} />
        <FunnelDonut title="Referred KYC status" data={kycData} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="glass-panel p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">Your referral link</h3>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-lg border border-white/10 bg-ink-800/60 px-3 py-2 text-xs text-brand-300">{link}</code>
            <button onClick={() => { void navigator.clipboard?.writeText(link); toast.success('Copied', 'Referral link copied.') }} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-xs text-gray-300 hover:bg-white/10 hover:text-white"><Copy className="h-3.5 w-3.5" /> Copy</button>
          </div>
          <p className="mt-2 text-xs text-gray-500">Share this link — anyone who registers through it is attributed to you.</p>
        </div>
        <div className="glass-panel p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">Recent referrals</h3>
          {data.recentReferrals.length === 0 ? <p className="text-sm text-gray-500">No referrals yet.</p> : (
            <ul className="space-y-3">
              {data.recentReferrals.map((c) => (
                <li key={c.id} className="flex items-center justify-between text-sm">
                  <div className="min-w-0"><p className="truncate font-medium text-white">{c.name}</p><p className="truncate text-xs text-gray-500">{c.email}</p></div>
                  <span className="text-xs text-gray-500">{relativeTime(c.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-4 glass-panel p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white">Recent commissions</h3>
            <p className="mt-0.5 text-xs text-gray-500">
              {formatCurrency(commissions?.total ?? 0)} earned · {formatCurrency(commissions?.available ?? 0)} available to withdraw
            </p>
          </div>
          <button
            disabled={!commissions || commissions.available <= 0 || payingOut}
            onClick={requestPayout}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-onaccent hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {payingOut ? 'Requesting…' : `Request payout${commissions && commissions.available > 0 ? ` · ${formatCurrency(commissions.available)}` : ''}`}
          </button>
        </div>
        {!commissions || commissions.rows.length === 0 ? (
          <p className="text-sm text-gray-500">No commissions yet. You earn a commission when a referred client deposits.</p>
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {commissions.rows.slice(0, 10).map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-white">{c.client}</p>
                  <p className="truncate text-xs text-gray-500">{c.source} · {relativeTime(c.date)}</p>
                </div>
                <span className="font-medium text-success">{formatCurrency(c.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
