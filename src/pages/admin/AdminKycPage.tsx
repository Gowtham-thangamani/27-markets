import { useCallback, useEffect, useState } from 'react'
import { ShieldCheck, Check, X, FileText } from 'lucide-react'
import { Badge, Button, EmptyState, ErrorState, SkeletonRows } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { kycLabel, kycTone } from '@/components/admin/adminMaps'
import { useToast } from '@/context/ToastContext'
import { initials } from '@/lib/format'
import { ApiError } from '@/lib/api'
import { adminApi, type ClientListItem, type KycDocument, type KycStepStatus } from '@/lib/adminApi'

const isPendingClient = (c: ClientListItem) =>
  !!c.kycProfile &&
  [c.kycProfile.identityStatus, c.kycProfile.addressStatus, c.kycProfile.selfieStatus].includes('PENDING')

type StepKey = 'identity' | 'address' | 'selfie'
const STEPS: { key: StepKey; field: 'identityStatus' | 'addressStatus' | 'selfieStatus'; label: string }[] = [
  { key: 'identity', field: 'identityStatus', label: 'Identity' },
  { key: 'address', field: 'addressStatus', label: 'Proof of Address' },
  { key: 'selfie', field: 'selfieStatus', label: 'Selfie' },
]

export default function AdminKycPage() {
  const toast = useToast()
  const [clients, setClients] = useState<ClientListItem[]>([])
  const [docs, setDocs] = useState<Record<string, KycDocument[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

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

  return (
    <>
      <PageTitle title="KYC Review" subtitle="Approve or reject submitted client documents." />

      {error ? (
        <ErrorState description={error} onRetry={load} />
      ) : loading ? (
        <SkeletonRows rows={4} />
      ) : pending.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="Nothing to review" description="No clients have documents pending review." />
      ) : (
        <div className="space-y-4">
          {pending.map((c) => (
            <div key={c.id} className="glass-panel p-5">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/15 text-sm font-semibold text-brand-300 ring-1 ring-brand-500/30">
                  {initials(`${c.firstName} ${c.lastName}`)}
                </span>
                <div>
                  <div className="font-medium text-white">{c.firstName} {c.lastName}</div>
                  <div className="text-xs text-gray-500">{c.email}</div>
                </div>
              </div>

              <div className="space-y-2">
                {STEPS.map((s) => {
                  const status = (c.kycProfile?.[s.field] ?? 'NOT_SUBMITTED') as KycStepStatus
                  const isPending = status === 'PENDING'
                  const doc = docs[c.id]?.find((d) => d.step === s.key)
                  return (
                    <div key={s.key} className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-ink-800/50 px-4 py-2.5">
                      <span className="text-sm text-gray-300">{s.label}</span>
                      <div className="flex items-center gap-2">
                        {doc && (
                          <a
                            href={adminApi.kycDocumentUrl(doc.id)}
                            target="_blank"
                            rel="noreferrer"
                            title={doc.fileName}
                            className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-xs text-gray-300 hover:bg-white/10 hover:text-white"
                          >
                            <FileText className="h-3.5 w-3.5" /> View
                          </a>
                        )}
                        <Badge tone={kycTone[status]} dot>{kycLabel[status]}</Badge>
                        {isPending && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              loading={busy === `${c.id}:${s.key}`}
                              onClick={() => review(c.id, s.key, 'APPROVED')}
                              className="gap-1 border-success/40 text-success hover:bg-success/10"
                            >
                              <Check className="h-3.5 w-3.5" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => review(c.id, s.key, 'REJECTED')}
                              className="gap-1 border-danger/40 text-danger hover:bg-danger/10"
                            >
                              <X className="h-3.5 w-3.5" /> Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
