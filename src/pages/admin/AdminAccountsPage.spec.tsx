import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

// vi.mock is hoisted — keep data inside the factory.
vi.mock('@/lib/financeApi', () => ({
  financeApi: {
    listAccounts: vi.fn().mockResolvedValue([
      {
        id: 'a1', number: '10012345', type: 'STANDARD', mode: 'LIVE', currency: 'USD',
        leverage: '1:100', status: 'ACTIVE', createdAt: '2026-06-23T10:00:00.000Z', balance: '1000.00',
        owner: { id: 'c1', name: 'Ada Lovelace', email: 'ada@x.com' },
      },
    ]),
    setAccountStatus: vi.fn(),
    setAccountLeverage: vi.fn(),
  },
}))
vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}))

import AdminAccountsPage from './AdminAccountsPage'

describe('AdminAccountsPage', () => {
  it('renders accounts with a status toggle and leverage selector', async () => {
    render(<AdminAccountsPage />)
    await waitFor(() => expect(screen.getByText('10012345')).toBeInTheDocument())
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    // ACTIVE account shows a "Suspend" action.
    expect(screen.getByRole('button', { name: 'Suspend' })).toBeInTheDocument()
    expect(screen.getByLabelText('Leverage for 10012345')).toBeInTheDocument()
  })
})
