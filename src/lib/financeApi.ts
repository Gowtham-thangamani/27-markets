import { api } from './api'

export interface FinanceTxn {
  id: string
  reference: string
  status: string
  amount: string
  memo: string | null
  createdAt: string
  accountNumber: string | null
  client: { id: string; name: string; email: string } | null
}

export interface AdminAccount {
  id: string
  number: string
  type: string
  mode: string
  currency: string
  leverage: string
  status: string
  createdAt: string
  balance: string
  owner: { id: string; name: string; email: string }
}

/** Typed CRM finance + accounts admin API (reuses the shared `api` client). */
export const financeApi = {
  pendingWithdrawals: () => api.get<FinanceTxn[]>('/admin/finance/withdrawals'),
  deposits: () => api.get<FinanceTxn[]>('/admin/finance/deposits'),
  approveWithdrawal: (id: string) =>
    api.post<{ ok: boolean; status: string }>(`/admin/finance/withdrawals/${id}/approve`),
  rejectWithdrawal: (id: string, reason?: string) =>
    api.post<{ ok: boolean; status: string }>(`/admin/finance/withdrawals/${id}/reject`, { reason }),
  adjust: (body: { tradingAccountId: string; amount: string; direction: 'CREDIT' | 'DEBIT'; memo: string }) =>
    api.post<{ reference: string; amount: string; direction: string }>('/admin/finance/adjustments', body),

  listAccounts: () => api.get<AdminAccount[]>('/admin/accounts'),
  setAccountStatus: (id: string, status: string) =>
    api.patch<{ id: string; status: string }>(`/admin/accounts/${id}/status`, { status }),
  setAccountLeverage: (id: string, leverage: string) =>
    api.patch<{ id: string; leverage: string }>(`/admin/accounts/${id}/leverage`, { leverage }),
}
