import { useCallback, useEffect, useState } from 'react'
import { FileSearch } from 'lucide-react'
import { Badge } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { formatDateTime } from '@/lib/format'
import { ApiError } from '@/lib/api'
import { adminApi, type KycDocumentRow } from '@/lib/adminApi'
import { DataTable, type Column } from '@/components/admin/table'

const STEP_TONE: Record<string, 'brand' | 'info' | 'success' | 'neutral'> = {
  identity: 'brand',
  address: 'info',
  selfie: 'success',
}

const columns: Column<KycDocumentRow>[] = [
  {
    key: 'client', header: 'Client', filter: 'text', sortable: true,
    accessor: (d) => d.owner?.name ?? 'Unknown',
    render: (d) => (
      <div>
        <div className="font-medium text-white">{d.owner?.name ?? 'Unknown'}</div>
        <div className="text-xs text-gray-500">{d.owner?.email ?? '—'}</div>
      </div>
    ),
  },
  { key: 'step', header: 'Type', filter: 'select', accessor: (d) => d.step, render: (d) => <Badge tone={STEP_TONE[d.step] ?? 'neutral'}>{d.step}</Badge> },
  { key: 'file', header: 'File', filter: 'text', accessor: (d) => d.fileName },
  { key: 'mime', header: 'Format', filter: 'select', accessor: (d) => d.mimeType ?? '—', render: (d) => d.mimeType ?? '—' },
  { key: 'uploaded', header: 'Uploaded', filter: 'date', sortable: true, accessor: (d) => d.createdAt, render: (d) => formatDateTime(d.createdAt) },
]

export default function AdminDocumentTrackerPage() {
  const [rows, setRows] = useState<KycDocumentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await adminApi.listAllKycDocuments())
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <>
      <PageTitle title="Document Tracker" subtitle="All uploaded KYC documents across clients." />
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(d) => d.id}
        loading={loading}
        error={error}
        onRetry={load}
        emptyIcon={FileSearch}
        emptyTitle="No documents"
        emptyDescription="Uploaded KYC documents will appear here."
        minWidthClass="min-w-[760px]"
      />
    </>
  )
}
