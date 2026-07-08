import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

// vi.mock is hoisted — keep data inside the factory.
vi.mock('@/lib/financeApi', () => ({
  financeApi: {
    allDepositRequests: vi.fn().mockResolvedValue([
      {
        id: 'd1', reference: 'DR-1', method: 'bank', asset: null, amount: '200.00',
        status: 'PENDING', createdAt: '2026-06-23T10:00:00.000Z',
        client: { id: 'c1', name: 'Ada Lovelace', email: 'ada@x.com' },
      },
      {
        id: 'd2', reference: 'DR-2', method: 'crypto', asset: 'USDT', amount: '99.00',
        status: 'APPROVED', createdAt: '2026-06-22T10:00:00.000Z',
        client: { id: 'c2', name: 'Alan Turing', email: 'alan@x.com' },
      },
    ]),
    approveDepositRequest: vi.fn(),
    rejectDepositRequest: vi.fn(),
  },
}))
vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}))

import AdminDepositRequestsPage from './AdminDepositRequestsPage'
import { financeApi } from '@/lib/financeApi'

describe('AdminDepositRequestsPage', () => {
  it('lists deposit requests with status badges and pending-row actions', async () => {
    render(<AdminDepositRequestsPage />)
    await waitFor(() => expect(screen.getByText(/Ada Lovelace/)).toBeInTheDocument())

    expect(screen.getByText(/Alan Turing/)).toBeInTheDocument()
    expect(screen.getAllByText('Approved').length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /Confirm/ }).length).toBeGreaterThan(0)
  })

  it('defaults to the Pending filter on first load', async () => {
    render(<AdminDepositRequestsPage />)
    await waitFor(() => expect(financeApi.allDepositRequests).toHaveBeenCalledWith('PENDING'))
  })
})
