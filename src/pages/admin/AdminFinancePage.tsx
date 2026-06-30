import { useCallback, useEffect, useState } from 'react'
import { Check, X, Banknote, ArrowDownToLine, Wallet } from 'lucide-react'
import { Badge, Button, EmptyState, ErrorState, SkeletonRows } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { useToast } from '@/context/ToastContext'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { ApiError } from '@/lib/api'
import { financeApi, type FinanceTxn, type DepositRequestRow } from '@/lib/financeApi'
import { DataTable, type Column } from '@/components/admin/table'

const depositColumns: Column<FinanceTxn>[] = [
  { key: 'client', header: 'Client', filter: 'text', sortable: true, accessor: (d) => d.client?.name ?? 'Unknown' },
  { key: 'email', header: 'Email', filter: 'text', accessor: (d) => d.client?.email ?? '', render: (d) => d.client?.email ?? '—' },
  { key: 'account', header: 'Account', filter: 'text', accessor: (d) => d.accountNumber ?? '', render: (d) => d.accountNumber ?? '—' },
  { key: 'amount', header: 'Amount', align: 'right', sortable: true, accessor: (d) => Number(d.amount), render: (d) => formatCurrency(Number(d.amount)) },
  { key: 'date', header: 'Date', filter: 'date', sortable: true, accessor: (d) => d.createdAt, render: (d) => formatDateTime(d.createdAt) },
]

export default function AdminFinancePage() {
  const toast = useToast()
  const [withdrawals, setWithdrawals] = useState<FinanceTxn[]>([])
  const [deposits, setDeposits] = useState<FinanceTxn[]>([])
  const [depositReqs, setDepositReqs] = useState<DepositRequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [w, d, dr] = await Promise.all([
        financeApi.pendingWithdrawals(),
        financeApi.deposits(),
        financeApi.depositRequests(),
      ])
      setWithdrawals(w)
      setDeposits(d)
      setDepositReqs(dr)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load finance data')
    } finally {
      setLoading(false)
    }
  }, [])

  const actDeposit = async (id: string, action: 'approve' | 'reject') => {
    setBusy(id)
    try {
      if (action === 'approve') await financeApi.approveDepositRequest(id)
      else await financeApi.rejectDepositRequest(id)
      toast.success(action === 'approve' ? 'Deposit confirmed & credited' : 'Deposit request rejected')
      await load()
    } catch (e) {
      const msg = e instanceof ApiError && e.status === 403 ? 'Only admins can confirm deposits.' : (e as Error).message
      toast.error('Action failed', msg)
    } finally {
      setBusy(null)
    }
  }

  useEffect(() => {
    void load()
  }, [load])

  const act = async (id: string, action: 'approve' | 'reject') => {
    setBusy(id)
    try {
      if (action === 'approve') await financeApi.approveWithdrawal(id)
      else await financeApi.rejectWithdrawal(id)
      toast.success(action === 'approve' ? 'Withdrawal approved' : 'Withdrawal rejected')
      await load()
    } catch (e) {
      const msg = e instanceof ApiError && e.status === 403 ? 'Only admins can action withdrawals.' : (e as Error).message
      toast.error('Action failed', msg)
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <PageTitle title="Finance" subtitle="Approve withdrawals and review deposits." />

      {error ? (
        <ErrorState description={error} onRetry={load} />
      ) : loading ? (
        <SkeletonRows rows={5} />
      ) : (
        <div className="space-y-8">
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
              <Banknote className="h-4 w-4 text-brand-400" /> Pending Withdrawals
              <Badge tone="warning">{withdrawals.length}</Badge>
            </h3>
            {withdrawals.length === 0 ? (
              <EmptyState icon={Banknote} title="No pending withdrawals" description="Nothing awaiting approval." />
            ) : (
              <div className="glass-panel divide-y divide-white/[0.04] p-0">
                {withdrawals.map((w) => (
                  <div key={w.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                    <div>
                      <div className="font-medium text-white">{w.client?.name ?? 'Unknown'} · {formatCurrency(Number(w.amount))}</div>
                      <div className="text-xs text-gray-500">
                        {w.client?.email} · {w.accountNumber ?? '—'} · {formatDateTime(w.createdAt)}
                      </div>
                      {w.destination && (
                        <div className="mt-1 text-xs text-brand-300">
                          {w.destination.method === 'crypto'
                            ? `Pay → ${w.destination.network ?? 'crypto'}: ${w.destination.walletAddress}`
                            : `Pay → ${w.destination.accountName} · ${w.destination.accountNumber}${w.destination.bankName ? ` · ${w.destination.bankName}` : ''}${w.destination.swift ? ` · ${w.destination.swift}` : ''}`}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        loading={busy === w.id}
                        onClick={() => act(w.id, 'approve')}
                        className="gap-1 border-success/40 text-success hover:bg-success/10"
                      >
                        <Check className="h-3.5 w-3.5" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => act(w.id, 'reject')}
                        className="gap-1 border-danger/40 text-danger hover:bg-danger/10"
                      >
                        <X className="h-3.5 w-3.5" /> Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
              <Wallet className="h-4 w-4 text-brand-400" /> Deposit Requests (bank / crypto)
              <Badge tone="warning">{depositReqs.length}</Badge>
            </h3>
            {depositReqs.length === 0 ? (
              <EmptyState icon={Wallet} title="No deposit requests" description="Bank/crypto deposits awaiting confirmation will appear here." />
            ) : (
              <div className="glass-panel divide-y divide-white/[0.04] p-0">
                {depositReqs.map((d) => (
                  <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                    <div>
                      <div className="font-medium text-white">
                        {d.client?.name ?? 'Unknown'} · {formatCurrency(Number(d.amount))}
                        <span className="ml-2 text-xs uppercase text-gray-500">{d.method}{d.asset ? ` · ${d.asset}` : ''}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {d.client?.email} · {d.reference} · {formatDateTime(d.createdAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        loading={busy === d.id}
                        onClick={() => actDeposit(d.id, 'approve')}
                        className="gap-1 border-success/40 text-success hover:bg-success/10"
                      >
                        <Check className="h-3.5 w-3.5" /> Confirm &amp; credit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => actDeposit(d.id, 'reject')}
                        className="gap-1 border-danger/40 text-danger hover:bg-danger/10"
                      >
                        <X className="h-3.5 w-3.5" /> Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
              <ArrowDownToLine className="h-4 w-4 text-brand-400" /> Recent Deposits
            </h3>
            {deposits.length === 0 ? (
              <EmptyState icon={ArrowDownToLine} title="No deposits yet" description="Completed deposits will appear here." />
            ) : (
              <DataTable columns={depositColumns} rows={deposits} rowKey={(d) => d.id} minWidthClass="min-w-[640px]" />
            )}
          </section>
        </div>
      )}
    </>
  )
}
