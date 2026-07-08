import { useCallback, useEffect, useState } from 'react'
import { Wallet } from 'lucide-react'
import { Badge } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { formatCurrency } from '@/lib/format'
import { ApiError } from '@/lib/api'
import { financeApi, type WalletRow } from '@/lib/financeApi'
import { DataTable, type Column } from '@/components/admin/table'

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  ACTIVE: 'success',
  PENDING: 'warning',
  SUSPENDED: 'danger',
  ARCHIVED: 'neutral',
}

const columns: Column<WalletRow>[] = [
  {
    key: 'owner', header: 'Client', filter: 'text', sortable: true,
    accessor: (w) => w.owner?.name ?? 'Unknown',
    render: (w) => (
      <div>
        <div className="font-medium text-white">{w.owner?.name ?? 'Unknown'}</div>
        <div className="text-xs text-gray-500">{w.owner?.email ?? '—'}</div>
      </div>
    ),
  },
  { key: 'account', header: 'Account', filter: 'text', accessor: (w) => w.accountNumber ?? '', render: (w) => w.accountNumber ?? '—' },
  { key: 'type', header: 'Type', filter: 'select', accessor: (w) => w.accountType ?? '—' },
  { key: 'mode', header: 'Mode', filter: 'select', accessor: (w) => w.mode ?? '—' },
  { key: 'currency', header: 'Currency', filter: 'select', accessor: (w) => w.currency },
  { key: 'balance', header: 'Balance', align: 'right', sortable: true, accessor: (w) => Number(w.balance), render: (w) => formatCurrency(Number(w.balance)) },
  {
    key: 'status', header: 'Status', filter: 'select', accessor: (w) => w.status ?? '—',
    render: (w) => (w.status ? <Badge tone={STATUS_TONE[w.status] ?? 'neutral'} dot>{w.status}</Badge> : '—'),
  },
]

export default function AdminWalletsPage() {
  const [rows, setRows] = useState<WalletRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await financeApi.listWallets())
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load wallets')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const total = rows.reduce((sum, w) => sum + Number(w.balance), 0)

  return (
    <>
      <PageTitle title="All Wallets" subtitle="Every client wallet and its live balance." />

      {!loading && !error && (
        <div className="mb-4 flex flex-wrap gap-3 text-sm">
          <span className="rounded-lg border border-white/[0.06] bg-ink-800/40 px-4 py-2 text-gray-300">
            Wallets: <span className="font-semibold text-white">{rows.length}</span>
          </span>
          <span className="rounded-lg border border-white/[0.06] bg-ink-800/40 px-4 py-2 text-gray-300">
            Total balance: <span className="font-semibold text-white">{formatCurrency(total)}</span>
          </span>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(w) => w.id}
        loading={loading}
        error={error}
        onRetry={load}
        emptyIcon={Wallet}
        emptyTitle="No wallets"
        emptyDescription="Client wallets will appear here once accounts exist."
        minWidthClass="min-w-[820px]"
      />
    </>
  )
}
