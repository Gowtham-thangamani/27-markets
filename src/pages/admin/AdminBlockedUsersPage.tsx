import { useCallback, useEffect, useState } from 'react'
import { Ban, Check, UserX } from 'lucide-react'
import { Badge, Button } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { useToast } from '@/context/ToastContext'
import { formatDateTime } from '@/lib/format'
import { ApiError } from '@/lib/api'
import { adminApi, type ClientListItem } from '@/lib/adminApi'
import { DataTable, type Column } from '@/components/admin/table'

type StatusKey = 'SUSPENDED' | 'ACTIVE' | 'CLOSED'

const STATUS_META: Record<string, { label: string; tone: 'success' | 'danger' | 'neutral' }> = {
  ACTIVE: { label: 'Active', tone: 'success' },
  SUSPENDED: { label: 'Blocked', tone: 'danger' },
  CLOSED: { label: 'Closed', tone: 'neutral' },
}

function statusMeta(status: string) {
  return STATUS_META[status] ?? { label: status, tone: 'neutral' as const }
}

const FILTERS: { key: StatusKey | 'ALL'; label: string }[] = [
  { key: 'SUSPENDED', label: 'Blocked' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'ALL', label: 'All' },
]

export default function AdminBlockedUsersPage() {
  const toast = useToast()
  const [filter, setFilter] = useState<StatusKey | 'ALL'>('SUSPENDED')
  const [rows, setRows] = useState<ClientListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async (f: StatusKey | 'ALL') => {
    setLoading(true)
    setError(null)
    try {
      setRows(await adminApi.listClients(undefined, f === 'ALL' ? undefined : f))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(filter)
  }, [filter, load])

  const act = async (u: ClientListItem, block: boolean) => {
    const ok = window.confirm(
      block
        ? `Block ${u.firstName} ${u.lastName}? They will be signed out and unable to access their account.`
        : `Unblock ${u.firstName} ${u.lastName}? They will regain access to their account.`,
    )
    if (!ok) return
    setBusy(u.id)
    try {
      await adminApi.setClientStatus(u.id, block ? 'SUSPENDED' : 'ACTIVE')
      toast.success(block ? 'User blocked' : 'User unblocked')
      await load(filter)
    } catch (e) {
      const msg = e instanceof ApiError && e.status === 403 ? 'Only admins can block or unblock users.' : (e as Error).message
      toast.error('Action failed', msg)
    } finally {
      setBusy(null)
    }
  }

  const columns: Column<ClientListItem>[] = [
    {
      key: 'name', header: 'Client', filter: 'text', sortable: true,
      accessor: (u) => `${u.firstName} ${u.lastName}`,
      render: (u) => (
        <div>
          <div className="font-medium text-white">{u.firstName} {u.lastName}</div>
          <div className="text-xs text-gray-500">{u.email}</div>
        </div>
      ),
    },
    { key: 'country', header: 'Country', filter: 'text', accessor: (u) => u.country ?? '', render: (u) => u.country ?? '—' },
    { key: 'accounts', header: 'Accounts', align: 'right', sortable: true, accessor: (u) => u._count.tradingAccounts },
    {
      key: 'status', header: 'Status', filter: 'select', accessor: (u) => statusMeta(u.status).label,
      render: (u) => { const m = statusMeta(u.status); return <Badge tone={m.tone} dot>{m.label}</Badge> },
    },
    { key: 'joined', header: 'Joined', filter: 'date', sortable: true, accessor: (u) => u.createdAt, render: (u) => formatDateTime(u.createdAt) },
    {
      key: 'actions', header: '', filter: false, align: 'right', accessor: () => '',
      render: (u) =>
        u.status === 'SUSPENDED' ? (
          <Button size="sm" variant="outline" loading={busy === u.id} onClick={() => act(u, false)} className="gap-1 border-success/40 text-success hover:bg-success/10">
            <Check className="h-3.5 w-3.5" /> Unblock
          </Button>
        ) : u.status === 'ACTIVE' ? (
          <Button size="sm" variant="outline" loading={busy === u.id} onClick={() => act(u, true)} className="gap-1 border-danger/40 text-danger hover:bg-danger/10">
            <Ban className="h-3.5 w-3.5" /> Block
          </Button>
        ) : null,
    },
  ]

  return (
    <>
      <PageTitle title="Blocked Users" subtitle="Block or unblock client accounts. Blocking is admin-only." />

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
        rowKey={(u) => u.id}
        loading={loading}
        error={error}
        onRetry={() => load(filter)}
        emptyIcon={UserX}
        emptyTitle="No users"
        emptyDescription={filter === 'SUSPENDED' ? 'No blocked users.' : 'Nothing matches this filter.'}
        minWidthClass="min-w-[720px]"
      />
    </>
  )
}
