import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

// vi.mock is hoisted — keep data inside the factory.
vi.mock('@/lib/financeApi', () => ({
  financeApi: {
    listWallets: vi.fn().mockResolvedValue([
      {
        id: 'w1', code: 'CLIENT:a1', currency: 'USD', balance: '1000.00',
        accountNumber: '10012345', accountType: 'STANDARD', mode: 'LIVE', status: 'ACTIVE',
        owner: { id: 'c1', name: 'Ada Lovelace', email: 'ada@x.com' },
      },
      {
        id: 'w2', code: 'CLIENT:a2', currency: 'USD', balance: '250.50',
        accountNumber: '10099999', accountType: 'VIP', mode: 'LIVE', status: 'ACTIVE',
        owner: { id: 'c2', name: 'Alan Turing', email: 'alan@x.com' },
      },
    ]),
  },
}))

import AdminWalletsPage from './AdminWalletsPage'

describe('AdminWalletsPage', () => {
  it('lists wallets with balances and a total summary', async () => {
    render(<AdminWalletsPage />)
    await waitFor(() => expect(screen.getByText(/Ada Lovelace/)).toBeInTheDocument())

    expect(screen.getByText(/Alan Turing/)).toBeInTheDocument()
    // Total = 1000.00 + 250.50 = $1,250.50
    expect(screen.getByText(/\$1,250\.50/)).toBeInTheDocument()
  })
})
