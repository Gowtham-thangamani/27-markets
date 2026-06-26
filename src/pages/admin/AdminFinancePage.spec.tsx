import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

// vi.mock is hoisted — keep data inside the factory.
vi.mock('@/lib/financeApi', () => ({
  financeApi: {
    pendingWithdrawals: vi.fn().mockResolvedValue([
      {
        id: 'w1', reference: 'TX-1', status: 'PENDING', amount: '250.00', memo: null,
        createdAt: '2026-06-23T10:00:00.000Z', accountNumber: '10012345',
        client: { id: 'c1', name: 'Ada Lovelace', email: 'ada@x.com' },
      },
    ]),
    deposits: vi.fn().mockResolvedValue([]),
    depositRequests: vi.fn().mockResolvedValue([]),
    approveWithdrawal: vi.fn(),
    rejectWithdrawal: vi.fn(),
    approveDepositRequest: vi.fn(),
    rejectDepositRequest: vi.fn(),
  },
}))
vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}))

import AdminFinancePage from './AdminFinancePage'

describe('AdminFinancePage', () => {
  it('renders the pending withdrawal queue with approve/reject actions', async () => {
    render(<AdminFinancePage />)
    await waitFor(() => expect(screen.getByText(/Ada Lovelace/)).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /Approve/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Reject/ })).toBeInTheDocument()
  })
})
