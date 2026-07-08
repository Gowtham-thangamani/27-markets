import { useCallback, useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import { Badge } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { ApiError } from '@/lib/api'
import { adminApi, type ReferralSummaryRow } from '@/lib/adminApi'
import { DataTable, type Column } from '@/components/admin/table'

const columns: Column<ReferralSummaryRow>[] = [
  {
    key: 'partner', header: 'Referring user', filter: 'text', sortable: true,
    accessor: (r) => r.name,
    render: (r) => (
      <div>
        <div className="font-medium text-white">{r.name}</div>
        <div className="text-xs text-gray-500">{r.email}</div>
      </div>
    ),
  },
  {
    key: 'count', header: 'Referrals', align: 'right', sortable: true,
    accessor: (r) => r.referralCount,
    render: (r) => <Badge tone="brand">{r.referralCount}</Badge>,
  },
]

export default function AdminUserReferralsPage() {
  const [rows, setRows] = useState<ReferralSummaryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await adminApi.referralSummary())
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
      <PageTitle title="User Referrals" subtitle="Referring users ranked by number of referrals." />
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        loading={loading}
        error={error}
        onRetry={load}
        emptyIcon={Users}
        emptyTitle="No referrers"
        emptyDescription="Users who refer clients will appear here."
        minWidthClass="min-w-[520px]"
      />
    </>
  )
}
