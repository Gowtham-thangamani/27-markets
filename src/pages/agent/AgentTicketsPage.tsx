import { useEffect, useState } from 'react'
import { PageTitle } from '@/components/portal/PageTitle'
import { Badge, SkeletonRows, ErrorState } from '@/components/ui'
import { agentApi, type AgentTicket, type TicketStatus, type TicketPriority } from '@/lib/agentApi'
import { ApiError } from '@/lib/api'

const statusTone: Record<TicketStatus, 'warning' | 'info' | 'success'> = {
  OPEN: 'warning',
  IN_PROGRESS: 'info',
  RESOLVED: 'success',
}
const statusLabel: Record<TicketStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  RESOLVED: 'Resolved',
}
const priorityTone: Record<TicketPriority, 'neutral' | 'warning' | 'danger'> = {
  LOW: 'neutral',
  MEDIUM: 'warning',
  HIGH: 'danger',
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function AgentTicketsPage() {
  const [rows, setRows] = useState<AgentTicket[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    setError(null)
    agentApi
      .tickets()
      .then(setRows)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load tickets'))
  }
  useEffect(load, [])

  return (
    <>
      <PageTitle title="My Tickets" subtitle="Support tickets assigned to you." />

      {error ? (
        <ErrorState description={error} onRetry={load} />
      ) : !rows ? (
        <SkeletonRows />
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-ink-800/40 p-10 text-center text-gray-400">
          No tickets are assigned to you yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/[0.06]">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="bg-ink-800/60 text-left text-gray-400">
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {rows.map((t) => (
                <tr key={t.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3.5 font-medium text-white">{t.subject}</td>
                  <td className="px-4 py-3.5 text-gray-300">{t.client}</td>
                  <td className="px-4 py-3.5 text-gray-400">{t.category}</td>
                  <td className="px-4 py-3.5">
                    <Badge tone={priorityTone[t.priority]}>{t.priority}</Badge>
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge tone={statusTone[t.status]}>{statusLabel[t.status]}</Badge>
                  </td>
                  <td className="px-4 py-3.5 text-gray-400">{fmt(t.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
