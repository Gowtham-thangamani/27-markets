import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

// NOTE: vi.mock is hoisted — keep all data inside the factory (no outer refs).
vi.mock('@/lib/adminApi', () => ({
  adminApi: {
    listLeads: vi.fn().mockResolvedValue([
      {
        id: 'l1',
        name: 'Jane Smith',
        email: 'jane@x.com',
        phone: '+1 555 0100',
        country: 'US',
        source: 'DEMO',
        status: 'NEW',
        assignedToId: null,
        assignedTo: null,
        createdAt: '2026-01-15T00:00:00.000Z',
        _count: { notes: 0 },
      },
    ]),
    getStaff: vi.fn().mockResolvedValue([]),
    getLead: vi.fn(),
    updateLead: vi.fn(),
    addLeadNote: vi.fn(),
  },
}))
vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}))

import AdminLeadsPage from './AdminLeadsPage'
import { adminApi } from '@/lib/adminApi'

describe('AdminLeadsPage', () => {
  it('loads and renders leads from adminApi', async () => {
    render(<AdminLeadsPage />)
    await waitFor(() => expect(screen.getByText('Jane Smith')).toBeInTheDocument())
    // email appears twice: in the name-column sub-line and the dedicated Email column
    expect(screen.getAllByText('jane@x.com').length).toBeGreaterThanOrEqual(1)
    // 'Demo' appears in the Source cell and the select filter option
    expect(screen.getAllByText('Demo').length).toBeGreaterThanOrEqual(1)
    expect(adminApi.listLeads).toHaveBeenCalled()
    expect(adminApi.getStaff).toHaveBeenCalled()
  })
})
