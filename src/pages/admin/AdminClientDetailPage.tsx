import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Badge, Card, ErrorState, SkeletonCard } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { formatDate, formatCurrency } from '@/lib/format'
import { ApiError } from '@/lib/api'
import { adminApi, type ClientDetail } from '@/lib/adminApi'

const KYC_TONE: Record<string, 'success' | 'warning' | 'neutral' | 'danger'> = {
  APPROVED: 'success', PENDING: 'warning', NOT_SUBMITTED: 'neutral', REJECTED: 'danger',
}
const STATUS_TONE: Record<string, 'success' | 'warning' | 'neutral' | 'danger'> = {
  ACTIVE: 'success', SUSPENDED: 'danger', PENDING: 'warning',
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-0.5 text-sm text-white">{value ?? '—'}</div>
    </div>
  )
}

/** A titled block with a consistent empty line, so a quiet section reads as
 *  "nothing here yet" rather than as a rendering failure. */
function Section({ title, empty, isEmpty, children }: {
  title: string; empty: string; isEmpty: boolean; children: ReactNode
}) {
  return (
    <Card className="p-5">
      <h2 className="mb-3 font-display text-sm font-semibold text-white">{title}</h2>
      {isEmpty ? <p className="py-6 text-center text-sm text-gray-500">{empty}</p> : children}
    </Card>
  )
}

function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-gray-500">
            {head.map((h) => <th key={h} className="whitespace-nowrap px-3 py-2 font-medium">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">{children}</tbody>
      </table>
    </div>
  )
}

export default function AdminClientDetailPage() {
  const { id = '' } = useParams()
  const [data, setData] = useState<ClientDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      setData(await adminApi.getClient(id))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load this client.')
    }
  }, [id])
  useEffect(() => { void load() }, [load])

  if (error) return <><PageTitle title="Client" subtitle="Full profile." /><ErrorState description={error} onRetry={load} /></>
  if (!data) return <><PageTitle title="Client" subtitle="Full profile." /><div className="grid gap-4 lg:grid-cols-2"><SkeletonCard /><SkeletonCard /></div></>

  // The frontend and backend deploy separately, so between the two the API can
  // still be returning the payload from before these sections existed. Default
  // them rather than reading .length off undefined and dropping the whole page
  // into the error boundary — a missing section should read as empty, not break
  // everything else on the page.
  const accounts = data.accounts ?? []
  const transactions = data.transactions ?? []
  const orders = data.orders ?? []
  const auditLog = data.auditLog ?? []
  const tickets = data.tickets ?? []

  return (
    <>
      <Link to="/admin/clients" className="mb-3 inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Clients
      </Link>

      <Card className="mb-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-xl font-bold text-white">{data.name}</h1>
            <p className="mt-0.5 text-sm text-gray-400">{data.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={STATUS_TONE[data.status] ?? 'neutral'}>{data.status}</Badge>
            {data.kyc && <Badge tone={KYC_TONE[data.kyc.identityStatus] ?? 'neutral'} dot>KYC {data.kyc.identityStatus.replace('_', ' ')}</Badge>}
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Phone" value={data.phone} />
          <Field label="Country" value={data.country} />
          <Field label="Joined" value={formatDate(data.joinedAt)} />
          <Field label="Sales agent" value={data.assignedAgent} />
        </div>
        {data.lead && (
          <p className="mt-4 border-t border-white/5 pt-3 text-xs text-gray-500">
            Converted from a <span className="text-gray-300">{data.lead.source}</span> lead
            {' '}({data.lead.status}) created {formatDate(data.lead.createdAt)}
          </p>
        )}
      </Card>

      <div className="grid gap-4">
        <Section title="Trading accounts" empty="No accounts opened yet." isEmpty={accounts.length === 0}>
          <Table head={['Account', 'Type', 'Mode', 'Status', 'Balance']}>
            {accounts.map((a) => (
              <tr key={a.id}>
                <td className="px-3 py-2 font-mono text-white">{a.number}</td>
                <td className="px-3 py-2 text-gray-300">{a.type}</td>
                <td className="px-3 py-2"><Badge tone={a.mode === 'LIVE' ? 'success' : 'neutral'}>{a.mode}</Badge></td>
                <td className="px-3 py-2 text-gray-300">{a.status}</td>
                <td className="px-3 py-2 text-right font-mono text-white">{formatCurrency(Number(a.balance))}</td>
              </tr>
            ))}
          </Table>
        </Section>

        <Section title="Deposits & withdrawals" empty="No transactions yet." isEmpty={transactions.length === 0}>
          <Table head={['Reference', 'Kind', 'Direction', 'Amount', 'Status', 'Date']}>
            {transactions.map((t) => (
              <tr key={t.id}>
                <td className="px-3 py-2 font-mono text-white">{t.reference}</td>
                <td className="px-3 py-2 text-gray-300">{t.kind}</td>
                <td className="px-3 py-2">
                  <Badge tone={t.direction === 'CREDIT' ? 'success' : 'warning'}>{t.direction}</Badge>
                </td>
                <td className="px-3 py-2 text-right font-mono text-white">{formatCurrency(Number(t.amount))}</td>
                <td className="px-3 py-2 text-gray-300">{t.status}{t.simulated ? ' · sim' : ''}</td>
                <td className="px-3 py-2 text-xs text-gray-500">{formatDate(t.at)}</td>
              </tr>
            ))}
          </Table>
        </Section>

        <Section title="Trading activity" empty="No orders yet." isEmpty={orders.length === 0}>
          <Table head={['Symbol', 'Side', 'Type', 'Qty', 'Price', 'Status', 'Date']}>
            {orders.map((o) => (
              <tr key={o.id}>
                <td className="px-3 py-2 font-medium text-white">{o.symbol}</td>
                <td className="px-3 py-2"><Badge tone={o.side === 'BUY' ? 'success' : 'danger'}>{o.side}</Badge></td>
                <td className="px-3 py-2 text-gray-300">{o.type}</td>
                <td className="px-3 py-2 font-mono text-gray-300">{o.quantity}</td>
                <td className="px-3 py-2 font-mono text-gray-300">{o.price}</td>
                <td className="px-3 py-2 text-gray-300">{o.status}</td>
                <td className="px-3 py-2 text-xs text-gray-500">{formatDate(o.createdAt)}</td>
              </tr>
            ))}
          </Table>
        </Section>

        <Section title="Activity & audit" empty="No activity recorded yet." isEmpty={auditLog.length === 0}>
          <Table head={['Action', 'Entity', 'IP', 'When']}>
            {auditLog.map((a) => (
              <tr key={a.id}>
                <td className="px-3 py-2 font-mono text-white">{a.action}</td>
                <td className="px-3 py-2 text-gray-300">{a.entity ?? '—'}</td>
                <td className="px-3 py-2 font-mono text-xs text-gray-400">{a.ip ?? '—'}</td>
                <td className="px-3 py-2 text-xs text-gray-500">{formatDate(a.createdAt)}</td>
              </tr>
            ))}
          </Table>
        </Section>

        <Section title="Support tickets" empty="No tickets raised." isEmpty={tickets.length === 0}>
          <Table head={['Subject', 'Status', 'Updated']}>
            {tickets.map((t) => (
              <tr key={t.id}>
                <td className="px-3 py-2 text-white">{t.subject}</td>
                <td className="px-3 py-2 text-gray-300">{t.status}</td>
                <td className="px-3 py-2 text-xs text-gray-500">{formatDate(t.updatedAt)}</td>
              </tr>
            ))}
          </Table>
        </Section>
      </div>
    </>
  )
}
