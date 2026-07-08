import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

vi.mock('@/lib/adminApi', () => ({
  adminApi: {
    listStaffFormAssignments: vi.fn().mockResolvedValue([
      { id: 'a1', kycFormId: 'f1', formName: 'Individual Onboarding', staffId: 's1', staffName: 'Riley Mensah', staffRole: 'AGENT', createdAt: '' },
    ]),
    listKycForms: vi.fn().mockResolvedValue([{ id: 'f1', name: 'Individual Onboarding', description: null, enabled: true, sortOrder: 0, createdAt: '', updatedAt: '' }]),
    getStaff: vi.fn().mockResolvedValue([{ id: 's1', firstName: 'Riley', lastName: 'Mensah', role: 'AGENT' }]),
    createStaffFormAssignment: vi.fn(),
    deleteStaffFormAssignment: vi.fn(),
  },
}))
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }) }))

import AdminStaffFormAssignmentsPage from './AdminStaffFormAssignmentsPage'

describe('AdminStaffFormAssignmentsPage', () => {
  it('lists form -> staff assignments', async () => {
    render(<AdminStaffFormAssignmentsPage />)
    await waitFor(() => expect(screen.getAllByText('Individual Onboarding').length).toBeGreaterThan(0))
    expect(screen.getByText('Riley Mensah')).toBeInTheDocument()
  })
})
