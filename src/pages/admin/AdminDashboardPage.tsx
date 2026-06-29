import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Users, ShieldAlert, ArrowUpFromLine, ArrowDownToLine, LifeBuoy } from 'lucide-react'
import { PageTitle } from '@/components/portal/PageTitle'
import { SkeletonCard, ErrorState } from '@/components/ui'
import { KpiSparkCard } from '@/components/admin/charts/KpiSparkCard'
import { FundFlowChart } from '@/components/admin/charts/FundFlowChart'
import { FunnelDonut } from '@/components/admin/charts/FunnelDonut'
import { ActivityFeed } from '@/components/admin/charts/ActivityFeed'
import { PendingWithdrawalsTable } from '@/components/admin/charts/PendingWithdrawalsTable'
import { RecentSignupsTable } from '@/components/admin/charts/RecentSignupsTable'
import { adminApi, type AdminDashboard } from '@/lib/adminApi'
import { ApiError } from '@/lib/api'
import { staggerContainer, fadeUp } from '@/lib/motion'

const FUNNEL_COLORS: Record<string, string> = {
  NEW: '#6366f1', CONTACTED: '#0ea5e9', QUALIFIED: '#f59e0b', CONVERTED: '#22c55e', LOST: '#ef4444',
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await adminApi.getDashboard())
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  if (error) return (<><PageTitle title="Dashboard" subtitle="Back-office overview." /><ErrorState description={error} onRetry={load} /></>)
  if (loading || !data) return (
    <>
      <PageTitle title="Dashboard" subtitle="Back-office overview." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}</div>
    </>
  )

  const { kpis, series, distributions, recentActivity, recentWithdrawals, recentSignups } = data
  const funnelData = (Object.keys(distributions.funnel) as Array<keyof typeof distributions.funnel>).map((k) => ({
    label: k.charAt(0) + k.slice(1).toLowerCase(), value: distributions.funnel[k], color: FUNNEL_COLORS[k] ?? '#6b7280',
  }))

  return (
    <>
      <PageTitle title="Dashboard" subtitle="Back-office overview across clients, compliance, and finance." />

      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <motion.div variants={fadeUp}><KpiSparkCard icon={Users} label="Total Clients" value={kpis.totalClients.value.toLocaleString('en-US')} delta={kpis.totalClients.delta} spark={kpis.totalClients.spark} /></motion.div>
        <motion.div variants={fadeUp}><KpiSparkCard icon={ArrowDownToLine} label="Net Flow" value={kpis.netFlow.value} delta={kpis.netFlow.delta} spark={kpis.netFlow.spark} /></motion.div>
        <motion.div variants={fadeUp}><KpiSparkCard icon={ShieldAlert} label="Pending KYC" value={String(kpis.pendingKyc.value)} spark={kpis.pendingKyc.spark} /></motion.div>
        <motion.div variants={fadeUp}><KpiSparkCard icon={ArrowUpFromLine} label="Pending Withdrawals" value={String(kpis.pendingWithdrawals.value)} spark={kpis.pendingWithdrawals.spark} /></motion.div>
        <motion.div variants={fadeUp}><KpiSparkCard icon={LifeBuoy} label="Open Tickets" value={String(kpis.openTickets.value)} spark={kpis.openTickets.spark} /></motion.div>
      </motion.div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <FundFlowChart series={series} />
        <FunnelDonut title="Lead Funnel" data={funnelData} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ActivityFeed items={recentActivity} />
        <PendingWithdrawalsTable items={recentWithdrawals} />
      </div>

      <div className="mt-4">
        <RecentSignupsTable items={recentSignups} />
      </div>
    </>
  )
}
