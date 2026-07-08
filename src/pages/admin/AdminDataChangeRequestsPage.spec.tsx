import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

vi.mock('@/lib/adminApi', () => ({
  adminApi: {
    listDataChangeRequests: vi.fn().mockResolvedValue([
      { id: 'r1', field: 'phone', currentValue: '+971 50 000 0000', requestedValue: '+971 55 123 4567', status: 'PENDING', createdAt: '2026-07-01T00:00:00.000Z', reviewedAt: null, client: { id: 'c1', name: 'Jordan Avery', email: 'client@x.com' } },
    ]),
    approveDataChangeRequest: vi.fn(),
    rejectDataChangeRequest: vi.fn(),
  },
}))
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }) }))

import AdminDataChangeRequestsPage from './AdminDataChangeRequestsPage'
import { adminApi } from '@/lib/adminApi'

describe('AdminDataChangeRequestsPage', () => {
  it('lists pending requests with approve/reject and current->requested values', async () => {
    render(<AdminDataChangeRequestsPage />)
    await waitFor(() => expect(screen.getByText(/Jordan Avery/)).toBeInTheDocument())
    expect(screen.getByText('+971 55 123 4567')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Approve/ }).length).toBeGreaterThan(0)
  })

  it('defaults to the Pending filter', async () => {
    render(<AdminDataChangeRequestsPage />)
    await waitFor(() => expect(adminApi.listDataChangeRequests).toHaveBeenCalledWith('PENDING'))
  })
})
