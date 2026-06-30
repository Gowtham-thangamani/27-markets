import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

// NOTE: vi.mock is hoisted — keep all data inside the factory (no outer refs).
vi.mock('@/lib/adminApi', () => ({
  adminApi: {
    listClients: vi.fn().mockResolvedValue([
      {
        id: 'c1',
        email: 'ada@x.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
        country: 'GB',
        status: 'ACTIVE',
        createdAt: '2026-01-01T00:00:00.000Z',
        _count: { tradingAccounts: 2 },
        kycProfile: { identityStatus: 'APPROVED', addressStatus: 'APPROVED', selfieStatus: 'APPROVED' },
      },
    ]),
    getClient: vi.fn(),
    addClientNote: vi.fn(),
  },
}))
vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}))

import AdminClientsPage from './AdminClientsPage'
import { adminApi } from '@/lib/adminApi'

describe('AdminClientsPage', () => {
  it('loads and renders clients from adminApi', async () => {
    render(<AdminClientsPage />)
    await waitFor(() => expect(screen.getByText('Ada Lovelace')).toBeInTheDocument())
    // email appears twice: in the name-column sub-line and the dedicated email column
    expect(screen.getAllByText('ada@x.com').length).toBeGreaterThanOrEqual(1)
    expect(adminApi.listClients).toHaveBeenCalled()
  })
})
