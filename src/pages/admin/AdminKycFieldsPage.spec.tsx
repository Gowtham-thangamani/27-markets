import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

// vi.mock is hoisted — keep data inside the factory.
vi.mock('@/lib/adminApi', () => ({
  adminApi: {
    listKycFields: vi.fn().mockResolvedValue([
      { id: 'f1', kind: 'QUESTION', label: 'Source of funds', fieldType: 'SELECT', required: true, enabled: true, sortOrder: 0, createdAt: '', updatedAt: '' },
      { id: 'f2', kind: 'QUESTION', label: 'Expected deposit', fieldType: 'SELECT', required: false, enabled: false, sortOrder: 1, createdAt: '', updatedAt: '' },
    ]),
    createKycField: vi.fn(),
    updateKycField: vi.fn(),
    deleteKycField: vi.fn(),
  },
}))
vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}))

import AdminKycFieldsPage from './AdminKycFieldsPage'
import { adminApi } from '@/lib/adminApi'

describe('AdminKycFieldsPage', () => {
  it('loads by kind and lists fields with type/required/enabled', async () => {
    render(<AdminKycFieldsPage kind="QUESTION" title="KYC Questions" subtitle="x" />)
    await waitFor(() => expect(screen.getByText('Source of funds')).toBeInTheDocument())

    expect(adminApi.listKycFields).toHaveBeenCalledWith('QUESTION')
    expect(screen.getByText('Required')).toBeInTheDocument()
    expect(screen.getByText('Enabled')).toBeInTheDocument()
    expect(screen.getByText('Disabled')).toBeInTheDocument()
  })
})
