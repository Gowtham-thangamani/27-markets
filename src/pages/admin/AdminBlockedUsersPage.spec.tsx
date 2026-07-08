import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

// vi.mock is hoisted — keep data inside the factory.
vi.mock('@/lib/adminApi', () => ({
  adminApi: {
    listClients: vi.fn().mockResolvedValue([
      {
        id: 'u1', email: 'ada@x.com', firstName: 'Ada', lastName: 'Lovelace', country: 'GB',
        status: 'SUSPENDED', createdAt: '2026-06-23T10:00:00.000Z', kycProfile: null,
        _count: { tradingAccounts: 2 },
      },
    ]),
    setClientStatus: vi.fn(),
  },
}))
vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}))

import AdminBlockedUsersPage from './AdminBlockedUsersPage'
import { adminApi } from '@/lib/adminApi'

describe('AdminBlockedUsersPage', () => {
  it('lists blocked users with an Unblock action', async () => {
    render(<AdminBlockedUsersPage />)
    await waitFor(() => expect(screen.getByText(/Ada Lovelace/)).toBeInTheDocument())

    expect(screen.getAllByText('Blocked').length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /Unblock/ }).length).toBeGreaterThan(0)
  })

  it('defaults to the Blocked (SUSPENDED) filter on first load', async () => {
    render(<AdminBlockedUsersPage />)
    await waitFor(() => expect(adminApi.listClients).toHaveBeenCalledWith(undefined, 'SUSPENDED'))
  })
})
