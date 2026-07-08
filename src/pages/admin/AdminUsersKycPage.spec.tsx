import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

vi.mock('@/lib/adminApi', () => ({
  adminApi: {
    listClients: vi.fn().mockResolvedValue([
      { id: 'c1', email: 'ada@x.com', firstName: 'Ada', lastName: 'Lovelace', country: 'GB', status: 'ACTIVE', createdAt: '2026-06-01T00:00:00.000Z', kycProfile: { identityStatus: 'APPROVED', addressStatus: 'APPROVED', selfieStatus: 'APPROVED' }, _count: { tradingAccounts: 1 } },
      { id: 'c2', email: 'alan@x.com', firstName: 'Alan', lastName: 'Turing', country: 'GB', status: 'ACTIVE', createdAt: '2026-06-02T00:00:00.000Z', kycProfile: { identityStatus: 'PENDING', addressStatus: 'NOT_SUBMITTED', selfieStatus: 'NOT_SUBMITTED' }, _count: { tradingAccounts: 0 } },
    ]),
  },
}))

import AdminUsersKycPage from './AdminUsersKycPage'

describe('AdminUsersKycPage', () => {
  it('shows per-client KYC step statuses and a derived overall', async () => {
    render(<AdminUsersKycPage />)
    await waitFor(() => expect(screen.getByText(/Ada Lovelace/)).toBeInTheDocument())
    expect(screen.getByText(/Alan Turing/)).toBeInTheDocument()
    expect(screen.getAllByText('Approved').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Pending').length).toBeGreaterThan(0)
  })
})
