import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

vi.mock('@/lib/adminApi', () => ({
  adminApi: {
    listTeam: vi.fn().mockResolvedValue([
      { id: 'u1', firstName: 'Grace', lastName: 'Hopper', email: 'grace@x.com', role: 'ADMIN', status: 'ACTIVE', createdAt: '2026-01-01' },
    ]),
    getAuditLog: vi.fn().mockResolvedValue([
      { id: 'a1', action: 'staff.role', entity: 'User', entityId: 'u2', metadata: null, createdAt: '2026-06-23T10:00:00.000Z', user: { firstName: 'Ada', lastName: 'L', email: 'ada@x.com' } },
    ]),
    setStaffRole: vi.fn(),
  },
}))
vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}))

import AdminStaffPage from './AdminStaffPage'

describe('AdminStaffPage', () => {
  it('renders the team with a role selector and the audit log', async () => {
    render(<AdminStaffPage />)
    await waitFor(() => expect(screen.getByText('Grace Hopper')).toBeInTheDocument())
    expect(screen.getByLabelText('Role for grace@x.com')).toBeInTheDocument()
    expect(screen.getByText('staff.role')).toBeInTheDocument()
  })
})
