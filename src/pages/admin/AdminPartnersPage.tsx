import { useCallback, useEffect, useState } from 'react'
import { Handshake, Check, X } from 'lucide-react'
import { Badge, Modal, SkeletonRows } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { useToast } from '@/context/ToastContext'
import { formatCurrency, formatDate, formatDateTime, relativeTime } from '@/lib/format'
import { ApiError } from '@/lib/api'
import { adminApi, type PartnerItem, type PartnerCommission, type PartnerPayout } from '@/lib/adminApi'
import { DataTable, type Column } from '@/components/admin/table'

const columns: Column<PartnerItem>[] = [
  {
    key: 'name', header: 'Partner', filter: 'text', sortable: true, accessor: (p) => `${p.firstName} ${p.lastName}`,
    render: (p) => (<div><div className="text-white">{p.firstName} {p.lastName}</div><div className="text-xs text-gray-500">{p.email}</div></div>),
  },
  { key: 'code', header: 'Referral code', filter: 'text', accessor: (p) => p.referralCode ?? '', render: (p) => p.referralCode ? <code className="rounded bg-white/5 px-1.5 py-0.5 text-xs text-brand-300">{p.referralCode}</code> : '—' },
  { key: 'referrals', header: 'Referrals', align: 'right', sortable: true, accessor: (p) => p.referredCount, render: (p) => <Badge tone="brand">{p.referredCount}</Badge> },
  { key: 'commission', header: 'Commission', align: 'right', sortable: true, accessor: (p) => p.commissionTotal, render: (p) => <span className="font-medium text-white">{formatCurrency(p.commissionTotal)}</span> },
  {
    key: 'status', header: 'Status', filter: 'select', accessor: (p) => p.status,
    render: (p) => <Badge tone={p.status === 'ACTIVE' ? 'success' : 'neutral'} dot>{p.status}</Badge>,
  },
  { key: 'joined', header: 'Joined', filter: 'date', sortable: true, accessor: (p) => p.createdAt, render: (p) => formatDate(p.createdAt) },
]

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState<PartnerItem[] | null>(null)
  const [error, setError] = useState(false)
  const [active, setActive] = useState<PartnerItem | null>(null)

  useEffect(() => {
    let live = true
    adminApi.listPartners().then((p) => live && setPartners(p)).catch(() => live && setError(true))
    return () => { live = false }
  }, [])

  return (
    <>
      <PageTitle title="Partners / IB" subtitle="Introducing brokers, their referrals, and commissions." />

      <PendingPayoutsPanel />

      <DataTable
        columns={columns}
        rows={partners ?? []}
        rowKey={(p) => p.id}
        onRowClick={(p) => setActive(p)}
        loading={!partners && !error}
        error={error ? 'Could not load partners' : null}
        emptyIcon={Handshake}
        emptyTitle="No partners yet"
        emptyDescription="Partner accounts will appear here."
        minWidthClass="min-w-[720px]"
      />

      <CommissionsModal partner={active} onClose={() => setActive(null)} />
    </>
  )
}

function PendingPayoutsPanel() {
  const toast = useToast()
  const [payouts, setPayouts] = useState<PartnerPayout[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(() => {
    adminApi.listPartnerPayouts().then(setPayouts).catch(() => setPayouts([]))
  }, [])
  useEffect(() => { load() }, [load])

  const act = async (p: PartnerPayout, action: 'approve' | 'reject') => {
    if (action === 'approve' && !window.confirm(`Mark ${formatCurrency(p.amount)} to ${p.partner?.name ?? 'partner'} as paid? This cannot be undone.`)) return
    setBusy(p.id)
    try {
      await (action === 'approve' ? adminApi.approvePartnerPayout(p.id) : adminApi.rejectPartnerPayout(p.id))
      toast.success(action === 'approve' ? 'Payout marked paid' : 'Payout rejected', `${p.partner?.name ?? 'Partner'} · ${formatCurrency(p.amount)}`)
      load()
    } catch (e) {
      toast.error('Action failed', e instanceof ApiError ? e.message : 'Please try again.')
    } finally {
      setBusy(null)
    }
  }

  if (payouts && payouts.length === 0) return null

  return (
    <div className="mb-4 glass-panel p-5">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
        Pending partner payouts {payouts && <Badge tone="warning">{payouts.length}</Badge>}
      </h3>
      {!payouts ? (
        <SkeletonRows rows={2} />
      ) : (
        <div className="space-y-2">
          {payouts.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-ink-800/50 p-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-white">{p.partner?.name ?? '—'} · {formatCurrency(p.amount)}</div>
                <div className="text-xs text-gray-500">{p.partner?.email} · {p.reference} · {relativeTime(p.createdAt)}</div>
              </div>
              <div className="flex gap-2">
                <button disabled={busy === p.id} onClick={() => act(p, 'approve')} className="inline-flex items-center gap-1 rounded-lg border border-success/40 px-3 py-1.5 text-xs font-medium text-success hover:bg-success/10 disabled:opacity-40"><Check className="h-3.5 w-3.5" /> Mark paid</button>
                <button disabled={busy === p.id} onClick={() => act(p, 'reject')} className="inline-flex items-center gap-1 rounded-lg border border-danger/40 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/10 disabled:opacity-40"><X className="h-3.5 w-3.5" /> Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CommissionsModal({ partner, onClose }: { partner: PartnerItem | null; onClose: () => void }) {
  const [rows, setRows] = useState<PartnerCommission[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (id: string) => {
    setRows(null)
    setError(null)
    try {
      setRows(await adminApi.listPartnerCommissions(id))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load commissions')
    }
  }, [])

  useEffect(() => {
    if (partner) void load(partner.id)
  }, [partner, load])

  if (!partner) return null

  return (
    <Modal open={!!partner} onClose={onClose} title={`${partner.firstName} ${partner.lastName}`} description={`${partner.referredCount} referrals · ${formatCurrency(partner.commissionTotal)} earned`} className="max-w-xl">
      {error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : !rows ? (
        <SkeletonRows rows={3} />
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500">No commissions accrued yet. Commissions accrue when referred clients deposit.</p>
      ) : (
        <div className="glass-panel divide-y divide-white/[0.04] p-0">
          {rows.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div>
                <div className="text-white">{c.client}</div>
                <div className="text-xs text-gray-500">{c.source}{c.reference ? ` · ${c.reference}` : ''} · {formatDateTime(c.createdAt)}</div>
              </div>
              <span className="font-medium text-success">{formatCurrency(c.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
