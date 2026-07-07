import { useCallback, useEffect, useState } from 'react'
import { Banknote, Check, X } from 'lucide-react'
import { Badge, Button, Modal } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { useToast } from '@/context/ToastContext'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { ApiError } from '@/lib/api'
import { financeApi, type FinanceTxn, type WithdrawalDestination } from '@/lib/financeApi'
import { DataTable, type Column } from '@/components/admin/table'

type StatusKey = 'PENDING' | 'POSTED' | 'REVERSED'

interface StatusMeta {
  label: string
  tone: 'warning' | 'success' | 'danger'
}

const STATUS_META: Record<string, StatusMeta> = {
  PENDING: { label: 'Pending', tone: 'warning' },
  POSTED: { label: 'Paid', tone: 'success' },
  REVERSED: { label: 'Rejected', tone: 'danger' },
}

function statusMeta(status: string): StatusMeta {
  return STATUS_META[status] ?? { label: status, tone: 'warning' }
}

/** One-line payout destination summary (bank line or crypto address). */
function destinationSummary(d?: WithdrawalDestination | null): string {
  if (!d) return '—'
  if (d.method === 'crypto') return `${d.network ?? 'Crypto'} · ${d.walletAddress ?? '—'}`
  return [d.accountName, d.accountNumber, d.bankName].filter(Boolean).join(' · ') || '—'
}

const FILTERS: { key: StatusKey | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'POSTED', label: 'Paid' },
  { key: 'REVERSED', label: 'Rejected' },
]

export default function AdminWithdrawalsPage() {
  const toast = useToast()
  const [filter, setFilter] = useState<StatusKey | 'ALL'>('PENDING')
  const [rows, setRows] = useState<FinanceTxn[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [active, setActive] = useState<FinanceTxn | null>(null)

  const load = useCallback(async (f: StatusKey | 'ALL') => {
    setLoading(true)
    setError(null)
    try {
      setRows(await financeApi.allWithdrawals(f === 'ALL' ? undefined : f))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load withdrawals')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(filter)
  }, [filter, load])

  const act = async (w: FinanceTxn, action: 'approve' | 'reject') => {
    const ok = window.confirm(
      action === 'approve'
        ? 'Approve this withdrawal? This releases client funds and cannot be undone.'
        : 'Reject this withdrawal request?',
    )
    if (!ok) return
    const reason = action === 'reject' ? window.prompt('Reason for rejection (optional):') ?? undefined : undefined
    setBusy(w.id)
    try {
      if (action === 'approve') await financeApi.approveWithdrawal(w.id)
      else await financeApi.rejectWithdrawal(w.id, reason)
      toast.success(action === 'approve' ? 'Withdrawal approved' : 'Withdrawal rejected')
      setActive(null)
      await load(filter)
    } catch (e) {
      const msg = e instanceof ApiError && e.status === 403 ? 'Only admins can action withdrawals.' : (e as Error).message
      toast.error('Action failed', msg)
    } finally {
      setBusy(null)
    }
  }

  const columns: Column<FinanceTxn>[] = [
    {
      key: 'client', header: 'Client', filter: 'text', sortable: true,
      accessor: (w) => w.client?.name ?? 'Unknown',
      render: (w) => (
        <div>
          <div className="font-medium text-white">{w.client?.name ?? 'Unknown'}</div>
          <div className="text-xs text-gray-500">{w.client?.email ?? '—'}</div>
        </div>
      ),
    },
    { key: 'account', header: 'Account', filter: 'text', accessor: (w) => w.accountNumber ?? '', render: (w) => w.accountNumber ?? '—' },
    { key: 'amount', header: 'Amount', align: 'right', sortable: true, accessor: (w) => Number(w.amount), render: (w) => formatCurrency(Number(w.amount)) },
    { key: 'method', header: 'Method', filter: 'select', accessor: (w) => w.destination?.method ?? '—', render: (w) => <span className="capitalize">{w.destination?.method ?? '—'}</span> },
    {
      key: 'status', header: 'Status', filter: 'select', accessor: (w) => statusMeta(w.status).label,
      render: (w) => { const m = statusMeta(w.status); return <Badge tone={m.tone} dot>{m.label}</Badge> },
    },
    { key: 'date', header: 'Requested', filter: 'date', sortable: true, accessor: (w) => w.createdAt, render: (w) => formatDateTime(w.createdAt) },
    {
      key: 'actions', header: '', filter: false, align: 'right', accessor: () => '',
      render: (w) =>
        w.status === 'PENDING' ? (
          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
            <Button size="sm" variant="outline" loading={busy === w.id} onClick={() => act(w, 'approve')} className="gap-1 border-success/40 text-success hover:bg-success/10">
              <Check className="h-3.5 w-3.5" /> Approve
            </Button>
            <Button size="sm" variant="outline" onClick={() => act(w, 'reject')} className="gap-1 border-danger/40 text-danger hover:bg-danger/10">
              <X className="h-3.5 w-3.5" /> Reject
            </Button>
          </div>
        ) : null,
    },
  ]

  return (
    <>
      <PageTitle title="Withdrawal Requests" subtitle="Review, approve, and reject client withdrawals." />

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
        rowKey={(w) => w.id}
        onRowClick={(w) => setActive(w)}
        loading={loading}
        error={error}
        onRetry={() => load(filter)}
        emptyIcon={Banknote}
        emptyTitle="No withdrawals"
        emptyDescription="Nothing matches this filter."
        minWidthClass="min-w-[820px]"
      />

      <WithdrawalDetailModal
        withdrawal={active}
        busy={busy}
        onClose={() => setActive(null)}
        onAct={act}
      />
    </>
  )
}

function WithdrawalDetailModal({
  withdrawal,
  busy,
  onClose,
  onAct,
}: {
  withdrawal: FinanceTxn | null
  busy: string | null
  onClose: () => void
  onAct: (w: FinanceTxn, action: 'approve' | 'reject') => void
}) {
  if (!withdrawal) return null
  const m = statusMeta(withdrawal.status)
  const d = withdrawal.destination

  return (
    <Modal open={!!withdrawal} onClose={onClose} title={withdrawal.client?.name ?? 'Withdrawal'} description={withdrawal.reference} className="max-w-xl">
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <Field label="Amount" value={formatCurrency(Number(withdrawal.amount))} />
          <Field label="Status" value={m.label} />
          <Field label="Account" value={withdrawal.accountNumber ?? '—'} />
          <Field label="Client" value={withdrawal.client?.email ?? '—'} />
          <Field label="Requested" value={formatDateTime(withdrawal.createdAt)} />
          <Field label="Method" value={d?.method ?? '—'} />
        </div>

        <div>
          <h4 className="mb-2 text-sm font-semibold text-white">Payout destination</h4>
          {!d ? (
            <p className="text-sm text-gray-500">No destination on file.</p>
          ) : d.method === 'crypto' ? (
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <Field label="Network" value={d.network ?? '—'} />
              <Field label="Wallet address" value={d.walletAddress ?? '—'} />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <Field label="Account holder" value={d.accountName ?? '—'} />
              <Field label="Account / IBAN" value={d.accountNumber ?? '—'} />
              <Field label="Bank" value={d.bankName ?? '—'} />
              <Field label="SWIFT" value={d.swift ?? '—'} />
            </div>
          )}
        </div>

        {withdrawal.status === 'PENDING' && (
          <div className="flex justify-end gap-2 border-t border-white/[0.06] pt-4">
            <Button variant="outline" onClick={() => onAct(withdrawal, 'reject')} className="gap-1 border-danger/40 text-danger hover:bg-danger/10">
              <X className="h-4 w-4" /> Reject
            </Button>
            <Button loading={busy === withdrawal.id} onClick={() => onAct(withdrawal, 'approve')} className="gap-1">
              <Check className="h-4 w-4" /> Approve
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-ink-800/40 p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-0.5 break-words font-medium text-white">{value}</p>
    </div>
  )
}
