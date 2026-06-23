import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

// vi.mock is hoisted — keep data inside the factory.
vi.mock('@/lib/adminApi', () => ({
  adminApi: {
    listTickets: vi.fn().mockResolvedValue([
      {
        id: 't1', subject: 'Cannot withdraw', category: 'Funding', priority: 'HIGH', status: 'OPEN',
        updatedAt: '2026-06-23T10:00:00.000Z',
        user: { firstName: 'Ada', lastName: 'Lovelace', email: 'ada@x.com' },
        assignedTo: null, _count: { messages: 2 },
      },
    ]),
    getStaff: vi.fn().mockResolvedValue([]),
    getTicket: vi.fn(),
    updateTicket: vi.fn(),
    replyTicket: vi.fn(),
  },
}))
vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}))

import AdminSupportPage from './AdminSupportPage'
import { adminApi } from '@/lib/adminApi'

describe('AdminSupportPage', () => {
  it('loads the ticket inbox and renders subject + client', async () => {
    render(<AdminSupportPage />)
    await waitFor(() => expect(screen.getByText('Cannot withdraw')).toBeInTheDocument())
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(adminApi.listTickets).toHaveBeenCalled()
    expect(adminApi.getStaff).toHaveBeenCalled()
  })
})
