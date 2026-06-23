import { useCallback, useEffect, useState } from 'react'
import { Wallet } from 'lucide-react'
import { Badge, Button, EmptyState, ErrorState, SkeletonRows } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { useToast } from '@/context/ToastContext'
import { formatCurrency } from '@/lib/format'
import { ApiError } from '@/lib/api'
import { financeApi, type AdminAccount } from '@/lib/financeApi'

const LEVERAGES = ['1:100', '1:200', '1:400', '1:500']
const statusTone: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  ACTIVE: 'success',
  PENDING: 'warning',
  SUSPENDED: 'danger',
  ARCHIVED: 'neutral',
}

export default function AdminAccountsPage() {
  const toast = useToast()
  const [accounts, setAccounts] = useState<AdminAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setAccounts(await financeApi.listAccounts())
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load accounts')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const guard = async (id: string, fn: () => Promise<unknown>) => {
    setBusy(id)
    try {
      await fn()
      await load()
    } catch (e) {
      const msg = e instanceof ApiError && e.status === 403 ? 'Only admins can manage accounts.' : (e as Error).message
      toast.error('Update failed', msg)
    } finally {
      setBusy(null)
    }
  }

  const toggleStatus = (a: AdminAccount) =>
    guard(a.id, async () => {
      const next = a.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
      await financeApi.setAccountStatus(a.id, next)
      toast.success(next === 'ACTIVE' ? 'Account activated' : 'Account suspended')
    })

  const changeLeverage = (a: AdminAccount, leverage: string) =>
    guard(a.id, async () => {
      await financeApi.setAccountLeverage(a.id, leverage)
      toast.success('Leverage updated', `${a.number} → ${leverage}`)
    })

  return (
    <>
      <PageTitle title="Accounts" subtitle="Administer trading accounts." />

      {error ? (
        <ErrorState description={error} onRetry={load} />
      ) : loading ? (
        <SkeletonRows rows={6} />
      ) : accounts.length === 0 ? (
        <EmptyState icon={Wallet} title="No accounts" description="No trading accounts exist yet." />
      ) : (
        <div className="glass-panel overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-5 py-3 font-medium">Account</th>
                  <th className="px-5 py-3 font-medium">Owner</th>
                  <th className="px-5 py-3 font-medium">Balance</th>
                  <th className="px-5 py-3 font-medium">Leverage</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {accounts.map((a) => (
                  <tr key={a.id}>
                    <td className="px-5 py-3.5 text-gray-200">
                      {a.number} <span className="text-xs text-gray-500">· {a.type} · {a.mode}</span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-300">
                      <div>{a.owner.name}</div>
                      <div className="text-xs text-gray-500">{a.owner.email}</div>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-white">{formatCurrency(Number(a.balance))}</td>
                    <td className="px-5 py-3.5">
                      <select
                        aria-label={`Leverage for ${a.number}`}
                        value={a.leverage}
                        disabled={busy === a.id}
                        onChange={(e) => changeLeverage(a, e.target.value)}
                        className="rounded-md border border-white/10 bg-ink-800 px-2 py-1 text-sm text-gray-200"
                      >
                        {LEVERAGES.includes(a.leverage) ? null : <option value={a.leverage}>{a.leverage}</option>}
                        {LEVERAGES.map((l) => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge tone={statusTone[a.status] ?? 'neutral'} dot>{a.status}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        loading={busy === a.id}
                        onClick={() => toggleStatus(a)}
                      >
                        {a.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
