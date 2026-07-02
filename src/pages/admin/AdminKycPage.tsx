import { useCallback, useEffect, useState } from 'react'
import { ShieldCheck, Check, X, FileText } from 'lucide-react'
import { Badge, Button } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { kycLabel, kycTone } from '@/components/admin/adminMaps'
import { useToast } from '@/context/ToastContext'
import { ApiError } from '@/lib/api'
import { adminApi, type ClientListItem, type KycDocument, type KycStepStatus } from '@/lib/adminApi'
import { DataTable, DocumentViewerModal, type Column } from '@/components/admin/table'

const isPendingClient = (c: ClientListItem) =>
  !!c.kycProfile &&
  [c.kycProfile.identityStatus, c.kycProfile.addressStatus, c.kycProfile.selfieStatus].includes('PENDING')

type StepKey = 'identity' | 'address' | 'selfie'
const STEPS: { key: StepKey; field: 'identityStatus' | 'addressStatus' | 'selfieStatus'; label: string }[] = [
  { key: 'identity', field: 'identityStatus', label: 'Identity' },
  { key: 'address', field: 'addressStatus', label: 'Proof of Address' },
  { key: 'selfie', field: 'selfieStatus', label: 'Selfie' },
]

interface DocRow {
  clientId: string
  clientName: string
  email: string
  step: StepKey
  stepLabel: string
  status: KycStepStatus
  doc?: KycDocument
}

export default function AdminKycPage() {
  const toast = useToast()
  const [clients, setClients] = useState<ClientListItem[]>([])
  const [docs, setDocs] = useState<Record<string, KycDocument[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [viewer, setViewer] = useState<{ url: string; name: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await adminApi.listClients()
      setClients(list)
      // Fetch the uploaded documents for each client that has something pending.
      const pendingClients = list.filter(isPendingClient)
      const entries = await Promise.all(
        pendingClients.map(async (c) => [c.id, await adminApi.listKycDocuments(c.id)] as const),
      )
      setDocs(Object.fromEntries(entries))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const review = async (userId: string, step: StepKey, status: 'APPROVED' | 'REJECTED') => {
    const ok = window.confirm(
      status === 'APPROVED'
        ? 'Approve this KYC document?'
        : 'Reject this KYC document? The client will be asked to re-submit.',
    )
    if (!ok) return
    setBusy(`${userId}:${step}`)
    try {
      await adminApi.reviewKyc(userId, step, status)
      toast.success(status === 'APPROVED' ? 'Approved' : 'Rejected', `${step} updated.`)
      await load()
    } catch (e) {
      const msg = e instanceof ApiError && e.status === 403 ? 'Only admins can review KYC.' : (e as Error).message
      toast.error('Review failed', msg)
    } finally {
      setBusy(null)
    }
  }

  // Surface clients that have at least one submitted (PENDING) step first.
  const pending = clients.filter(isPendingClient)

  const docRows: DocRow[] = pending.flatMap((c) =>
    STEPS.map((s) => ({
      clientId: c.id,
      clientName: `${c.firstName} ${c.lastName}`,
      email: c.email,
      step: s.key,
      stepLabel: s.label,
      status: (c.kycProfile?.[s.field] ?? 'NOT_SUBMITTED') as KycStepStatus,
      doc: docs[c.id]?.find((d) => d.step === s.key),
    })),
  )

  const columns: Column<DocRow>[] = [
    {
      key: 'client',
      header: 'Client',
      filter: 'text',
      sortable: true,
      accessor: (r) => r.clientName,
      render: (r) => (
        <div>
          <div className="font-medium text-white">{r.clientName}</div>
          <div className="text-xs text-gray-500">{r.email}</div>
        </div>
      ),
    },
    { key: 'email', header: 'Email', filter: 'text', accessor: (r) => r.email },
    { key: 'step', header: 'Document', filter: 'select', accessor: (r) => r.stepLabel },
    {
      key: 'status',
      header: 'Status',
      filter: 'select',
      accessor: (r) => kycLabel[r.status],
      render: (r) => (
        <Badge tone={kycTone[r.status]} dot>
          {kycLabel[r.status]}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      accessor: () => '',
      render: (r) => (
        <div className="flex items-center gap-2">
          {r.doc && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() => setViewer({ url: adminApi.kycDocumentUrl(r.doc!.id), name: r.doc!.fileName })}
            >
              <FileText className="h-3.5 w-3.5" /> View document
            </Button>
          )}
          {r.status === 'PENDING' && (
            <>
              <Button
                size="sm"
                variant="outline"
                loading={busy === `${r.clientId}:${r.step}`}
                onClick={() => review(r.clientId, r.step, 'APPROVED')}
                className="gap-1 border-success/40 text-success hover:bg-success/10"
              >
                <Check className="h-3.5 w-3.5" /> Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => review(r.clientId, r.step, 'REJECTED')}
                className="gap-1 border-danger/40 text-danger hover:bg-danger/10"
              >
                <X className="h-3.5 w-3.5" /> Reject
              </Button>
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <>
      <PageTitle title="KYC Review" subtitle="Approve or reject submitted client documents." />
      <DataTable
        columns={columns}
        rows={docRows}
        rowKey={(r) => `${r.clientId}:${r.step}`}
        loading={loading}
        error={error}
        onRetry={load}
        emptyIcon={ShieldCheck}
        emptyTitle="Nothing to review"
        emptyDescription="No clients have documents pending review."
        minWidthClass="min-w-[720px]"
      />
      <DocumentViewerModal
        open={!!viewer}
        onClose={() => setViewer(null)}
        url={viewer?.url ?? null}
        fileName={viewer?.name}
      />
    </>
  )
}
