import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, ApiError } from '@/lib/api'
import {
  mapAccount,
  mapKyc,
  mapTransaction,
  accountTypeToApi,
  accountModeToApi,
  type ApiAccount,
  type ApiKycStatus,
  type ApiTransaction,
} from '@/lib/apiMappers'
import { useAuth } from './AuthContext'
import { track } from '@/lib/analytics'
import { useLocalStorage } from '@/lib/hooks'
import type {
  AccountMode,
  AccountType,
  KycStep,
  NotificationItem,
  SupportTicket,
  TradingAccount,
  Transaction,
} from '@/lib/types'
import { seedTickets } from '@/mock/data'

interface MoneyInput {
  accountId: string
  amount: string | number
  method: string
  /** Stable key so a double-submit / retry can't be processed twice. */
  idempotencyKey?: string
}
interface TransferInput {
  fromAccountId: string
  toAccountId: string
  amount: string | number
  /** Stable key so a double-submit / retry can't be processed twice. */
  idempotencyKey?: string
}

interface PortalDataValue {
  accounts: TradingAccount[]
  transactions: Transaction[]
  kyc: KycStep[]
  tickets: SupportTicket[]
  notifications: NotificationItem[]
  /** The account currently shown on the dashboard — switch it with `selectAccount`. */
  selectedAccountId: string | null
  selectedAccount: TradingAccount | null
  selectAccount: (id: string) => void
  totals: { balance: number; equity: number; freeMargin: number; marginLevel: number }
  kycProgress: number
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  openAccount: (type: AccountType, mode?: AccountMode) => Promise<void>
  deposit: (input: MoneyInput) => Promise<void>
  withdraw: (input: MoneyInput) => Promise<void>
  transfer: (input: TransferInput) => Promise<void>
  submitKyc: (id: KycStep['id'], file: File) => Promise<void>
  addTicket: (ticket: Omit<SupportTicket, 'id' | 'createdAt' | 'status'>) => void
  markAllNotificationsRead: () => void
}

const PortalDataContext = createContext<PortalDataValue | null>(null)

export function PortalDataProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()

  const [accounts, setAccounts] = useState<TradingAccount[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [kyc, setKyc] = useState<KycStep[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Support tickets have no backend module yet — kept client-side and clearly local.
  const [tickets, setTickets] = useLocalStorage<SupportTicket[]>('apex.tickets', seedTickets)
  // Notifications are backend-persisted (deposit/withdrawal events, etc.).
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  // Which account the dashboard shows — persisted so a refresh keeps the choice.
  const [selectedAccountId, setSelectedAccountId] = useLocalStorage<string | null>('apex.selectedAccountId', null)

  /**
   * Each endpoint is settled independently. With Promise.all, one rejection
   * skipped every setState after it: a failing /funds/history left `accounts`
   * at [], so the Accounts page told a client "No accounts yet" while the
   * server was refusing to open a sixth demo account because they already had
   * five. Whatever loads is shown; `error` says the rest didn't.
   */
  const refresh = useCallback(async () => {
    if (!isAuthenticated) return
    setLoading(true)
    setError(null)
    try {
      const [accs, txs, kycStatus, notifs] = await Promise.allSettled([
        api.get<ApiAccount[]>('/accounts'),
        api.get<ApiTransaction[]>('/funds/history'),
        api.get<ApiKycStatus>('/kyc'),
        api.get<NotificationItem[]>('/notifications'),
      ])
      if (accs.status === 'fulfilled') setAccounts(accs.value.map(mapAccount))
      if (txs.status === 'fulfilled') setTransactions(txs.value.map(mapTransaction))
      if (kycStatus.status === 'fulfilled') setKyc(mapKyc(kycStatus.value))
      if (notifs.status === 'fulfilled') setNotifications(notifs.value)

      // Notifications are cosmetic — their absence is not worth alarming anyone.
      const failed = [accs, txs, kycStatus].filter((r) => r.status === 'rejected')
      const first = failed[0] as PromiseRejectedResult | undefined
      setError(
        first
          ? first.reason instanceof ApiError
            ? first.reason.message
            : 'Failed to load portal data'
          : null,
      )
    } catch {
      // allSettled cannot reject, so this is a mapper bug rather than the
      // network. Still surface it instead of leaving a silent empty portal.
      setError('Failed to load portal data')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (isAuthenticated) {
      void refresh()
    } else {
      setAccounts([])
      setTransactions([])
      setKyc([])
      setNotifications([])
    }
  }, [isAuthenticated, refresh])

  // Keep the selection valid: fall back to a Live account (else the first
  // account) whenever there's no selection yet, or the stored one no longer exists.
  useEffect(() => {
    if (accounts.length === 0) return
    if (selectedAccountId && accounts.some((a) => a.id === selectedAccountId)) return
    const fallback = accounts.find((a) => a.mode === 'Live') ?? accounts[0]
    setSelectedAccountId(fallback.id)
  }, [accounts, selectedAccountId, setSelectedAccountId])

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === selectedAccountId) ?? null,
    [accounts, selectedAccountId],
  )

  const selectAccount = useCallback(
    (id: string) => setSelectedAccountId(id),
    [setSelectedAccountId],
  )

  // The dashboard reflects whichever account is selected, not an aggregate —
  // switching accounts changes what's shown.
  const totals = useMemo(() => {
    if (!selectedAccount) return { balance: 0, equity: 0, freeMargin: 0, marginLevel: 0 }
    const { balance, equity, freeMargin, marginLevel } = selectedAccount
    return { balance, equity, freeMargin, marginLevel }
  }, [selectedAccount])

  const kycProgress = useMemo(() => {
    if (kyc.length === 0) return 0
    const approved = kyc.filter((k) => k.status === 'Approved').length
    return Math.round((approved / kyc.length) * 100)
  }, [kyc])

  const openAccount = useCallback(
    async (type: AccountType, mode: AccountMode = 'Live') => {
      await api.post('/accounts', { type: accountTypeToApi[type], mode: accountModeToApi[mode] })
      await refresh()
    },
    [refresh],
  )

  const deposit = useCallback(
    async ({ accountId, amount, method, idempotencyKey }: MoneyInput) => {
      // With a hosted PSP (Stripe) the backend returns a checkout URL to redirect to;
      // in simulation it credits inline and returns no URL.
      const res = await api.post<{ checkoutUrl?: string }>('/funds/deposit/checkout', {
        accountId,
        amount: String(amount),
        method,
        ...(idempotencyKey ? { idempotencyKey } : {}),
      })
      if (res?.checkoutUrl) {
        window.location.href = res.checkoutUrl
        return
      }
      // Inline-credited (simulation): the deposit is complete now. In live mode
      // the conversion fires on the post-checkout return (see FundsPage).
      track('deposit', { value: Number(amount) || undefined, currency: 'USD', method })
      await refresh()
    },
    [refresh],
  )

  const withdraw = useCallback(
    async ({ accountId, amount, method, idempotencyKey }: MoneyInput) => {
      await api.post('/funds/withdraw', {
        accountId,
        amount: String(amount),
        method,
        ...(idempotencyKey ? { idempotencyKey } : {}),
      })
      await refresh()
    },
    [refresh],
  )

  const transfer = useCallback(
    async ({ fromAccountId, toAccountId, amount, idempotencyKey }: TransferInput) => {
      await api.post('/funds/transfer', {
        fromAccountId,
        toAccountId,
        amount: String(amount),
        ...(idempotencyKey ? { idempotencyKey } : {}),
      })
      await refresh()
    },
    [refresh],
  )

  const submitKyc = useCallback(
    async (id: KycStep['id'], file: File) => {
      const form = new FormData()
      form.append('file', file)
      await api.upload(`/kyc/upload/${id}`, form)
      await refresh()
    },
    [refresh],
  )

  const addTicket = useCallback(
    (ticket: Omit<SupportTicket, 'id' | 'createdAt' | 'status'>) => {
      setTickets((prev) => [
        {
          ...ticket,
          id: `TK-${2050 + prev.length}`,
          status: 'Open',
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ])
    },
    [setTickets],
  )

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    void api.post('/notifications/read-all').catch(() => undefined)
  }, [])

  return (
    <PortalDataContext.Provider
      value={{
        accounts,
        transactions,
        kyc,
        tickets,
        notifications,
        selectedAccountId,
        selectedAccount,
        selectAccount,
        totals,
        kycProgress,
        loading,
        error,
        refresh,
        openAccount,
        deposit,
        withdraw,
        transfer,
        submitKyc,
        addTicket,
        markAllNotificationsRead,
      }}
    >
      {children}
    </PortalDataContext.Provider>
  )
}

export function usePortalData() {
  const ctx = useContext(PortalDataContext)
  if (!ctx) throw new Error('usePortalData must be used within PortalDataProvider')
  return ctx
}
