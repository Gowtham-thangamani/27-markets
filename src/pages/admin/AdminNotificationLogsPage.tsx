import { useCallback, useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { Badge } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { formatDateTime } from '@/lib/format'
import { ApiError } from '@/lib/api'
import { adminApi, type AuditEntry } from '@/lib/adminApi'
import { DataTable, type Column } from '@/components/admin/table'

// Audit actions that represent notification / comms activity.
const COMMS = /^(campaign|notifications|templates|consent)/

const columns: Column<AuditEntry>[] = [
  { key: 'when', header: 'When', filter: 'date', sortable: true, accessor: (e) => e.createdAt, render: (e) => formatDateTime(e.createdAt) },
  {
    key: 'actor', header: 'Actor', filter: 'text', accessor: (e) => (e.user ? `${e.user.firstName} ${e.user.lastName}` : 'System'),
    render: (e) => (e.user ? `${e.user.firstName} ${e.user.lastName}` : <span className="text-gray-500">System</span>),
  },
  { key: 'action', header: 'Action', filter: 'select', accessor: (e) => e.action, render: (e) => <Badge tone="neutral">{e.action}</Badge> },
  { key: 'entity', header: 'Entity', filter: 'select', accessor: (e) => e.entity ?? '—', render: (e) => e.entity ?? '—' },
]

export default function AdminNotificationLogsPage() {
  const [rows, setRows] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const all = await adminApi.getAuditLog()
      setRows(all.filter((e) => COMMS.test(e.action)))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load logs')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <>
      <PageTitle title="Notification Logs" subtitle="Campaign, template and notification activity." />
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(e) => e.id}
        loading={loading}
        error={error}
        onRetry={load}
        emptyIcon={Bell}
        emptyTitle="No notification activity"
        emptyDescription="Campaign and template changes will appear here."
        minWidthClass="min-w-[640px]"
      />
    </>
  )
}
