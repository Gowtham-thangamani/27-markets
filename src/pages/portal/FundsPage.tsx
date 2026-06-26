import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Landmark,
  CreditCard,
  Wallet,
  Bitcoin,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  History,
  type LucideIcon,
} from 'lucide-react'
import { Badge, Button, Input, Modal, Select, Tabs, EmptyState, type TabItem } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { statusTone } from '@/components/portal/statusTone'
import { usePortalData } from '@/context/PortalDataContext'
import { useToast } from '@/context/ToastContext'
import { zodResolver } from '@/lib/zodResolver'
import { depositSchema, transferSchema } from '@/lib/validation'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { fundingStatusLabel } from '@/lib/fundingStatus'
import { z } from 'zod'

const tabs: TabItem[] = [
  { id: 'deposit', label: 'Deposit', icon: <ArrowDownToLine className="h-4 w-4" /> },
  { id: 'withdraw', label: 'Withdraw', icon: <ArrowUpFromLine className="h-4 w-4" /> },
  { id: 'transfer', label: 'Internal Transfer', icon: <ArrowLeftRight className="h-4 w-4" /> },
  { id: 'history', label: 'Transaction History', icon: <History className="h-4 w-4" /> },
]

interface Method {
  id: string
  icon: LucideIcon
  name: string
  descriptor: string
}
const methods: Method[] = [
  { id: 'bank', icon: Landmark, name: 'Bank Transfer', descriptor: '1–3 business days' },
  { id: 'card', icon: CreditCard, name: 'Credit / Debit Card', descriptor: 'Instant' },
  { id: 'ewallet', icon: Wallet, name: 'E-Wallets', descriptor: 'Instant · Skrill, Neteller' },
  { id: 'crypto', icon: Bitcoin, name: 'Crypto', descriptor: 'Instant · BTC, ETH, USDT' },
]

type DepositValues = z.infer<typeof depositSchema>
type TransferValues = z.infer<typeof transferSchema>

export default function FundsPage() {
  const [tab, setTab] = useState('deposit')
  return (
    <>
      <PageTitle title="Funds" subtitle="Deposit, withdraw, and transfer funds across your accounts." />
      <Tabs tabs={tabs} active={tab} onChange={setTab} className="mb-6" layoutId="funds-tab" />
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {tab === 'deposit' && <DepositTab />}
          {tab === 'withdraw' && <WithdrawTab />}
          {tab === 'transfer' && <TransferTab />}
          {tab === 'history' && <HistoryTab />}
        </motion.div>
      </AnimatePresence>
    </>
  )
}

function DepositTab() {
  const { accounts, deposit } = usePortalData()
  const toast = useToast()
  const [active, setActive] = useState<Method | null>(null)
  const liveAccounts = accounts.filter((a) => a.mode === 'Live')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DepositValues>({ resolver: zodResolver(depositSchema) })

  const onSubmit = async (values: DepositValues) => {
    try {
      await deposit({ accountId: values.account, amount: values.amount, method: active?.name ?? 'Bank Transfer' })
      toast.success('Deposit successful', `${formatCurrency(values.amount)} credited (simulation).`)
      reset()
      setActive(null)
    } catch (err) {
      toast.error('Deposit failed', (err as Error).message)
    }
  }

  return (
    <>
      <div className="glass-panel p-5">
        <h2 className="font-display text-lg font-semibold text-white">Deposit Methods</h2>
        <div className="mt-4 space-y-3">
          {methods.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-ink-800/50 p-4 transition-colors hover:border-brand-500/30"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/20">
                  <m.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-medium text-white">{m.name}</p>
                  <p className="text-xs text-gray-500">{m.descriptor}</p>
                </div>
              </div>
              <Button size="sm" onClick={() => setActive(m)}>
                Deposit
              </Button>
            </div>
          ))}
        </div>
      </div>

      <Modal
        open={!!active}
        onClose={() => setActive(null)}
        title={`Deposit via ${active?.name ?? ''}`}
        description="Funds are credited instantly in demo mode."
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Select
            label="Deposit to account"
            placeholder="Select account"
            options={liveAccounts.map((a) => ({ value: a.id, label: `${a.number} — ${a.type}` }))}
            error={errors.account?.message}
            {...register('account')}
          />
          <Input
            label="Amount (USD)"
            type="number"
            placeholder="1000"
            error={errors.amount?.message}
            {...register('amount')}
          />
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" fullWidth onClick={() => setActive(null)}>
              Cancel
            </Button>
            <Button type="submit" fullWidth loading={isSubmitting}>
              Confirm Deposit
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}

function WithdrawTab() {
  const { accounts, withdraw, transactions } = usePortalData()
  const toast = useToast()
  const liveAccounts = accounts.filter((a) => a.mode === 'Live')
  const pendingWithdrawals = transactions.filter((t) => t.kind === 'Withdrawal' && t.status === 'Pending')
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DepositValues>({ resolver: zodResolver(depositSchema) })

  const onSubmit = async (values: DepositValues) => {
    try {
      await withdraw({ accountId: values.account, amount: values.amount, method: 'Bank Transfer' })
      toast.success('Withdrawal requested', 'Your request is pending review.')
      reset()
    } catch (err) {
      toast.error('Withdrawal failed', (err as Error).message)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,28rem)_1fr]">
      <div className="glass-panel p-6">
      <h2 className="font-display text-lg font-semibold text-white">Withdraw Funds</h2>
      <p className="mt-1 text-sm text-gray-400">
        Withdrawals are reviewed by our finance team before payout. Funds are held while your request is pending.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4" noValidate>
        <Select
          label="From account"
          placeholder="Select account"
          options={liveAccounts.map((a) => ({
            value: a.id,
            label: `${a.number} — ${formatCurrency(a.balance)}`,
          }))}
          error={errors.account?.message}
          {...register('account')}
        />
        <Input
          label="Amount (USD)"
          type="number"
          placeholder="500"
          error={errors.amount?.message}
          {...register('amount')}
        />
        <Select
          label="Withdrawal method"
          options={[
            { value: 'bank', label: 'Bank Transfer' },
            { value: 'card', label: 'Credit / Debit Card' },
            { value: 'crypto', label: 'Crypto (USDT)' },
          ]}
        />
        <Button type="submit" fullWidth loading={isSubmitting}>
          Request Withdrawal
        </Button>
      </form>
      </div>

      {/* Pending-withdrawal tracker + status legend */}
      <div className="space-y-4">
        <div className="glass-panel p-5">
          <h3 className="font-display text-base font-semibold text-white">Your withdrawal requests</h3>
          {pendingWithdrawals.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">No withdrawals awaiting approval.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {pendingWithdrawals.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-ink-800/50 px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-white">{formatCurrency(t.amount)}</p>
                    <p className="text-xs text-gray-500">{formatDateTime(t.date)} · {t.method}</p>
                  </div>
                  <Badge tone="warning" dot>
                    {fundingStatusLabel(t.kind, t.status)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-ink-800/40 p-4 text-sm text-gray-400">
          <p className="font-medium text-gray-300">What the statuses mean</p>
          <ul className="mt-2 space-y-1.5">
            <li><span className="text-warning">Pending approval</span> — submitted; finance is reviewing it.</li>
            <li><span className="text-success">Paid</span> — approved and sent to your method.</li>
            <li><span className="text-danger">Rejected</span> — declined; the held funds are returned to your balance.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

function TransferTab() {
  const { accounts, transfer } = usePortalData()
  const toast = useToast()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TransferValues>({ resolver: zodResolver(transferSchema) })

  const onSubmit = async (values: TransferValues) => {
    try {
      await transfer({ fromAccountId: values.from, toAccountId: values.to, amount: values.amount })
      toast.success('Transfer complete', `${formatCurrency(values.amount)} moved between accounts.`)
      reset()
    } catch (err) {
      toast.error('Transfer failed', (err as Error).message)
    }
  }

  const opts = accounts.map((a) => ({ value: a.id, label: `${a.number} — ${a.type} (${a.mode})` }))

  return (
    <div className="glass-panel max-w-lg p-6">
      <h2 className="font-display text-lg font-semibold text-white">Internal Transfer</h2>
      <p className="mt-1 text-sm text-gray-400">Move funds instantly between your accounts.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4" noValidate>
        <Select label="From account" placeholder="Select account" options={opts} error={errors.from?.message} {...register('from')} />
        <Select label="To account" placeholder="Select account" options={opts} error={errors.to?.message} {...register('to')} />
        <Input label="Amount (USD)" type="number" placeholder="250" error={errors.amount?.message} {...register('amount')} />
        <Button type="submit" fullWidth loading={isSubmitting}>
          Transfer Funds
        </Button>
      </form>
    </div>
  )
}

function HistoryTab() {
  const { transactions } = usePortalData()

  if (transactions.length === 0) {
    return <EmptyState icon={History} title="No transactions yet" description="Your deposits, withdrawals, and transfers will appear here." />
  }

  return (
    <div className="glass-panel overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px]">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="px-5 py-3 font-medium">Reference</th>
              <th className="px-5 py-3 font-medium">Type</th>
              <th className="px-5 py-3 font-medium">Method</th>
              <th className="px-5 py-3 text-right font-medium">Amount</th>
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-5 py-3 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04] text-sm">
            {transactions.map((t) => (
              <tr key={t.id} className="transition-colors hover:bg-white/[0.02]">
                <td className="px-5 py-3.5 font-medium text-white">{t.id}</td>
                <td className="px-5 py-3.5 text-gray-300">{t.kind}</td>
                <td className="px-5 py-3.5 text-gray-400">{t.method}</td>
                <td className="px-5 py-3.5 text-right font-medium text-white">{formatCurrency(t.amount)}</td>
                <td className="px-5 py-3.5 text-gray-400">{formatDateTime(t.date)}</td>
                <td className="px-5 py-3.5 text-right">
                  <Badge tone={statusTone(t.status)} dot>
                    {fundingStatusLabel(t.kind, t.status)}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
