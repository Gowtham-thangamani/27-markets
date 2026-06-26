import { useCallback, useEffect, useState } from 'react'
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
import { api } from '@/lib/api'
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

interface DepositMethod {
  id: string
  label: string
  type: 'card' | 'bank' | 'crypto' | 'ewallet'
  status: 'live' | 'manual' | 'unavailable'
  note?: string
  instructions?: string | null
  assets?: { symbol: string; address: string }[]
}
interface DepositRequestRow {
  id: string
  reference: string
  method: string
  asset: string | null
  amount: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
}
const METHOD_ICON: Record<string, LucideIcon> = { bank: Landmark, card: CreditCard, ewallet: Wallet, crypto: Bitcoin }
const methodStatusBadge = (s: DepositMethod['status']) =>
  s === 'live' ? { tone: 'success' as const, label: 'Live' } : s === 'manual' ? { tone: 'warning' as const, label: 'Manual review' } : { tone: 'neutral' as const, label: 'Unavailable' }
const reqStatusTone = (s: DepositRequestRow['status']) => (s === 'APPROVED' ? 'success' : s === 'REJECTED' ? 'danger' : 'warning')

function DepositTab() {
  const { accounts, deposit } = usePortalData()
  const toast = useToast()
  const liveAccounts = accounts.filter((a) => a.mode === 'Live')

  const [methods, setMethods] = useState<DepositMethod[]>([])
  const [requests, setRequests] = useState<DepositRequestRow[]>([])
  const [active, setActive] = useState<DepositMethod | null>(null)
  const [accountId, setAccountId] = useState('')
  const [amount, setAmount] = useState('')
  const [asset, setAsset] = useState('')
  const [instructions, setInstructions] = useState<string | null>(null)
  const [qr, setQr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const [m, r] = await Promise.all([
        api.get<DepositMethod[]>('/funds/deposit/methods'),
        api.get<DepositRequestRow[]>('/funds/deposit/requests'),
      ])
      setMethods(m)
      setRequests(r)
    } catch {
      /* best-effort */
    }
  }, [])
  useEffect(() => {
    void load()
  }, [load])

  const open = (m: DepositMethod) => {
    if (m.status === 'unavailable') return
    setActive(m)
    setAccountId(liveAccounts[0]?.id ?? '')
    setAmount('')
    setAsset(m.assets?.[0]?.symbol ?? '')
    setInstructions(null) // shown only after a request is submitted
    setQr(null)
  }

  const submit = async () => {
    if (!accountId || !(Number(amount) > 0)) {
      toast.warning('Check the form', 'Pick an account and a positive amount.')
      return
    }
    setBusy(true)
    try {
      if (active!.type === 'card') {
        await deposit({ accountId, amount, method: 'Card' }) // redirects to Stripe, or credits inline in simulation
        toast.success('Deposit submitted', 'Card deposit processing.')
        setActive(null)
        return
      }
      const res = await api.post<{ instructions?: string; qr?: string | null }>('/funds/deposit/request', {
        accountId,
        method: active!.type,
        asset: active!.type === 'crypto' ? asset : undefined,
        amount,
      })
      setInstructions(res?.instructions ?? null)
      setQr(res?.qr ?? null)
      toast.success('Deposit requested', 'Send the funds using the instructions; finance will confirm receipt.')
      await load()
    } catch (e) {
      toast.error('Deposit failed', (e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="glass-panel p-5">
        <h2 className="font-display text-lg font-semibold text-white">Deposit Methods</h2>
        <div className="mt-4 space-y-3">
          {(methods.length ? methods : []).map((m) => {
            const Icon = METHOD_ICON[m.id] ?? Landmark
            const badge = methodStatusBadge(m.status)
            return (
              <div key={m.id} className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-ink-800/50 p-4 transition-colors hover:border-brand-500/30">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/20">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-medium text-white">{m.label}</p>
                    <p className="text-xs text-gray-500">{m.note}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={badge.tone}>{badge.label}</Badge>
                  <Button size="sm" disabled={m.status === 'unavailable'} onClick={() => open(m)}>
                    Deposit
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {requests.length > 0 && (
        <div className="glass-panel mt-4 p-5">
          <h3 className="font-display text-base font-semibold text-white">Your deposit requests</h3>
          <div className="mt-3 space-y-2">
            {requests.slice(0, 6).map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-ink-800/40 px-4 py-2.5 text-sm">
                <div>
                  <span className="text-white">{formatCurrency(Number(r.amount))}</span>
                  <span className="ml-2 text-xs text-gray-500">{r.method}{r.asset ? ` · ${r.asset}` : ''} · {formatDateTime(r.createdAt)}</span>
                </div>
                <Badge tone={reqStatusTone(r.status)}>{r.status === 'PENDING' ? 'Awaiting confirmation' : r.status === 'APPROVED' ? 'Credited' : 'Rejected'}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      <SavedCards />

      <Modal
        open={!!active}
        onClose={() => setActive(null)}
        title={`Deposit via ${active?.label ?? ''}`}
        description={active?.type === 'card' ? 'You will be redirected to a secure checkout.' : 'Submit a request, then send the funds — finance confirms receipt before crediting.'}
      >
        <div className="space-y-4">
          <Select
            label="Deposit to account"
            placeholder="Select account"
            value={accountId}
            options={liveAccounts.map((a) => ({ value: a.id, label: `${a.number} — ${a.type}` }))}
            onChange={(e) => setAccountId(e.target.value)}
          />
          {active?.type === 'crypto' && (
            <Select
              label="Asset"
              value={asset}
              options={(active.assets ?? []).map((a) => ({ value: a.symbol, label: a.symbol }))}
              onChange={(e) => setAsset(e.target.value)}
            />
          )}
          <Input label="Amount (USD)" type="number" placeholder="1000" value={amount} onChange={(e) => setAmount(e.target.value)} />

          {instructions && (
            <div className="rounded-lg border border-warning/30 bg-warning/10 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-warning">Payment instructions</p>
              {qr && (
                <div className="mt-2 flex flex-col items-center gap-1">
                  <img src={qr} alt="Deposit address QR" className="h-40 w-40 rounded-lg bg-white p-2" />
                  <span className="text-[11px] text-gray-400">Scan with your wallet app</span>
                </div>
              )}
              <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-sm text-gray-200">{instructions}</pre>
              <p className="mt-2 text-xs text-gray-400">Your account is credited once finance confirms the funds arrived.</p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" fullWidth onClick={() => setActive(null)}>
              {instructions ? 'Done' : 'Cancel'}
            </Button>
            {!instructions && (
              <Button type="button" fullWidth loading={busy} onClick={submit}>
                {active?.type === 'card' ? 'Continue to payment' : 'Submit request'}
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </>
  )
}

interface SavedCardRow {
  id: string
  brand: string
  last4: string
  expMonth: number
  expYear: number
  isDefault: boolean
}

function SavedCards() {
  const { accounts } = usePortalData()
  const toast = useToast()
  const live = accounts.filter((a) => a.mode === 'Live')
  const [cards, setCards] = useState<SavedCardRow[]>([])
  const [adding, setAdding] = useState(false)
  const [depCard, setDepCard] = useState<SavedCardRow | null>(null)
  const [busy, setBusy] = useState(false)
  const [brand, setBrand] = useState('visa')
  const [last4, setLast4] = useState('')
  const [exp, setExp] = useState('')
  const [accountId, setAccountId] = useState('')
  const [amount, setAmount] = useState('')

  const load = useCallback(async () => {
    try {
      setCards(await api.get<SavedCardRow[]>('/funds/cards'))
    } catch {
      /* best-effort */
    }
  }, [])
  useEffect(() => {
    void load()
  }, [load])

  const addCard = async () => {
    const m = exp.match(/^(\d{1,2})\/(\d{2})$/)
    if (!/^\d{4}$/.test(last4) || !m) {
      toast.warning('Check the card', 'Enter the last 4 digits and expiry as MM/YY.')
      return
    }
    setBusy(true)
    try {
      await api.post('/funds/cards', { brand, last4, expMonth: Number(m[1]), expYear: 2000 + Number(m[2]) })
      toast.success('Card saved', `${brand.toUpperCase()} ••${last4}`)
      setAdding(false)
      setLast4('')
      setExp('')
      await load()
    } catch (e) {
      toast.error('Could not save card', (e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const removeCard = async (id: string) => {
    try {
      await api.del(`/funds/cards/${id}`)
      await load()
    } catch (e) {
      toast.error('Could not remove', (e as Error).message)
    }
  }

  const openDeposit = (c: SavedCardRow) => {
    setDepCard(c)
    setAccountId(live[0]?.id ?? '')
    setAmount('')
  }
  const doDeposit = async () => {
    if (!accountId || !(Number(amount) > 0)) {
      toast.warning('Check the form', 'Pick an account and a positive amount.')
      return
    }
    setBusy(true)
    try {
      await api.post(`/funds/cards/${depCard!.id}/deposit`, { accountId, amount })
      toast.success('Deposit submitted', `Card ••${depCard!.last4} · ${formatCurrency(Number(amount))}`)
      setDepCard(null)
      await load()
    } catch (e) {
      toast.error('Deposit failed', (e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="glass-panel mt-4 p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-semibold text-white">Saved Cards</h3>
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>+ Add card</Button>
      </div>
      {cards.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">No saved cards. Add one for one‑click deposits.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {cards.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-ink-800/50 px-4 py-3">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-brand-400" />
                <div>
                  <p className="font-medium capitalize text-white">
                    {c.brand} •••• {c.last4}
                    {c.isDefault && <span className="ml-2 text-[11px] uppercase text-gray-500">default</span>}
                  </p>
                  <p className="text-xs text-gray-500">Expires {String(c.expMonth).padStart(2, '0')}/{c.expYear}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => openDeposit(c)}>Deposit</Button>
                <Button size="sm" variant="outline" onClick={() => removeCard(c.id)}>Remove</Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="mt-3 text-[11px] text-gray-500">
        We never store your full card number — only the brand, last 4 digits, and expiry. Cards are tokenized by the payment processor.
      </p>

      <Modal open={adding} onClose={() => setAdding(false)} title="Add a card" description="Saved securely for one‑click deposits.">
        <div className="space-y-3">
          <Select
            label="Brand"
            value={brand}
            options={[{ value: 'visa', label: 'Visa' }, { value: 'mastercard', label: 'Mastercard' }, { value: 'amex', label: 'Amex' }, { value: 'discover', label: 'Discover' }]}
            onChange={(e) => setBrand(e.target.value)}
          />
          <Input label="Card number (last 4 digits)" placeholder="4242" value={last4} onChange={(e) => setLast4(e.target.value.replace(/\D/g, '').slice(0, 4))} />
          <Input label="Expiry (MM/YY)" placeholder="12/30" value={exp} onChange={(e) => setExp(e.target.value)} />
          <Button fullWidth loading={busy} onClick={addCard}>Save card</Button>
          <p className="text-center text-[11px] text-gray-500">Demo: enter only the last 4 digits. Live uses the processor's secure card field (Stripe).</p>
        </div>
      </Modal>

      <Modal open={!!depCard} onClose={() => setDepCard(null)} title={`Deposit · ${depCard?.brand ?? ''} ••${depCard?.last4 ?? ''}`} description="Charge your saved card.">
        <div className="space-y-3">
          <Select label="Deposit to account" value={accountId} options={live.map((a) => ({ value: a.id, label: `${a.number} — ${a.type}` }))} onChange={(e) => setAccountId(e.target.value)} />
          <Input label="Amount (USD)" type="number" placeholder="500" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Button fullWidth loading={busy} onClick={doDeposit}>Deposit</Button>
        </div>
      </Modal>
    </div>
  )
}

function WithdrawTab() {
  const { accounts, transactions, refresh } = usePortalData()
  const toast = useToast()
  const liveAccounts = accounts.filter((a) => a.mode === 'Live')
  const pendingWithdrawals = transactions.filter((t) => t.kind === 'Withdrawal' && t.status === 'Pending')

  const [accountId, setAccountId] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<'bank' | 'crypto'>('bank')
  const [accountName, setAccountName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [bankName, setBankName] = useState('')
  const [swift, setSwift] = useState('')
  const [walletAddress, setWalletAddress] = useState('')
  const [network, setNetwork] = useState('USDT-TRC20')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!accountId && liveAccounts[0]) setAccountId(liveAccounts[0].id)
  }, [liveAccounts, accountId])

  const submit = async () => {
    if (!accountId || !(Number(amount) > 0)) {
      toast.warning('Check the form', 'Pick an account and a positive amount.')
      return
    }
    if (method === 'bank' && (!accountName || !accountNumber)) {
      toast.warning('Bank details required', 'Enter the account holder name and IBAN / account number.')
      return
    }
    if (method === 'crypto' && !walletAddress) {
      toast.warning('Wallet required', 'Enter the wallet address to receive the payout.')
      return
    }
    setBusy(true)
    try {
      await api.post('/funds/withdraw', {
        accountId,
        amount,
        method: method === 'crypto' ? 'Crypto' : 'Bank Transfer',
        ...(method === 'bank' ? { accountName, accountNumber, bankName, swift } : { walletAddress, network }),
      })
      toast.success('Withdrawal requested', 'Your request is pending finance review.')
      setAmount('')
      setAccountName('')
      setAccountNumber('')
      setBankName('')
      setSwift('')
      setWalletAddress('')
      await refresh()
    } catch (e) {
      toast.error('Withdrawal failed', (e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,28rem)_1fr]">
      <div className="glass-panel p-6">
      <h2 className="font-display text-lg font-semibold text-white">Withdraw Funds</h2>
      <p className="mt-1 text-sm text-gray-400">
        Withdrawals are reviewed by our finance team before payout. Funds are held while your request is pending.
      </p>
      <div className="mt-5 space-y-4">
        <Select
          label="From account"
          placeholder="Select account"
          value={accountId}
          options={liveAccounts.map((a) => ({ value: a.id, label: `${a.number} — ${formatCurrency(a.balance)}` }))}
          onChange={(e) => setAccountId(e.target.value)}
        />
        <Input label="Amount (USD)" type="number" placeholder="500" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Select
          label="Withdraw to"
          value={method}
          options={[
            { value: 'bank', label: 'Bank Account' },
            { value: 'crypto', label: 'Crypto Wallet (USDT)' },
          ]}
          onChange={(e) => setMethod(e.target.value as 'bank' | 'crypto')}
        />
        {method === 'bank' ? (
          <>
            <Input label="Account holder name" placeholder="Jordan Avery" value={accountName} onChange={(e) => setAccountName(e.target.value)} />
            <Input label="IBAN / account number" placeholder="AE07 0331 ..." value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
            <Input label="Bank name" placeholder="Emirates NBD" value={bankName} onChange={(e) => setBankName(e.target.value)} />
            <Input label="SWIFT / BIC" placeholder="EBILAEAD" value={swift} onChange={(e) => setSwift(e.target.value)} />
          </>
        ) : (
          <>
            <Input label="Wallet address" placeholder="Txxxxxxxx / 0x..." value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)} />
            <Select
              label="Network"
              value={network}
              options={[
                { value: 'USDT-TRC20', label: 'USDT · TRC20' },
                { value: 'USDT-ERC20', label: 'USDT · ERC20' },
                { value: 'BTC', label: 'Bitcoin' },
                { value: 'ETH', label: 'Ethereum' },
              ]}
              onChange={(e) => setNetwork(e.target.value)}
            />
          </>
        )}
        <Button type="button" fullWidth loading={busy} onClick={submit}>
          Request Withdrawal
        </Button>
      </div>
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
