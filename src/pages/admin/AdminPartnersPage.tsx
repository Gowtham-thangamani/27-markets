import { useEffect, useState } from 'react'
import { Handshake } from 'lucide-react'
import { Badge, EmptyState, ErrorState, SkeletonRows } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { formatDate } from '@/lib/format'
import { adminApi, type PartnerItem } from '@/lib/adminApi'

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState<PartnerItem[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    adminApi
      .listPartners()
      .then((p) => active && setPartners(p))
      .catch(() => active && setError(true))
    return () => {
      active = false
    }
  }, [])

  return (
    <>
      <PageTitle title="Partners / IB" subtitle="Introducing brokers and their referrals." />

      <div className="mb-4 rounded-xl border border-white/[0.06] bg-ink-800/40 p-4 text-sm text-gray-400">
        Commission setup and rebate plans are <span className="text-brand-300">coming in a later phase</span>. This is a
        read-only view of partner accounts.
      </div>

      {error ? (
        <ErrorState title="Could not load partners" description="Please try again shortly." />
      ) : !partners ? (
        <SkeletonRows rows={4} />
      ) : partners.length === 0 ? (
        <EmptyState icon={Handshake} title="No partners yet" description="Partner accounts will appear here." />
      ) : (
        <div className="glass-panel overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-5 py-3 font-medium">Partner</th>
                  <th className="px-5 py-3 font-medium">Country</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {partners.map((p) => (
                  <tr key={p.id}>
                    <td className="px-5 py-3">
                      <div className="text-white">{p.firstName} {p.lastName}</div>
                      <div className="text-xs text-gray-500">{p.email}</div>
                    </td>
                    <td className="px-5 py-3 text-gray-300">{p.country ?? '—'}</td>
                    <td className="px-5 py-3">
                      <Badge tone={p.status === 'ACTIVE' ? 'success' : 'neutral'} dot>{p.status}</Badge>
                    </td>
                    <td className="px-5 py-3 text-gray-400">{formatDate(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
