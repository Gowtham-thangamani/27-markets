import { useCallback, useEffect, useState } from 'react'
import { Users, ShieldCheck, UserPlus, Lock, Copy } from 'lucide-react'
import { PageTitle } from '@/components/portal/PageTitle'
import { SkeletonCard, ErrorState } from '@/components/ui'
import { KpiSparkCard } from '@/components/admin/charts/KpiSparkCard'
import { FunnelDonut } from '@/components/admin/charts/FunnelDonut'
import { SignupsChart } from '@/components/partner/SignupsChart'
import { useToast } from '@/context/ToastContext'
import { relativeTime } from '@/lib/format'
import { ApiError } from '@/lib/api'
import { partnerApi, type PartnerDashboard } from '@/lib/partnerApi'

const KYC_COLORS: Record<string, string> = { APPROVED: '#22c55e', PENDING: '#f59e0b', NOT_SUBMITTED: '#6b7280', REJECTED: '#ef4444' }

export default function PartnerDashboardPage() {
  const toast = useToast()
  const [data, setData] = useState<PartnerDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { setData(await partnerApi.getDashboard()) }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Failed to load') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

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
        <div className="glass-panel relative overflow-hidden p-5 opacity-70">
          <div className="flex items-center justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-gray-500 ring-1 ring-white/10"><Lock className="h-5 w-5" /></span>
          </div>
          <div className="mt-4 font-display text-2xl font-bold text-gray-500">—</div>
          <div className="mt-0.5 text-sm text-gray-500">Commission · available soon</div>
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
    </>
  )
}
