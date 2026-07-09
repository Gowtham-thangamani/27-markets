import { useCallback, useEffect, useState } from 'react'
import { Handshake } from 'lucide-react'
import { Badge, Modal, SkeletonRows } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format'
import { ApiError } from '@/lib/api'
import { adminApi, type PartnerItem, type PartnerCommission } from '@/lib/adminApi'
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
