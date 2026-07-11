import { useCallback, useEffect, useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import { PageTitle } from '@/components/portal/PageTitle'
import { Badge, SkeletonRows, ErrorState, EmptyState } from '@/components/ui'
import { amlApi, type AmlScreening, type AmlStatus } from '@/lib/amlApi'
import { ApiError } from '@/lib/api'

const tone: Record<AmlStatus, 'danger' | 'warning' | 'success'> = {
  HIT: 'danger',
  REVIEW: 'warning',
  CLEAR: 'success',
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function hitCount(hits: unknown): number {
  return Array.isArray(hits) ? hits.length : 0
}

export default function AdminAmlPage() {
  const [rows, setRows] = useState<AmlScreening[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      setRows(await amlApi.listScreenings())
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load screenings')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <>
      <PageTitle
        title="AML Screening"
        subtitle="Sanctions / PEP / adverse-media matches that need a compliance decision."
      />

      {error ? (
        <ErrorState description={error} onRetry={load} />
      ) : !rows ? (
        <SkeletonRows />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title="No screenings need attention"
          description="Confirmed matches (REVIEW / HIT) will appear here for review. Clients are screened automatically on KYC approval."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/[0.06]">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="bg-ink-800/60 text-left text-gray-400">
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Matches</th>
                <th className="px-4 py-3 font-medium">Provider</th>
                <th className="px-4 py-3 font-medium">Screened</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3.5">
                    <span className="font-medium text-white">{r.client ?? '—'}</span>
                    <span className="ml-2 font-mono text-xs text-gray-500">{r.userId.slice(0, 8)}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge tone={tone[r.status]}>{r.status}</Badge>
                  </td>
                  <td className="px-4 py-3.5 tabular-nums text-gray-300">{hitCount(r.hits)}</td>
                  <td className="px-4 py-3.5 text-gray-400">{r.provider}</td>
                  <td className="px-4 py-3.5 text-gray-400">{fmt(r.screenedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
