import { useCallback, useEffect, useState } from 'react'
import { MoonStar } from 'lucide-react'
import { Badge } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { ApiError } from '@/lib/api'
import { financeApi, type DormantAccountRow } from '@/lib/financeApi'
import { DataTable, type Column } from '@/components/admin/table'

const columns: Column<DormantAccountRow>[] = [
  {
    key: 'owner', header: 'Client', filter: 'text', sortable: true,
    accessor: (a) => a.owner.name,
    render: (a) => (
      <div>
        <div className="font-medium text-white">{a.owner.name}</div>
        <div className="text-xs text-gray-500">{a.owner.email}</div>
      </div>
    ),
  },
  { key: 'account', header: 'Account', filter: 'text', accessor: (a) => a.number },
  { key: 'type', header: 'Type', filter: 'select', accessor: (a) => a.type },
  { key: 'balance', header: 'Balance', align: 'right', sortable: true, accessor: (a) => Number(a.balance), render: (a) => formatCurrency(Number(a.balance)) },
  {
    key: 'last', header: 'Last activity', filter: 'date', sortable: true,
    accessor: (a) => a.lastActivityAt ?? '',
    render: (a) => (a.lastActivityAt ? formatDateTime(a.lastActivityAt) : <span className="text-gray-500">Never</span>),
  },
  {
    key: 'days', header: 'Inactive', align: 'right', sortable: true,
    accessor: (a) => a.daysInactive,
    render: (a) => <Badge tone={a.daysInactive >= 180 ? 'danger' : 'warning'}>{a.daysInactive}d</Badge>,
  },
]

export default function AdminDormantAccountsPage() {
  const [rows, setRows] = useState<DormantAccountRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await financeApi.listDormantAccounts())
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load dormant accounts')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <>
      <PageTitle title="Dormant Accounts" subtitle="Client accounts with no activity in the last 90 days." />

      {!loading && !error && (
        <div className="mb-4 text-sm text-gray-400">
          <span className="rounded-lg border border-white/[0.06] bg-ink-800/40 px-4 py-2">
            Dormant accounts: <span className="font-semibold text-white">{rows.length}</span>
          </span>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(a) => a.id}
        loading={loading}
        error={error}
        onRetry={load}
        emptyIcon={MoonStar}
        emptyTitle="No dormant accounts"
        emptyDescription="Every account has had activity in the last 90 days."
        minWidthClass="min-w-[760px]"
      />
    </>
  )
}
