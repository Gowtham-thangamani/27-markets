import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Users, ShieldAlert, ArrowUpFromLine, ArrowDownToLine, LifeBuoy } from 'lucide-react'
import { PageTitle } from '@/components/portal/PageTitle'
import { KpiWidget } from '@/components/portal/KpiWidget'
import { SkeletonCard, ErrorState } from '@/components/ui'
import { adminApi, type AdminDashboardSummary } from '@/lib/adminApi'
import { ApiError } from '@/lib/api'
import { staggerContainer, fadeUp } from '@/lib/motion'

interface Kpi {
  key: keyof AdminDashboardSummary
  label: string
  icon: typeof Users
}

const KPIS: Kpi[] = [
  { key: 'totalClients', label: 'Total Clients', icon: Users },
  { key: 'pendingKyc', label: 'Pending KYC', icon: ShieldAlert },
  { key: 'pendingWithdrawals', label: 'Pending Withdrawals', icon: ArrowUpFromLine },
  { key: 'depositsToday', label: 'Deposits Today', icon: ArrowDownToLine },
  { key: 'openTickets', label: 'Open Tickets', icon: LifeBuoy },
]

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardSummary | null>(null)
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

  useEffect(() => {
    void load()
  }, [load])

  return (
    <>
      <PageTitle title="Dashboard" subtitle="Back-office overview across clients, compliance, and finance." />

      {error ? (
        <ErrorState description={error} onRetry={load} />
      ) : loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {KPIS.map((k) => (
            <SkeletonCard key={k.key} />
          ))}
        </div>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-4 lg:grid-cols-5"
        >
          {KPIS.map((k) => (
            <motion.div key={k.key} variants={fadeUp}>
              <KpiWidget icon={k.icon} label={k.label} value={data?.[k.key] ?? 0} decimals={0} />
            </motion.div>
          ))}
        </motion.div>
      )}

      <div className="mt-6 rounded-2xl border border-white/[0.06] bg-ink-800/40 p-5 text-sm text-gray-400">
        More back-office modules (Clients, Leads, KYC review, Finance, Support, Blog) ship in later
        phases. This dashboard reads live figures from <code className="text-brand-300">GET /api/admin/dashboard</code>.
      </div>
    </>
  )
}
