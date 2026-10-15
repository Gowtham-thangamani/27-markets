import { useCallback, useEffect, useState } from 'react'
import { Handshake, Check, X, Copy } from 'lucide-react'
import { Badge, Button, EmptyState, ErrorState, SkeletonRows } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { useToast } from '@/context/ToastContext'
import { ApiError } from '@/lib/api'
import { partnersApi, type PartnerApplication, type ApproveResult } from '@/lib/partnersApi'

export default function AdminPartnerApplicationsPage() {
  const toast = useToast()
  const [apps, setApps] = useState<PartnerApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [invites, setInvites] = useState<Record<string, ApproveResult>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setApps(await partnersApi.listApplications())
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const approve = async (id: string) => {
    setBusy(id)
    try {
      const res = await partnersApi.approve(id)
      setInvites((p) => ({ ...p, [id]: res }))
      toast.success('Approved', 'Application approved — invite details below.')
      await load()
    } catch (e) {
      toast.error('Approve failed', e instanceof ApiError ? e.message : (e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const reject = async (id: string) => {
    setBusy(id)
    try {
      await partnersApi.reject(id)
      toast.success('Rejected', 'Application rejected.')
      await load()
    } catch (e) {
      toast.error('Reject failed', e instanceof ApiError ? e.message : (e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <PageTitle title="Partner Applications" subtitle="Review and approve IB applications." />

      {error ? (
        <ErrorState description={error} onRetry={load} />
      ) : loading ? (
        <SkeletonRows rows={4} />
      ) : apps.length === 0 ? (
        <EmptyState icon={Handshake} title="No applications" description="No partner applications yet." />
      ) : (
        <div className="space-y-3">
          {apps.map((a) => {
            const invite = invites[a.id]
            return (
              <div key={a.id} className="glass-panel p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium text-white">
                      {a.firstName} {a.lastName}
                      {a.company && <span className="ml-2 text-xs text-gray-500">{a.company}</span>}
                    </div>
                    <div className="text-xs text-gray-500">
                      <span>{a.email}</span>
                      {a.country && <span> · {a.country}</span>}
                      {a.website && <span> · {a.website}</span>}
                    </div>
                    {a.audience && <div className="mt-1 text-sm text-gray-400">{a.audience}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      tone={
                        a.status === 'PENDING'
                          ? 'warning'
                          : a.status === 'APPROVED'
                            ? 'success'
                            : 'danger'
                      }
                      dot
                    >
                      {a.status}
                    </Badge>
                    {a.status === 'PENDING' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          loading={busy === a.id}
                          onClick={() => approve(a.id)}
                          className="gap-1 border-success/40 text-success hover:bg-success/10"
                        >
                          <Check className="h-3.5 w-3.5" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => reject(a.id)}
                          className="gap-1 border-danger/40 text-danger hover:bg-danger/10"
                        >
                          <X className="h-3.5 w-3.5" /> Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {invite && (
                  <div className="mt-4 rounded-lg border border-success/30 bg-success/5 p-3 text-sm">
                    <div className="text-white">
                      Referral code: <span className="font-mono text-success">{invite.referralCode}</span>
                    </div>
                    <button
                      type="button"
                      className="mt-1 inline-flex items-center gap-1 text-xs text-brand-300 hover:text-brand-200"
                      onClick={() => {
                        void navigator.clipboard?.writeText(invite.inviteUrl)
                        toast.success('Copied', 'Invite link copied.')
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" /> {invite.inviteUrl}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
