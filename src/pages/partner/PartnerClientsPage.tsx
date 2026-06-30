import { useCallback, useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import { Badge, EmptyState, ErrorState, SkeletonRows } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { initials, formatDate } from '@/lib/format'
import { ApiError } from '@/lib/api'
import { partnerApi, type PartnerClient } from '@/lib/partnerApi'

const KYC_TONE: Record<string, 'success' | 'warning' | 'neutral' | 'danger'> = {
  APPROVED: 'success', PENDING: 'warning', NOT_SUBMITTED: 'neutral', REJECTED: 'danger',
}

export default function PartnerClientsPage() {
  const [rows, setRows] = useState<PartnerClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { setRows(await partnerApi.getClients()) }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Failed to load') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  return (
    <>
      <PageTitle title="Referred Clients" subtitle="Clients who signed up through your referral link." />
      {error ? <ErrorState description={error} onRetry={load} />
        : loading ? <SkeletonRows rows={6} />
        : rows.length === 0 ? <EmptyState icon={Users} title="No referrals yet" description="Share your referral link to start referring clients." />
        : (
          <div className="glass-panel overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-white/[0.06] text-left text-xs text-gray-500">
                <th className="px-5 py-3 font-medium">Client</th><th className="px-5 py-3 font-medium">Country</th><th className="px-5 py-3 font-medium">KYC</th><th className="px-5 py-3 font-medium">Joined</th>
              </tr></thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/15 text-xs font-semibold text-brand-300 ring-1 ring-brand-500/30">{initials(c.name)}</span>
                        <div><div className="font-medium text-white">{c.name}</div><div className="text-xs text-gray-500">{c.email}</div></div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-300">{c.country ?? '—'}</td>
                    <td className="px-5 py-3"><Badge tone={KYC_TONE[c.kyc] ?? 'neutral'} dot>{c.kyc.replace('_', ' ')}</Badge></td>
                    <td className="px-5 py-3 text-xs text-gray-500">{formatDate(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </>
  )
}
