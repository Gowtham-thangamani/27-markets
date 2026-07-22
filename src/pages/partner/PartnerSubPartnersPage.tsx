import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Network } from 'lucide-react'
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { initials, formatDate, formatCurrency } from '@/lib/format'
import { ApiError } from '@/lib/api'
import { partnerApi, type SubPartner } from '@/lib/partnerApi'

export default function PartnerSubPartnersPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<SubPartner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { setRows(await partnerApi.getSubPartners()) }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Failed to load') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  const totalEarned = rows.reduce((s, r) => s + r.commissionEarned, 0)
  const totalClients = rows.reduce((s, r) => s + r.clients, 0)

  return (
    <>
      <PageTitle title="Sub-Partners" subtitle="IBs who joined through your partner invite link." />
      {error ? <ErrorState description={error} onRetry={load} />
        : loading ? <SkeletonRows rows={5} />
        : rows.length === 0 ? (
          <EmptyState icon={Network} title="No sub-partners yet"
            description="Share your partner invite link from Referral Tools to build your network. You earn indirect commission on their clients' deposits." />
        ) : (
          <>
            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="glass-panel p-5"><div className="font-display text-2xl font-bold text-white">{rows.length}</div><div className="mt-0.5 text-xs text-gray-500">Sub-partners</div></div>
              <div className="glass-panel p-5"><div className="font-display text-2xl font-bold text-white">{totalClients}</div><div className="mt-0.5 text-xs text-gray-500">Clients in your downline</div></div>
              <div className="glass-panel p-5"><div className="font-display text-2xl font-bold text-success">{formatCurrency(totalEarned)}</div><div className="mt-0.5 text-xs text-gray-500">Indirect commission earned</div></div>
            </div>
            <div className="glass-panel overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead><tr className="border-b border-white/[0.06] text-left text-xs text-gray-500">
                  <th className="px-5 py-3 font-medium">Sub-Partner</th>
                  <th className="px-5 py-3 font-medium">Country</th>
                  <th className="px-5 py-3 font-medium">Referral Code</th>
                  <th className="px-5 py-3 font-medium text-right">Clients</th>
                  <th className="px-5 py-3 font-medium text-right">Earned You</th>
                  <th className="px-5 py-3 font-medium">Joined</th>
                </tr></thead>
                <tbody>
                  {rows.map((s) => (
                    <tr key={s.id} onClick={() => navigate(`/partner/sub-partners/${s.id}/clients`)}
                      className="cursor-pointer border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-xs font-semibold text-brand-300 ring-1 ring-brand-500/30">{initials(s.name)}</span>
                          <div className="min-w-0"><div className="truncate font-medium text-white">{s.name}</div><div className="truncate text-xs text-gray-500">{s.email}</div></div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-gray-300">{s.country ?? '—'}</td>
                      <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-brand-300">{s.referralCode}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-white">{s.clients}</td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums text-success">{formatCurrency(s.commissionEarned)}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-xs text-gray-500">{formatDate(s.joinedAt)}</td>
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
