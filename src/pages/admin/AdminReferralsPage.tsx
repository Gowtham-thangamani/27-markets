import { useCallback, useEffect, useState } from 'react'
import { Share2 } from 'lucide-react'
import { PageTitle } from '@/components/portal/PageTitle'
import { formatDateTime } from '@/lib/format'
import { ApiError } from '@/lib/api'
import { adminApi, type ReferralRow } from '@/lib/adminApi'
import { DataTable, type Column } from '@/components/admin/table'

const columns: Column<ReferralRow>[] = [
  {
    key: 'referred', header: 'Referred client', filter: 'text', sortable: true,
    accessor: (r) => r.referred.name,
    render: (r) => (
      <div>
        <div className="font-medium text-white">{r.referred.name}</div>
        <div className="text-xs text-gray-500">{r.referred.email}</div>
      </div>
    ),
  },
  {
    key: 'referrer', header: 'Referred by', filter: 'text', sortable: true,
    accessor: (r) => r.referrer?.name ?? '',
    render: (r) => r.referrer ? (
      <div>
        <div className="text-gray-200">{r.referrer.name}</div>
        <div className="text-xs text-gray-500">{r.referrer.email}</div>
      </div>
    ) : <span className="text-gray-500">—</span>,
  },
  { key: 'joined', header: 'Joined', filter: 'date', sortable: true, accessor: (r) => r.joinedAt, render: (r) => formatDateTime(r.joinedAt) },
]

export default function AdminReferralsPage() {
  const [rows, setRows] = useState<ReferralRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await adminApi.listReferrals())
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load referrals')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <>
      <PageTitle title="Referrals" subtitle="Clients who signed up through a partner referral." />
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        loading={loading}
        error={error}
        onRetry={load}
        emptyIcon={Share2}
        emptyTitle="No referrals"
        emptyDescription="Referred sign-ups will appear here."
        minWidthClass="min-w-[720px]"
      />
    </>
  )
}
