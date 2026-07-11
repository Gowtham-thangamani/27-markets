import { useEffect, useState } from 'react'
import { PageTitle } from '@/components/portal/PageTitle'
import { Badge, SkeletonRows, ErrorState } from '@/components/ui'
import { agentApi, type AgentLead, type LeadStatus } from '@/lib/agentApi'
import { ApiError } from '@/lib/api'

const statusTone: Record<LeadStatus, 'neutral' | 'info' | 'warning' | 'success' | 'danger' | 'brand'> = {
  NEW: 'warning',
  CONTACTED: 'info',
  QUALIFIED: 'brand',
  CONVERTED: 'success',
  LOST: 'danger',
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString()
}

export default function AgentLeadsPage() {
  const [rows, setRows] = useState<AgentLead[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    setError(null)
    agentApi
      .leads()
      .then(setRows)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load leads'))
  }
  useEffect(load, [])

  return (
    <>
      <PageTitle title="My Leads" subtitle="Leads assigned to you." />

      {error ? (
        <ErrorState description={error} onRetry={load} />
      ) : !rows ? (
        <SkeletonRows />
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-ink-800/40 p-10 text-center text-gray-400">
          No leads are assigned to you yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/[0.06]">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="bg-ink-800/60 text-left text-gray-400">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Country</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {rows.map((l) => (
                <tr key={l.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3.5 font-medium text-white">{l.name}</td>
                  <td className="px-4 py-3.5 text-gray-300">
                    <div>{l.email}</div>
                    {l.phone && <div className="text-xs text-gray-500">{l.phone}</div>}
                  </td>
                  <td className="px-4 py-3.5 text-gray-400">{l.country ?? '—'}</td>
                  <td className="px-4 py-3.5 text-gray-400">{l.source}</td>
                  <td className="px-4 py-3.5">
                    <Badge tone={statusTone[l.status]}>{l.status}</Badge>
                  </td>
                  <td className="px-4 py-3.5 text-gray-400">{fmt(l.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
