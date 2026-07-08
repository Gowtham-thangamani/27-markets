import { useCallback, useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { formatDateTime } from '@/lib/format'
import { ApiError } from '@/lib/api'
import { adminApi, type ClientListItem, type KycStepStatus } from '@/lib/adminApi'
import { DataTable, type Column } from '@/components/admin/table'

const STEP_TONE: Record<KycStepStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  APPROVED: 'success',
  PENDING: 'warning',
  REJECTED: 'danger',
  NOT_SUBMITTED: 'neutral',
}

function StepBadge({ status }: { status: KycStepStatus }) {
  const label = status === 'NOT_SUBMITTED' ? 'Not submitted' : status.charAt(0) + status.slice(1).toLowerCase()
  return <Badge tone={STEP_TONE[status]}>{label}</Badge>
}

/** Overall KYC status derived from the three steps. */
function overall(k: ClientListItem['kycProfile']): KycStepStatus {
  if (!k) return 'NOT_SUBMITTED'
  const steps = [k.identityStatus, k.addressStatus, k.selfieStatus]
  if (steps.some((s) => s === 'REJECTED')) return 'REJECTED'
  if (steps.every((s) => s === 'APPROVED')) return 'APPROVED'
  if (steps.some((s) => s === 'PENDING')) return 'PENDING'
  return 'NOT_SUBMITTED'
}

const columns: Column<ClientListItem>[] = [
  {
    key: 'client', header: 'Client', filter: 'text', sortable: true,
    accessor: (c) => `${c.firstName} ${c.lastName}`,
    render: (c) => (
      <div>
        <div className="font-medium text-white">{c.firstName} {c.lastName}</div>
        <div className="text-xs text-gray-500">{c.email}</div>
      </div>
    ),
  },
  { key: 'identity', header: 'Identity', filter: 'select', accessor: (c) => c.kycProfile?.identityStatus ?? 'NOT_SUBMITTED', render: (c) => <StepBadge status={c.kycProfile?.identityStatus ?? 'NOT_SUBMITTED'} /> },
  { key: 'address', header: 'Address', filter: 'select', accessor: (c) => c.kycProfile?.addressStatus ?? 'NOT_SUBMITTED', render: (c) => <StepBadge status={c.kycProfile?.addressStatus ?? 'NOT_SUBMITTED'} /> },
  { key: 'selfie', header: 'Selfie', filter: 'select', accessor: (c) => c.kycProfile?.selfieStatus ?? 'NOT_SUBMITTED', render: (c) => <StepBadge status={c.kycProfile?.selfieStatus ?? 'NOT_SUBMITTED'} /> },
  {
    key: 'overall', header: 'Overall', filter: 'select', sortable: true,
    accessor: (c) => overall(c.kycProfile),
    render: (c) => <StepBadge status={overall(c.kycProfile)} />,
  },
  { key: 'joined', header: 'Joined', filter: 'date', sortable: true, accessor: (c) => c.createdAt, render: (c) => formatDateTime(c.createdAt) },
]

export default function AdminUsersKycPage() {
  const [rows, setRows] = useState<ClientListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await adminApi.listClients())
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
      <PageTitle title="Users KYC Forms" subtitle="KYC completion status across all clients." />
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(c) => c.id}
        loading={loading}
        error={error}
        onRetry={load}
        emptyIcon={ShieldCheck}
        emptyTitle="No clients"
        emptyDescription="Client KYC status will appear here."
        minWidthClass="min-w-[820px]"
      />
    </>
  )
}
