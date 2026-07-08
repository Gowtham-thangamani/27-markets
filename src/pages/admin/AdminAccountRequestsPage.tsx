import { useCallback, useEffect, useState } from 'react'
import { Check, ClipboardList, X } from 'lucide-react'
import { Badge, Button } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { useToast } from '@/context/ToastContext'
import { formatDateTime } from '@/lib/format'
import { ApiError } from '@/lib/api'
import { financeApi, type AccountRequestRow } from '@/lib/financeApi'
import { DataTable, type Column } from '@/components/admin/table'

export default function AdminAccountRequestsPage() {
  const toast = useToast()
  const [rows, setRows] = useState<AccountRequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await financeApi.listAccountRequests())
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load account requests')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const act = async (a: AccountRequestRow, approve: boolean) => {
    const ok = window.confirm(
      approve
        ? `Approve ${a.owner.name}'s ${a.type} account (${a.number})? It will become active and tradable.`
        : `Reject account ${a.number}? It will be archived.`,
    )
    if (!ok) return
    setBusy(a.id)
    try {
      await financeApi.setAccountStatus(a.id, approve ? 'ACTIVE' : 'ARCHIVED')
      toast.success(approve ? 'Account approved' : 'Account rejected')
      await load()
    } catch (e) {
      const msg = e instanceof ApiError && e.status === 403 ? 'Only admins can action account requests.' : (e as Error).message
      toast.error('Action failed', msg)
    } finally {
      setBusy(null)
    }
  }

  const columns: Column<AccountRequestRow>[] = [
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
    { key: 'number', header: 'Account', filter: 'text', accessor: (a) => a.number },
    { key: 'type', header: 'Type', filter: 'select', accessor: (a) => a.type },
    { key: 'mode', header: 'Mode', filter: 'select', accessor: (a) => a.mode },
    { key: 'leverage', header: 'Leverage', accessor: (a) => a.leverage },
    { key: 'requested', header: 'Requested', filter: 'date', sortable: true, accessor: (a) => a.createdAt, render: (a) => formatDateTime(a.createdAt) },
    {
      key: 'actions', header: '', filter: false, align: 'right', accessor: () => '',
      render: (a) => (
        <div className="flex items-center justify-end gap-2">
          <Button size="sm" variant="outline" loading={busy === a.id} onClick={() => act(a, true)} className="gap-1 border-success/40 text-success hover:bg-success/10">
            <Check className="h-3.5 w-3.5" /> Approve
          </Button>
          <Button size="sm" variant="outline" onClick={() => act(a, false)} className="gap-1 border-danger/40 text-danger hover:bg-danger/10">
            <X className="h-3.5 w-3.5" /> Reject
          </Button>
        </div>
      ),
    },
  ]

  return (
    <>
      <PageTitle title="Account Requests" subtitle="Live accounts awaiting approval before they can trade." />

      {!loading && !error && (
        <div className="mb-4 text-sm">
          <span className="rounded-lg border border-white/[0.06] bg-ink-800/40 px-4 py-2 text-gray-300">
            Pending <Badge tone="warning">{rows.length}</Badge>
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
        emptyIcon={ClipboardList}
        emptyTitle="No pending requests"
        emptyDescription="New live account requests will appear here for approval."
        minWidthClass="min-w-[780px]"
      />
    </>
  )
}
