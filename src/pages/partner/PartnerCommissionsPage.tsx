import { useCallback, useEffect, useMemo, useState } from 'react'
import { Coins, Download } from 'lucide-react'
import { Badge, Button, Input, Select, EmptyState, ErrorState, SkeletonRows } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { formatCurrency, formatDate } from '@/lib/format'
import { ApiError } from '@/lib/api'
import { partnerApi, type PartnerCommissions, type CommissionStatus } from '@/lib/partnerApi'

const statusTone: Record<CommissionStatus, 'success' | 'warning' | 'info'> = {
  AVAILABLE: 'success',
  IN_REVIEW: 'warning',
  PAID: 'info',
}
const statusLabel: Record<CommissionStatus, string> = {
  AVAILABLE: 'Available',
  IN_REVIEW: 'In review',
  PAID: 'Paid',
}

function Tile({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'success' | 'info' }) {
  const color = tone === 'success' ? 'text-success' : tone === 'info' ? 'text-brand-400' : 'text-white'
  return (
    <div className="glass-panel p-5">
      <div className={`font-display text-2xl font-bold tabular-nums ${color}`}>{value}</div>
      <div className="mt-1 text-xs text-gray-400">{label}</div>
    </div>
  )
}

function toCsv(rows: PartnerCommissions['rows']): string {
  const header = ['Date', 'Client', 'Source', 'Reference', 'Amount (USD)', 'Status']
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  const lines = rows.map((r) =>
    [new Date(r.date).toISOString().slice(0, 10), r.client, r.source, r.reference ?? '', r.amount.toFixed(2), statusLabel[r.status]]
      .map((c) => esc(String(c)))
      .join(','),
  )
  return [header.join(','), ...lines].join('\n')
}

export default function PartnerCommissionsPage() {
  const [data, setData] = useState<PartnerCommissions | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<CommissionStatus | 'ALL'>('ALL')
  const [q, setQ] = useState('')

  const load = useCallback(async () => {
    setError(null)
    try {
      setData(await partnerApi.getCommissions())
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load commissions')
    }
  }, [])
  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    if (!data) return []
    const needle = q.trim().toLowerCase()
    return data.rows.filter(
      (r) =>
        (status === 'ALL' || r.status === status) &&
        (!needle || r.client.toLowerCase().includes(needle) || (r.reference ?? '').toLowerCase().includes(needle)),
    )
  }, [data, status, q])

  const inReview = useMemo(
    () => (data ? Number(data.rows.filter((r) => r.status === 'IN_REVIEW').reduce((s, r) => s + r.amount, 0).toFixed(2)) : 0),
    [data],
  )

  const exportCsv = () => {
    const csv = toCsv(filtered)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `commissions-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageTitle title="Commissions" subtitle="Your full commission statement across referred clients." />
        <Button variant="outline" className="gap-1.5" onClick={exportCsv} disabled={!filtered.length}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {error ? (
        <ErrorState description={error} onRetry={load} />
      ) : !data ? (
        <SkeletonRows rows={6} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Tile label="Total earned" value={formatCurrency(data.total)} />
            <Tile label="Available for payout" value={formatCurrency(data.available)} tone="success" />
            <Tile label="In review (requested)" value={formatCurrency(inReview)} />
            <Tile label="Paid out" value={formatCurrency(data.paid)} tone="info" />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="w-44">
              <Select
                aria-label="Filter by status"
                value={status}
                onChange={(e) => setStatus(e.target.value as CommissionStatus | 'ALL')}
                options={[
                  { value: 'ALL', label: 'All statuses' },
                  { value: 'AVAILABLE', label: 'Available' },
                  { value: 'IN_REVIEW', label: 'In review' },
                  { value: 'PAID', label: 'Paid' },
                ]}
              />
            </div>
            <div className="min-w-[12rem] flex-1">
              <Input placeholder="Search client or reference…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <span className="text-xs text-gray-500">
              {filtered.length} of {data.count}
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                icon={Coins}
                title="No commissions"
                description="Commissions appear here as your referred clients trade and fund their accounts."
              />
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-white/[0.06]">
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="bg-ink-800/60 text-left text-gray-400">
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Client</th>
                    <th className="px-4 py-3 font-medium">Source</th>
                    <th className="px-4 py-3 font-medium text-right">Amount</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-white/[0.02]">
                      <td className="whitespace-nowrap px-4 py-3.5 text-gray-400">{formatDate(r.date)}</td>
                      <td className="px-4 py-3.5 text-white">{r.client}</td>
                      <td className="px-4 py-3.5 capitalize text-gray-400">{r.source}</td>
                      <td className="px-4 py-3.5 text-right font-mono tabular-nums text-white">{formatCurrency(r.amount)}</td>
                      <td className="px-4 py-3.5">
                        <Badge tone={statusTone[r.status]}>{statusLabel[r.status]}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  )
}
