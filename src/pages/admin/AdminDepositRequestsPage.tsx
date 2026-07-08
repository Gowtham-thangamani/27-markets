import { useCallback, useEffect, useState } from 'react'
import { Check, Wallet, X } from 'lucide-react'
import { Badge, Button } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { useToast } from '@/context/ToastContext'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { ApiError } from '@/lib/api'
import { financeApi, type DepositRequestRow } from '@/lib/financeApi'
import { DataTable, type Column } from '@/components/admin/table'

type StatusKey = 'PENDING' | 'APPROVED' | 'REJECTED'

const STATUS_META: Record<string, { label: string; tone: 'warning' | 'success' | 'danger' }> = {
  PENDING: { label: 'Pending', tone: 'warning' },
  APPROVED: { label: 'Approved', tone: 'success' },
  REJECTED: { label: 'Rejected', tone: 'danger' },
}

function statusMeta(status?: string) {
  return STATUS_META[status ?? ''] ?? { label: status ?? '—', tone: 'warning' as const }
}

const FILTERS: { key: StatusKey | 'ALL'; label: string }[] = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'ALL', label: 'All' },
]

export default function AdminDepositRequestsPage() {
  const toast = useToast()
  const [filter, setFilter] = useState<StatusKey | 'ALL'>('PENDING')
  const [rows, setRows] = useState<DepositRequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async (f: StatusKey | 'ALL') => {
    setLoading(true)
    setError(null)
    try {
      setRows(await financeApi.allDepositRequests(f === 'ALL' ? undefined : f))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load deposit requests')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(filter)
  }, [filter, load])

  const act = async (d: DepositRequestRow, action: 'approve' | 'reject') => {
    const ok = window.confirm(
      action === 'approve'
        ? 'Confirm receipt and credit this deposit? This posts real funds and cannot be undone.'
        : 'Reject this deposit request?',
    )
    if (!ok) return
    const reason = action === 'reject' ? window.prompt('Reason for rejection (optional):') ?? undefined : undefined
    setBusy(d.id)
    try {
      if (action === 'approve') await financeApi.approveDepositRequest(d.id)
      else await financeApi.rejectDepositRequest(d.id, reason)
      toast.success(action === 'approve' ? 'Deposit confirmed & credited' : 'Deposit request rejected')
      await load(filter)
    } catch (e) {
      const msg = e instanceof ApiError && e.status === 403 ? 'Only admins can confirm deposits.' : (e as Error).message
      toast.error('Action failed', msg)
    } finally {
      setBusy(null)
    }
  }

  const columns: Column<DepositRequestRow>[] = [
    {
      key: 'client', header: 'Client', filter: 'text', sortable: true,
      accessor: (d) => d.client?.name ?? 'Unknown',
      render: (d) => (
        <div>
          <div className="font-medium text-white">{d.client?.name ?? 'Unknown'}</div>
          <div className="text-xs text-gray-500">{d.client?.email ?? '—'}</div>
        </div>
      ),
    },
    {
      key: 'method', header: 'Method', filter: 'select',
      accessor: (d) => d.method,
      render: (d) => <span className="capitalize">{d.method}{d.asset ? ` · ${d.asset}` : ''}</span>,
    },
    { key: 'amount', header: 'Amount', align: 'right', sortable: true, accessor: (d) => Number(d.amount), render: (d) => formatCurrency(Number(d.amount)) },
    { key: 'reference', header: 'Reference', filter: 'text', accessor: (d) => d.reference },
    {
      key: 'status', header: 'Status', filter: 'select', accessor: (d) => statusMeta(d.status).label,
      render: (d) => { const m = statusMeta(d.status); return <Badge tone={m.tone} dot>{m.label}</Badge> },
    },
    { key: 'date', header: 'Requested', filter: 'date', sortable: true, accessor: (d) => d.createdAt, render: (d) => formatDateTime(d.createdAt) },
    {
      key: 'actions', header: '', filter: false, align: 'right', accessor: () => '',
      render: (d) =>
        d.status === 'PENDING' ? (
          <div className="flex items-center justify-end gap-2">
            <Button size="sm" variant="outline" loading={busy === d.id} onClick={() => act(d, 'approve')} className="gap-1 border-success/40 text-success hover:bg-success/10">
              <Check className="h-3.5 w-3.5" /> Confirm
            </Button>
            <Button size="sm" variant="outline" onClick={() => act(d, 'reject')} className="gap-1 border-danger/40 text-danger hover:bg-danger/10">
              <X className="h-3.5 w-3.5" /> Reject
            </Button>
          </div>
        ) : null,
    },
  ]

  return (
    <>
      <PageTitle title="Deposit Requests" subtitle="Review, confirm, and reject client bank / crypto deposits." />

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={
              filter === f.key
                ? 'rounded-lg bg-brand-500/15 px-3 py-1.5 text-sm font-medium text-brand-300 ring-1 ring-brand-500/30'
                : 'rounded-lg px-3 py-1.5 text-sm text-gray-400 hover:bg-white/5 hover:text-white'
            }
            aria-pressed={filter === f.key}
          >
            {f.label}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(d) => d.id}
        loading={loading}
        error={error}
        onRetry={() => load(filter)}
        emptyIcon={Wallet}
        emptyTitle="No deposit requests"
        emptyDescription="Nothing matches this filter."
        minWidthClass="min-w-[800px]"
      />
    </>
  )
}
