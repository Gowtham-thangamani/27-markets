import { useCallback, useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Users } from 'lucide-react'
import { Badge, EmptyState, ErrorState, SkeletonRows } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { initials, formatDate } from '@/lib/format'
import { ApiError } from '@/lib/api'
import { partnerApi, type SubPartnerClients } from '@/lib/partnerApi'

const KYC_TONE: Record<string, 'success' | 'warning' | 'neutral' | 'danger'> = {
  APPROVED: 'success', PENDING: 'warning', NOT_SUBMITTED: 'neutral', REJECTED: 'danger',
}

export default function PartnerSubPartnerClientsPage() {
  const { id = '' } = useParams()
  const [data, setData] = useState<SubPartnerClients | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try { setData(await partnerApi.getSubPartnerClients(id)) }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Failed to load') }
  }, [id])
  useEffect(() => { void load() }, [load])

  return (
    <>
      <Link to="/partner/sub-partners" className="mb-3 inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Sub-Partners
      </Link>
      <PageTitle title={data ? `${data.subPartner.name}'s clients` : 'Sub-partner clients'} subtitle="Clients referred by your sub-partner." />
      {error ? <ErrorState description={error} onRetry={load} />
        : !data ? <SkeletonRows rows={5} />
        : data.clients.length === 0 ? <EmptyState icon={Users} title="No clients yet" description="This sub-partner hasn't referred any clients yet." />
        : (
          <div className="glass-panel overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-white/[0.06] text-left text-xs text-gray-500">
                <th className="px-5 py-3 font-medium">Client</th><th className="px-5 py-3 font-medium">Country</th><th className="px-5 py-3 font-medium">KYC</th><th className="px-5 py-3 font-medium">Joined</th>
              </tr></thead>
              <tbody>
                {data.clients.map((c) => (
                  <tr key={c.id} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/15 text-xs font-semibold text-brand-300 ring-1 ring-brand-500/30">{initials(c.name)}</span>
                        <div className="min-w-0"><div className="truncate font-medium text-white">{c.name}</div><div className="truncate text-xs text-gray-500">{c.email}</div></div>
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
