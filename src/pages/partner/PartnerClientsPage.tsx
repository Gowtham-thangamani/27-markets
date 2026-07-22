import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users } from 'lucide-react'
import { Badge, EmptyState, ErrorState, SkeletonRows } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { useToast } from '@/context/ToastContext'
import { initials, formatDate, formatCurrency } from '@/lib/format'
import { ApiError } from '@/lib/api'
import { partnerApi, type PartnerClient, type ConversionStatus } from '@/lib/partnerApi'

const KYC_TONE: Record<string, 'success' | 'warning' | 'neutral' | 'danger'> = {
  APPROVED: 'success', PENDING: 'warning', NOT_SUBMITTED: 'neutral', REJECTED: 'danger',
}

/** Compact badge label per trading account, e.g. STANDARD/LIVE → "STD". */
const ACCOUNT_ABBR: Record<string, string> = { STANDARD: 'STD', RAW_SPREAD: 'RAW', VIP: 'VIP' }

const CONVERSION_OPTIONS: { value: ConversionStatus; label: string }[] = [
  { value: 'NO_ANSWER', label: 'No Answer' },
  { value: 'ON_BOARDING', label: 'On Boarding' },
  { value: 'CONVERTED', label: 'Converted' },
  { value: 'NOT_INTERESTED', label: 'Not Interested' },
]

/** Left border tint on the select, so pipeline state is scannable at a glance. */
const CONVERSION_ACCENT: Record<ConversionStatus, string> = {
  NO_ANSWER: 'border-l-gray-500',
  ON_BOARDING: 'border-l-amber-400',
  CONVERTED: 'border-l-success',
  NOT_INTERESTED: 'border-l-danger',
}

function AccountBadges({ accounts }: { accounts: PartnerClient['accounts'] }) {
  if (!accounts.length) return <span className="text-xs text-gray-600">—</span>
  return (
    <div className="flex flex-wrap gap-1">
      {accounts.map((a, i) => (
        <span
          key={i}
          title={`${a.type} · ${a.mode} · ${a.status}`}
          className={`inline-flex h-5 items-center rounded px-1.5 text-[10px] font-semibold tracking-wide ${
            a.mode === 'DEMO'
              ? 'bg-white/5 text-gray-400 ring-1 ring-white/10'
              : a.status === 'ACTIVE'
                ? 'bg-brand-500/15 text-brand-300 ring-1 ring-brand-500/30'
                : 'bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/30'
          }`}
        >
          {ACCOUNT_ABBR[a.type] ?? a.type}
        </span>
      ))}
    </div>
  )
}

function ConversionSelect({
  value, disabled, onChange,
}: { value: ConversionStatus; disabled: boolean; onChange: (v: ConversionStatus) => void }) {
  return (
    <select
      aria-label="Conversion status"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as ConversionStatus)}
      className={`w-36 rounded-lg border border-l-2 border-white/10 bg-ink-800/60 px-2 py-1.5 text-xs text-gray-200 outline-none transition-colors hover:bg-white/5 focus:border-brand-500 disabled:opacity-50 ${CONVERSION_ACCENT[value]}`}
    >
      {CONVERSION_OPTIONS.map((o) => (
        <option key={o.value} value={o.value} className="bg-ink-800 text-white">{o.label}</option>
      ))}
    </select>
  )
}

export default function PartnerClientsPage() {
  const toast = useToast()
  const [rows, setRows] = useState<PartnerClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { setRows(await partnerApi.getClients()) }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Failed to load') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  const changeConversion = useCallback(async (client: PartnerClient, status: ConversionStatus) => {
    const prev = client.conversionStatus
    if (prev === status) return
    setSavingId(client.id)
    setRows((rs) => rs.map((r) => (r.id === client.id ? { ...r, conversionStatus: status } : r))) // optimistic
    try {
      await partnerApi.setConversion(client.id, status)
      toast.success('Updated', `${client.name} · ${CONVERSION_OPTIONS.find((o) => o.value === status)?.label}`)
    } catch (e) {
      setRows((rs) => rs.map((r) => (r.id === client.id ? { ...r, conversionStatus: prev } : r))) // rollback
      toast.error('Could not update', e instanceof ApiError ? e.message : 'Please try again.')
    } finally {
      setSavingId(null)
    }
  }, [toast])

  return (
    <>
      <PageTitle title="Referred Clients" subtitle="Clients who signed up through your referral link." />
      {error ? <ErrorState description={error} onRetry={load} />
        : loading ? <SkeletonRows rows={6} />
        : rows.length === 0 ? <EmptyState icon={Users} title="No referrals yet" description="Share your referral link to start referring clients." />
        : (
          <div className="glass-panel overflow-x-auto">
            <table className="w-full min-w-[1500px] text-sm">
              <thead><tr className="border-b border-white/[0.06] text-left text-xs text-gray-500">
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Country</th>
                <th className="px-4 py-3 font-medium">Campaign</th>
                <th className="px-4 py-3 font-medium">Trading Accounts</th>
                <th className="px-4 py-3 font-medium">Can Trade</th>
                <th className="px-4 py-3 font-medium">Conversion Status</th>
                <th className="px-4 py-3 font-medium">KYC Status</th>
                <th className="px-4 py-3 font-medium">Signed Up</th>
                <th className="px-4 py-3 font-medium">Last Login</th>
                <th className="px-4 py-3 font-medium">Converted</th>
                <th className="px-4 py-3 font-medium text-right">Total Deposits</th>
                <th className="px-4 py-3 font-medium">Sales Agent</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr></thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-500">{c.id.slice(-8)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-xs font-semibold text-brand-300 ring-1 ring-brand-500/30">{initials(c.name)}</span>
                        <div className="min-w-0"><div className="truncate font-medium text-white">{c.name}</div><div className="truncate text-xs text-gray-500">{c.email}</div></div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-300">{c.phone ?? '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-300">{c.country ?? '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-400">{c.campaign ?? '—'}</td>
                    <td className="px-4 py-3"><AccountBadges accounts={c.accounts} /></td>
                    <td className="px-4 py-3">
                      <Badge tone={c.canTrade ? 'success' : 'danger'}>{c.canTrade ? 'Yes' : 'No'}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <ConversionSelect value={c.conversionStatus} disabled={savingId === c.id} onChange={(v) => changeConversion(c, v)} />
                    </td>
                    <td className="px-4 py-3"><Badge tone={KYC_TONE[c.kyc] ?? 'neutral'} dot>{c.kyc.replace('_', ' ')}</Badge></td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">{formatDate(c.createdAt)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">{c.lastLoginAt ? formatDate(c.lastLoginAt) : 'Never'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">{c.convertedAt ? formatDate(c.convertedAt) : '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums text-white">{formatCurrency(c.totalDeposits)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-300">{c.salesAgent ?? '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3"><Link to={`/partner/clients/${c.id}`} className="text-xs font-medium text-brand-400 hover:text-brand-300">View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </>
  )
}
