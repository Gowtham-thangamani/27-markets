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
import { seedNotifications, seedTickets } from '@/mock/data'

interface MoneyInput {
  accountId: string
  amount: string | number
  method: string
}
interface TransferInput {
  fromAccountId: string
  toAccountId: string
  amount: string | number
}

interface PortalDataValue {
  accounts: TradingAccount[]
  transactions: Transaction[]
  kyc: KycStep[]
  tickets: SupportTicket[]
  notifications: NotificationItem[]
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

  // No backend module for these yet — kept client-side and clearly local.
  const [tickets, setTickets] = useLocalStorage<SupportTicket[]>('apex.tickets', seedTickets)
  const [notifications, setNotifications] = useLocalStorage<NotificationItem[]>(
    'apex.notifications',
    seedNotifications,
  )

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return
    setLoading(true)
    setError(null)
    try {
      const [accs, txs, kycStatus] = await Promise.all([
        api.get<ApiAccount[]>('/accounts'),
        api.get<ApiTransaction[]>('/funds/history'),
        api.get<ApiKycStatus>('/kyc'),
      ])
      setAccounts(accs.map(mapAccount))
      setTransactions(txs.map(mapTransaction))
      setKyc(mapKyc(kycStatus))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load portal data')
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
    }
  }, [isAuthenticated, refresh])

  const totals = useMemo(() => {
    const live = accounts.filter((a) => a.mode === 'Live')
    const balance = live.reduce((s, a) => s + a.balance, 0)
    const equity = live.reduce((s, a) => s + a.equity, 0)
    const freeMargin = live.reduce((s, a) => s + a.freeMargin, 0)
    const used = equity - freeMargin
    const marginLevel = used > 0 ? (equity / used) * 100 : 0
    return { balance, equity, freeMargin, marginLevel }
  }, [accounts])

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
    async ({ accountId, amount, method }: MoneyInput) => {
      await api.post('/funds/deposit', { accountId, amount: String(amount), method })
      await refresh()
    },
    [refresh],
  )

  const withdraw = useCallback(
    async ({ accountId, amount, method }: MoneyInput) => {
      await api.post('/funds/withdraw', { accountId, amount: String(amount), method })
      await refresh()
    },
    [refresh],
  )

  const transfer = useCallback(
    async ({ fromAccountId, toAccountId, amount }: TransferInput) => {
      await api.post('/funds/transfer', { fromAccountId, toAccountId, amount: String(amount) })
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

  const markAllNotificationsRead = useCallback(
    () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true }))),
    [setNotifications],
  )

  return (
    <PortalDataContext.Provider
      value={{
        accounts,
        transactions,
        kyc,
        tickets,
        notifications,
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
