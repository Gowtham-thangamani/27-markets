import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

// vi.mock is hoisted — keep data inside the factory.
vi.mock('@/lib/financeApi', () => ({
  financeApi: {
    allWithdrawals: vi.fn().mockResolvedValue([
      {
        id: 'w1', reference: 'TX-1', status: 'PENDING', amount: '250.00', memo: null,
        createdAt: '2026-06-23T10:00:00.000Z', accountNumber: '10012345',
        client: { id: 'c1', name: 'Ada Lovelace', email: 'ada@x.com' },
        destination: { method: 'bank', accountName: 'Ada L', accountNumber: 'GB1234', bankName: 'HSBC', swift: 'HBUKGB', walletAddress: null, network: null },
      },
      {
        id: 'w2', reference: 'TX-2', status: 'POSTED', amount: '99.00', memo: null,
        createdAt: '2026-06-22T10:00:00.000Z', accountNumber: '10099999',
        client: { id: 'c2', name: 'Alan Turing', email: 'alan@x.com' },
        destination: { method: 'crypto', accountName: null, accountNumber: null, bankName: null, swift: null, walletAddress: '0xabc', network: 'ETH' },
      },
    ]),
    approveWithdrawal: vi.fn(),
    rejectWithdrawal: vi.fn(),
  },
}))
vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}))

import AdminWithdrawalsPage from './AdminWithdrawalsPage'
import { financeApi } from '@/lib/financeApi'

describe('AdminWithdrawalsPage', () => {
  it('lists withdrawals with status badges and pending-row actions', async () => {
    render(<AdminWithdrawalsPage />)
    await waitFor(() => expect(screen.getByText(/Ada Lovelace/)).toBeInTheDocument())

    expect(screen.getByText(/Alan Turing/)).toBeInTheDocument()
    // "Paid" appears as both a filter tab and the POSTED row's status badge.
    expect(screen.getAllByText('Paid').length).toBeGreaterThan(1)
    // Only the PENDING row exposes approve/reject (DataTable renders responsive
    // row variants, so the buttons may appear more than once).
    expect(screen.getAllByRole('button', { name: /Approve/ }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /Reject/ }).length).toBeGreaterThan(0)
  })

  it('defaults to the Pending filter on first load', async () => {
    render(<AdminWithdrawalsPage />)
    await waitFor(() => expect(financeApi.allWithdrawals).toHaveBeenCalledWith('PENDING'))
  })
})
