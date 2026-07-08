import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

vi.mock('@/lib/adminApi', () => ({
  adminApi: {
    listConsents: vi.fn().mockResolvedValue([
      { id: 'c1', label: 'Terms & Conditions', body: 'Agree to terms', required: true, enabled: true, sortOrder: 0, createdAt: '', updatedAt: '' },
      { id: 'c2', label: 'Marketing', body: 'Emails', required: false, enabled: false, sortOrder: 1, createdAt: '', updatedAt: '' },
    ]),
    createConsent: vi.fn(), updateConsent: vi.fn(), deleteConsent: vi.fn(),
  },
}))
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }) }))

import AdminConsentsPage from './AdminConsentsPage'

describe('AdminConsentsPage', () => {
  it('lists consents with required + enabled state', async () => {
    render(<AdminConsentsPage />)
    await waitFor(() => expect(screen.getByText('Terms & Conditions')).toBeInTheDocument())
    expect(screen.getByText('Marketing')).toBeInTheDocument()
    expect(screen.getByText('Required')).toBeInTheDocument()
    expect(screen.getByText('Enabled')).toBeInTheDocument()
    expect(screen.getByText('Disabled')).toBeInTheDocument()
  })
})
