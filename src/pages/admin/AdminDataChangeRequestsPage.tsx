import { useCallback, useEffect, useState } from 'react'
import { Check, ClipboardList, X } from 'lucide-react'
import { Badge, Button } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { useToast } from '@/context/ToastContext'
import { formatDateTime } from '@/lib/format'
import { ApiError } from '@/lib/api'
import { adminApi, type DataChangeRequestRow } from '@/lib/adminApi'
import { DataTable, type Column } from '@/components/admin/table'

type StatusKey = 'PENDING' | 'APPROVED' | 'REJECTED'
const STATUS_META: Record<string, { label: string; tone: 'warning' | 'success' | 'danger' }> = {
  PENDING: { label: 'Pending', tone: 'warning' },
  APPROVED: { label: 'Approved', tone: 'success' },
  REJECTED: { label: 'Rejected', tone: 'danger' },
}
const statusMeta = (s: string) => STATUS_META[s] ?? { label: s, tone: 'warning' as const }

const FILTERS: { key: StatusKey | 'ALL'; label: string }[] = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'ALL', label: 'All' },
]

export default function AdminDataChangeRequestsPage() {
  const toast = useToast()
  const [filter, setFilter] = useState<StatusKey | 'ALL'>('PENDING')
  const [rows, setRows] = useState<DataChangeRequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async (f: StatusKey | 'ALL') => {
    setLoading(true)
    setError(null)
    try {
      setRows(await adminApi.listDataChangeRequests(f === 'ALL' ? undefined : f))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load requests')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(filter)
  }, [filter, load])

  const act = async (r: DataChangeRequestRow, action: 'approve' | 'reject') => {
    const ok = window.confirm(
      action === 'approve'
        ? `Approve this change to "${r.field}"? The client's profile will be updated.`
        : 'Reject this change request?',
    )
    if (!ok) return
    const reason = action === 'reject' ? window.prompt('Reason (optional):') ?? undefined : undefined
    setBusy(r.id)
    try {
      if (action === 'approve') await adminApi.approveDataChangeRequest(r.id)
      else await adminApi.rejectDataChangeRequest(r.id, reason)
      toast.success(action === 'approve' ? 'Change approved & applied' : 'Request rejected')
      await load(filter)
    } catch (e) {
      const msg = e instanceof ApiError && e.status === 403 ? 'Only admins can action requests.' : (e as Error).message
      toast.error('Action failed', msg)
    } finally {
      setBusy(null)
    }
  }

  const columns: Column<DataChangeRequestRow>[] = [
    {
      key: 'client', header: 'Client', filter: 'text', sortable: true,
      accessor: (r) => r.client?.name ?? 'Unknown',
      render: (r) => (
        <div>
          <div className="font-medium text-white">{r.client?.name ?? 'Unknown'}</div>
          <div className="text-xs text-gray-500">{r.client?.email ?? '—'}</div>
        </div>
      ),
    },
    { key: 'field', header: 'Field', filter: 'select', accessor: (r) => r.field },
    { key: 'current', header: 'Current', filter: false, accessor: (r) => r.currentValue ?? '', render: (r) => <span className="text-gray-400">{r.currentValue ?? '—'}</span> },
    { key: 'requested', header: 'Requested', filter: false, accessor: (r) => r.requestedValue, render: (r) => <span className="text-white">{r.requestedValue}</span> },
    { key: 'status', header: 'Status', filter: 'select', accessor: (r) => statusMeta(r.status).label, render: (r) => { const m = statusMeta(r.status); return <Badge tone={m.tone} dot>{m.label}</Badge> } },
    { key: 'date', header: 'Requested at', filter: 'date', sortable: true, accessor: (r) => r.createdAt, render: (r) => formatDateTime(r.createdAt) },
    {
      key: 'actions', header: '', filter: false, align: 'right', accessor: () => '',
      render: (r) =>
        r.status === 'PENDING' ? (
          <div className="flex items-center justify-end gap-2">
            <Button size="sm" variant="outline" loading={busy === r.id} onClick={() => act(r, 'approve')} className="gap-1 border-success/40 text-success hover:bg-success/10"><Check className="h-3.5 w-3.5" /> Approve</Button>
            <Button size="sm" variant="outline" onClick={() => act(r, 'reject')} className="gap-1 border-danger/40 text-danger hover:bg-danger/10"><X className="h-3.5 w-3.5" /> Reject</Button>
          </div>
        ) : null,
    },
  ]

  return (
    <>
      <PageTitle title="Data Change Requests" subtitle="Client profile changes awaiting approval." />

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={filter === f.key ? 'rounded-lg bg-brand-500/15 px-3 py-1.5 text-sm font-medium text-brand-300 ring-1 ring-brand-500/30' : 'rounded-lg px-3 py-1.5 text-sm text-gray-400 hover:bg-white/5 hover:text-white'}
            aria-pressed={filter === f.key}
          >
            {f.label}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        loading={loading}
        error={error}
        onRetry={() => load(filter)}
        emptyIcon={ClipboardList}
        emptyTitle="No requests"
        emptyDescription="Nothing matches this filter."
        minWidthClass="min-w-[860px]"
      />
    </>
  )
}
