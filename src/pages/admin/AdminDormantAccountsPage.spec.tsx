import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

// vi.mock is hoisted — keep data inside the factory.
vi.mock('@/lib/financeApi', () => ({
  financeApi: {
    listDormantAccounts: vi.fn().mockResolvedValue([
      {
        id: 'a1', number: '10012345', type: 'STANDARD', mode: 'LIVE', status: 'ACTIVE', currency: 'USD',
        createdAt: '2025-01-01T00:00:00.000Z', lastActivityAt: '2025-02-01T00:00:00.000Z',
        daysInactive: 200, balance: '500.00',
        owner: { id: 'c1', name: 'Ada Lovelace', email: 'ada@x.com' },
      },
    ]),
  },
}))

import AdminDormantAccountsPage from './AdminDormantAccountsPage'

describe('AdminDormantAccountsPage', () => {
  it('lists dormant accounts with days-inactive and a count', async () => {
    render(<AdminDormantAccountsPage />)
    await waitFor(() => expect(screen.getByText(/Ada Lovelace/)).toBeInTheDocument())

    expect(screen.getByText('200d')).toBeInTheDocument()
    expect(screen.getByText(/Dormant accounts:/)).toBeInTheDocument()
  })
})
