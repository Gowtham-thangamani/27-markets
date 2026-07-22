import { useCallback, useEffect, useState } from 'react'
import { Wallet } from 'lucide-react'
import { Badge, EmptyState, ErrorState, SkeletonRows } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { formatDate, formatCurrency } from '@/lib/format'
import { ApiError } from '@/lib/api'
import { partnerApi, type PartnerPayoutRow, type PartnerPayoutStatus } from '@/lib/partnerApi'

const STATUS_TONE: Record<PartnerPayoutStatus, 'success' | 'warning' | 'danger'> = {
  PAID: 'success', PENDING: 'warning', REJECTED: 'danger',
}
const STATUS_LABEL: Record<PartnerPayoutStatus, string> = {
  PAID: 'Paid', PENDING: 'In review', REJECTED: 'Rejected',
}

export default function PartnerPayoutsPage() {
  const [rows, setRows] = useState<PartnerPayoutRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { setRows(await partnerApi.getPayouts()) }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Failed to load') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  const paid = rows.filter((r) => r.status === 'PAID').reduce((s, r) => s + r.amount, 0)
  const pending = rows.filter((r) => r.status === 'PENDING').reduce((s, r) => s + r.amount, 0)

  return (
    <>
      <PageTitle title="Payouts" subtitle="Your withdrawal requests and their status." />
      {error ? <ErrorState description={error} onRetry={load} />
        : loading ? <SkeletonRows rows={5} />
        : rows.length === 0 ? (
          <EmptyState icon={Wallet} title="No payouts yet"
            description="Request a payout of your available commission from the Commissions page." />
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="glass-panel p-5"><div className="font-display text-2xl font-bold text-white">{rows.length}</div><div className="mt-0.5 text-xs text-gray-500">Total requests</div></div>
              <div className="glass-panel p-5"><div className="font-display text-2xl font-bold text-success">{formatCurrency(paid)}</div><div className="mt-0.5 text-xs text-gray-500">Paid out</div></div>
              <div className="glass-panel p-5"><div className="font-display text-2xl font-bold text-white">{formatCurrency(pending)}</div><div className="mt-0.5 text-xs text-gray-500">In review</div></div>
            </div>
            <div className="glass-panel overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead><tr className="border-b border-white/[0.06] text-left text-xs text-gray-500">
                  <th className="px-5 py-3 font-medium">Reference</th>
                  <th className="px-5 py-3 font-medium text-right">Amount</th>
                  <th className="px-5 py-3 font-medium text-right">Commissions</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Requested</th>
                  <th className="px-5 py-3 font-medium">Reviewed</th>
                </tr></thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
                      <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-brand-300">{p.reference}</td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums text-white">{formatCurrency(p.amount)}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-gray-400">{p.commissionCount}</td>
                      <td className="px-5 py-3"><Badge tone={STATUS_TONE[p.status]} dot>{STATUS_LABEL[p.status]}</Badge></td>
                      <td className="whitespace-nowrap px-5 py-3 text-xs text-gray-500">{formatDate(p.requestedAt)}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-xs text-gray-500">{p.reviewedAt ? formatDate(p.reviewedAt) : '—'}</td>
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
