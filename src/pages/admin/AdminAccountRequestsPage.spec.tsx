import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

// vi.mock is hoisted — keep data inside the factory.
vi.mock('@/lib/financeApi', () => ({
  financeApi: {
    listAccountRequests: vi.fn().mockResolvedValue([
      {
        id: 'a1', number: '21005678', type: 'STANDARD', mode: 'LIVE', currency: 'USD',
        leverage: '1:10', status: 'PENDING', createdAt: '2026-07-01T10:00:00.000Z',
        owner: { id: 'c1', name: 'Ada Lovelace', email: 'ada@x.com' },
      },
    ]),
    setAccountStatus: vi.fn(),
  },
}))
vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}))

import AdminAccountRequestsPage from './AdminAccountRequestsPage'

describe('AdminAccountRequestsPage', () => {
  it('lists pending accounts with approve/reject actions', async () => {
    render(<AdminAccountRequestsPage />)
    await waitFor(() => expect(screen.getByText(/Ada Lovelace/)).toBeInTheDocument())

    expect(screen.getByText('21005678')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Approve/ }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /Reject/ }).length).toBeGreaterThan(0)
  })
})
