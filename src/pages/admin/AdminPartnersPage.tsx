import { useEffect, useState } from 'react'
import { Handshake } from 'lucide-react'
import { Badge } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { formatDate } from '@/lib/format'
import { adminApi, type PartnerItem } from '@/lib/adminApi'
import { DataTable, type Column } from '@/components/admin/table'

const columns: Column<PartnerItem>[] = [
  {
    key: 'name', header: 'Partner', filter: 'text', sortable: true, accessor: (p) => `${p.firstName} ${p.lastName}`,
    render: (p) => (<div><div className="text-white">{p.firstName} {p.lastName}</div><div className="text-xs text-gray-500">{p.email}</div></div>),
  },
  { key: 'email', header: 'Email', filter: 'text', accessor: (p) => p.email },
  { key: 'country', header: 'Country', filter: 'select', accessor: (p) => p.country ?? '', render: (p) => p.country ?? '—' },
  {
    key: 'status', header: 'Status', filter: 'select', accessor: (p) => p.status,
    render: (p) => <Badge tone={p.status === 'ACTIVE' ? 'success' : 'neutral'} dot>{p.status}</Badge>,
  },
  { key: 'joined', header: 'Joined', filter: 'date', sortable: true, accessor: (p) => p.createdAt, render: (p) => formatDate(p.createdAt) },
]

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState<PartnerItem[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    adminApi
      .listPartners()
      .then((p) => active && setPartners(p))
      .catch(() => active && setError(true))
    return () => {
      active = false
    }
  }, [])

  return (
    <>
      <PageTitle title="Partners / IB" subtitle="Introducing brokers and their referrals." />

      <div className="mb-4 rounded-xl border border-white/[0.06] bg-ink-800/40 p-4 text-sm text-gray-400">
        Commission setup and rebate plans are <span className="text-brand-300">coming in a later phase</span>. This is a
        read-only view of partner accounts.
      </div>

      <DataTable
        columns={columns}
        rows={partners ?? []}
        rowKey={(p) => p.id}
        loading={!partners && !error}
        error={error ? 'Could not load partners' : null}
        emptyIcon={Handshake}
        emptyTitle="No partners yet"
        emptyDescription="Partner accounts will appear here."
        minWidthClass="min-w-[560px]"
      />
    </>
  )
}
