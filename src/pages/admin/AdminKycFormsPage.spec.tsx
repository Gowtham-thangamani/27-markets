import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

vi.mock('@/lib/adminApi', () => ({
  adminApi: {
    listKycForms: vi.fn().mockResolvedValue([
      { id: 'f1', name: 'Individual Onboarding', description: 'Retail', enabled: true, sortOrder: 0, createdAt: '', updatedAt: '' },
      { id: 'f2', name: 'Corporate Onboarding', description: null, enabled: false, sortOrder: 1, createdAt: '', updatedAt: '' },
    ]),
    createKycForm: vi.fn(), updateKycForm: vi.fn(), deleteKycForm: vi.fn(),
  },
}))
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }) }))

import AdminKycFormsPage from './AdminKycFormsPage'

describe('AdminKycFormsPage', () => {
  it('lists KYC forms with enabled state', async () => {
    render(<AdminKycFormsPage />)
    await waitFor(() => expect(screen.getByText('Individual Onboarding')).toBeInTheDocument())
    expect(screen.getByText('Corporate Onboarding')).toBeInTheDocument()
    expect(screen.getByText('Enabled')).toBeInTheDocument()
    expect(screen.getByText('Disabled')).toBeInTheDocument()
  })
})
