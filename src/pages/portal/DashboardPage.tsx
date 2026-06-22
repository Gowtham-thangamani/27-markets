import { motion } from 'framer-motion'
import { Wallet, TrendingUp, PiggyBank, Gauge, Plus, ArrowUpRight, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge, Button, ProgressBar } from '@/components/ui'
import { KpiWidget } from '@/components/portal/KpiWidget'
import { PageTitle } from '@/components/portal/PageTitle'
import { statusTone } from '@/components/portal/statusTone'
import { usePortalUI } from '@/layouts/PortalLayout'
import { useAuth } from '@/context/AuthContext'
import { usePortalData } from '@/context/PortalDataContext'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { staggerContainer, fadeUp } from '@/lib/motion'

export default function DashboardPage() {
  const { user } = useAuth()
  const { openNewAccount } = usePortalUI()
  const { totals, accounts, transactions, kyc, kycProgress, loading } = usePortalData()
  const liveAccounts = accounts.filter((a) => a.mode === 'Live')

  return (
    <>
      <PageTitle
        title={`Welcome back, ${user?.name?.split(' ')[0] ?? 'Trader'}`}
        subtitle="Here's an overview of your trading accounts."
        action={
          <Button onClick={openNewAccount} className="gap-1.5">
            <Plus className="h-4 w-4" /> Open New Account
          </Button>
        }
      />

      {/* KPI widgets */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        <motion.div variants={fadeUp}>
          <KpiWidget icon={Wallet} label="Total Balance" value={totals.balance} prefix="$" delta={2.4} />
        </motion.div>
        <motion.div variants={fadeUp}>
          <KpiWidget icon={TrendingUp} label="Equity" value={totals.equity} prefix="$" delta={1.8} />
        </motion.div>
        <motion.div variants={fadeUp}>
          <KpiWidget icon={PiggyBank} label="Free Margin" value={totals.freeMargin} prefix="$" />
        </motion.div>
        <motion.div variants={fadeUp}>
          <KpiWidget icon={Gauge} label="Margin Level" value={totals.marginLevel} suffix="%" />
        </motion.div>
      </motion.div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* Accounts table */}
        <div className="glass-panel overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-white/[0.06] p-5">
            <h2 className="font-display text-lg font-semibold text-white">My Accounts</h2>
            <Link to="/portal/accounts" className="text-sm font-medium text-brand-400 hover:text-brand-300">
              View all
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-5 py-3 font-medium">Account</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 text-right font-medium">Balance</th>
                  <th className="px-5 py-3 text-right font-medium">Equity</th>
                  <th className="px-5 py-3 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-sm">
                {loading && liveAccounts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-500">
                      Loading accounts…
                    </td>
                  </tr>
                )}
                {!loading && liveAccounts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-500">
                      No live accounts yet. Use “Open New Account” to create one.
                    </td>
                  </tr>
                )}
                {liveAccounts.map((a) => (
                  <tr key={a.id} className="transition-colors hover:bg-white/[0.02]">
                    <td className="px-5 py-3.5 font-medium text-white">{a.number}</td>
                    <td className="px-5 py-3.5 text-gray-300">{a.type}</td>
                    <td className="px-5 py-3.5 text-right font-medium text-white">
                      {formatCurrency(a.balance)}
                    </td>
                    <td className="px-5 py-3.5 text-right text-gray-300">{formatCurrency(a.equity)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <Badge tone={statusTone(a.status)} dot>
                        {a.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Side column: KYC + recent activity */}
        <div className="space-y-6">
          <div className="glass-panel p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-brand-400" />
              <h3 className="font-display text-base font-semibold text-white">Verification</h3>
            </div>
            <p className="mt-1 text-sm text-gray-400">
              Complete KYC to unlock withdrawals and higher limits.
            </p>
            <div className="mt-4">
              <ProgressBar value={kycProgress} showLabel />
            </div>
            <ul className="mt-3 space-y-1.5 text-sm">
              {kyc.map((k) => (
                <li key={k.id} className="flex items-center justify-between">
                  <span className="text-gray-400">{k.title}</span>
                  <Badge tone={statusTone(k.status)}>{k.status}</Badge>
                </li>
              ))}
            </ul>
            <Link to="/portal/kyc" className="mt-4 block">
              <Button variant="outline" size="sm" fullWidth className="gap-1.5">
                Complete KYC <ArrowUpRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="glass-panel p-5">
            <h3 className="font-display text-base font-semibold text-white">Recent Activity</h3>
            <ul className="mt-4 space-y-3">
              {transactions.slice(0, 4).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{t.kind}</p>
                    <p className="truncate text-xs text-gray-500">{formatDateTime(t.date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">{formatCurrency(t.amount)}</p>
                    <Badge tone={statusTone(t.status)}>{t.status}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}
